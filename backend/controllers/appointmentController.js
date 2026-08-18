const Appointment = require('../models/Appointment');
const Message = require('../models/Message');
const emailService = require('../services/emailService');
/**
 *
 * יצירת תור חדש
 * POST /api/appointments
 */
exports.createAppointment = async (req, res) => {
  try {
    const { customerName, customerPhone, service, date, time } = req.body;

    if (!customerName || !customerPhone || !service || !date || !time) {
      return res.status(400).json({
        success: false,
        error: "כל השדות הם חובה"
      });
    }

    const serviceDoc = await Service.findOne({ name: service });
    if (!serviceDoc) {
      return res.status(400).json({
        success: false,
        error: "השירות המבוקש לא נמצא"
      });
    }

    const phoneRegex = /^05\d{8}$/;
    if (!phoneRegex.test(customerPhone)) {
      return res.status(400).json({
        success: false,
        error: "מספר טלפון לא תקין (05XXXXXXXX)"
      });
    }

    // ✅ יצירת תאריך כולל שעה
    const appointmentDateTime = new Date(`${date}T${time}:00`);

    const now = new Date();
    if (appointmentDateTime < now) {
      return res.status(400).json({
        success: false,
        error: "לא ניתן לקבוע תור לזמן שעבר"
      });
    }

    // בדיקת כפילות
    const existingAppointment = await Appointment.findOne({
      date: appointmentDateTime,
      status: { $ne: "cancelled" }
    });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        error: "שעה זו תפוסה, אנא בחר שעה אחרת"
      });
    }

    // ✅ שמירה עם שעה אמיתית
    const appointment = await Appointment.create({
      customerName,
      customerPhone,
      service,
      duration: serviceDoc.duration || 30,
      date: appointmentDateTime,
      time,
      status: "confirmed",
      upcomingEmailSent: false
    });

    // 🚀 הצעד המכריע: מחזירים תשובה מיידית לחלוטין ללקוח בפרלי שניות!
    res.status(201).json({
      success: true,
      message: "התור נקבע בהצלחה!"
    });

    // 🔄 כל השירותים האיטיים רצים עכשיו ברקע בנפרד, מבלי לתקוע את ה-Response
    (async () => {
      try {
        // ✅ מייל לבעל העסק (ברקע)
        if (emailService && typeof emailService.sendNewAppointmentEmail === 'function') {
          await emailService.sendNewAppointmentEmail(appointment);
        }
      } catch (mailErr) {
        console.error("שגיאה שליחת מייל ברקע:", mailErr.message);
      }
    })();

  } catch (error) {
    console.error("שגיאה ביצירת תור:", error);
    // הגנה למקרה שהשגיאה קרתה לפני שליחת ה-res
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "שגיאת שרת פנימית"
      });
    }
  }
};

/**
 * קבלת כל התורים
 * GET /api/appointments
 */
const Service = require("../models/Service");

/**
 * קבלת תור לפי ID
 * GET /api/appointments/:id
 */
exports.getAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'התור לא נמצא'
      });
    }
    res.json({
      success: true,
      data: appointment
    });

  } catch (error) {
    console.error('שגיאה בקבלת תור:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בטעינת התור'
    });
  }
};

/**
 * עדכון סטטוס תור
 * PUT /api/appointments/:id
 */
exports.updateAppointment = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status, notes },
      { new: true, runValidators: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'התור לא נמצא'
      });
    }

    // שליחת מייל בעת ביטול
    if (status === 'cancelled') {
      await emailService.sendCancellationEmail(appointment, notes);
    }

    res.json({
      success: true,
      data: appointment
    });

  } catch (error) {
    console.error('שגיאה בעדכון תור:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה בעדכון התור'
    });
  }
};

/**
 * מחיקת תור
 * DELETE /api/appointments/:id
 */
exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'התור לא נמצא'
      });
    }
    await Message.deleteMany({ appointment: appointment._id });

    res.json({
      success: true,
      message: 'התור נמחק בהצלחה'
    });

  } catch (error) {
    console.error('שגיאה במחיקת תור:', error);
    res.status(500).json({
      success: false,
      error: 'שגיאה במחיקת התור'
    });
  }
};

exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ date: 1 });
    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "שגיאה בטעינת התורים"
    });
  }
};
