const jwt = require('jsonwebtoken');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const {
  jerusalemDateTimeToUtc,
  getAppointmentInstant
} = require('../utils/timeZone');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

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
    const timeType = req.body.timeType === 'range' ? 'range' : 'exact';
    const endTime = timeType === 'range' ? String(req.body.endTime || '').trim() : '';

    if (!customerName || !customerPhone || !pickupAddress || !destinationAddress || !service || !date || !time) {
      return res.status(400).json({
        success: false,
        error: 'כל השדות הם חובה'
      });
    }

    if (timeType === 'range' && (!/^([0-1]?\d|2[0-3]):[0-5]\d$/.test(endTime) || endTime <= time)) {
      return res.status(400).json({ success: false, error: 'שעת הסיום חייבת להיות מאוחרת משעת ההתחלה' });
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
      timeType,
      endTime,
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
