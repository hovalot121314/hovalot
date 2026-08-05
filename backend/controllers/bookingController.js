const jwt = require('jsonwebtoken');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const BusinessSettings = require('../models/BusinessSettings');
const {
  jerusalemDateTimeToUtc,
  getAppointmentInstant
} = require('../utils/timeZone');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

function getDayKey(dateString) {
  const dayMap = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];

  const calendarDate = new Date(`${dateString}T12:00:00Z`);
  return dayMap[calendarDate.getUTCDay()];
}

function isAuthenticatedAdmin(req) {
  try {
    const authorization = String(req.headers.authorization || '');
    if (!authorization.startsWith('Bearer ')) return false;

    const token = authorization.slice(7).trim();
    if (!token) return false;

    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

exports.createAppointment = async (req, res) => {
  try {
    const { customerName, customerPhone, pickupAddress, destinationAddress, service, date, time } = req.body;

    if (!customerName || !customerPhone || !pickupAddress || !destinationAddress || !service || !date || !time) {
      return res.status(400).json({
        success: false,
        error: 'כל השדות הם חובה'
      });
    }

    const createdByAdmin = isAuthenticatedAdmin(req);
    if (!createdByAdmin) {
      return res.status(403).json({ success: false, error: 'קביעת הובלה זמינה לבעל העסק בלבד' });
    }

    const serviceDoc = await Service.findOne({ name: service });
    if (!serviceDoc) {
      return res.status(400).json({
        success: false,
        error: 'השירות המבוקש לא נמצא'
      });
    }

    if (!/^05\d{8}$/.test(customerPhone)) {
      return res.status(400).json({
        success: false,
        error: 'מספר טלפון לא תקין (05XXXXXXXX)'
      });
    }

    const appointmentDateTime = jerusalemDateTimeToUtc(date, time);

    if (Number.isNaN(appointmentDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'תאריך או שעה לא תקינים'
      });
    }

    if (appointmentDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'לא ניתן לקבוע תור לזמן שעבר'
      });
    }

    const duration = Number(serviceDoc.duration) || 30;
    const requestedEnd = new Date(appointmentDateTime.getTime() + duration * 60000);

    const settings = await BusinessSettings.findOne();
    const dateOverride = (settings?.dateOverrides || []).find((item) => item.date === date);
    const daySettings = dateOverride || settings?.workingHours?.[getDayKey(date)];

    if (!daySettings || !daySettings.enabled) {
      return res.status(400).json({
        success: false,
        error: 'העסק סגור ביום שנבחר'
      });
    }

    const workStart = jerusalemDateTimeToUtc(date, daySettings.start);
    const workEnd = jerusalemDateTimeToUtc(date, daySettings.end);

    if (appointmentDateTime < workStart || requestedEnd > workEnd) {
      return res.status(400).json({
        success: false,
        error: 'התור חייב להתחיל ולהסתיים בתוך שעות הפעילות'
      });
    }

    const breakConflict = (daySettings.breaks || []).some((breakItem) => {
      const breakStart = jerusalemDateTimeToUtc(date, breakItem.start);
      const breakEnd = jerusalemDateTimeToUtc(date, breakItem.end);
      return appointmentDateTime < breakEnd && requestedEnd > breakStart;
    });

    if (breakConflict) {
      return res.status(409).json({
        success: false,
        error: 'השעה שנבחרה נמצאת בזמן הפסקה'
      });
    }

    const dayStart = jerusalemDateTimeToUtc(date, '00:00');
    const dayEnd = jerusalemDateTimeToUtc(date, '23:59');
    dayEnd.setSeconds(59, 999);

    const existingAppointments = await Appointment.find({
      date: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: 'cancelled' }
    });

    const hasConflict = existingAppointments.some((existing) => {
      const existingStart = getAppointmentInstant(existing);
      const existingEnd = new Date(
        existingStart.getTime() + (Number(existing.duration) || 30) * 60000
      );

      return appointmentDateTime < existingEnd && requestedEnd > existingStart;
    });

    if (hasConflict) {
      return res.status(409).json({
        success: false,
        error: 'השעה שנבחרה אינה פנויה'
      });
    }

    const now = new Date();

    const appointment = await Appointment.create({
      customerName: String(customerName).trim(),
      customerPhone,
      pickupAddress: String(pickupAddress).trim(),
      destinationAddress: String(destinationAddress).trim(),
      service,
      duration,
      date: appointmentDateTime,
      time,
      status: 'confirmed',
      approvalRequestedAt: null,
      approvalDecisionAt: now,
      approvalDecision: 'approved',
      clientReminderSent: false,
      ownerReminderSent: false,
      upcomingEmailSent: false
    });

    res.status(201).json({
      success: true,
      message: 'ההובלה נקבעה בהצלחה!',
      data: appointment
    });
  } catch (error) {
    console.error('שגיאה ביצירת תור:', error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'שגיאת שרת פנימית'
      });
    }
  }
};
