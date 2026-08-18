const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const Admin = require('../models/Admin');
const pushService = require('./pushService');
const { getAppointmentInstant, formatJerusalemDate } = require('../utils/timeZone');

class CronService {
  start() {
    if (this.task) return;
    console.log('⏰ Owner PWA reminder cron started (every minute, Asia/Jerusalem)');
    this.task = cron.schedule('* * * * *', () => this.checkReminders(), { timezone: 'Asia/Jerusalem' });
    this.checkReminders();
  }

  stop() {
    if (this.task) this.task.stop();
    this.task = null;
  }

  async checkReminders() {
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      const appointments = await Appointment.find({
        status: 'confirmed',
        ownerReminderSent: { $ne: true },
        date: { $gte: now, $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) }
      }).sort({ date: 1 });
      if (!appointments.length) return;
      const admins = await Admin.find({ role: 'owner' }).select('_id');
      for (const appointment of appointments) {
        const instant = getAppointmentInstant(appointment);
        if (Number.isNaN(instant.getTime()) || instant < now) continue;
        let sent = 0;
        for (const admin of admins) {
          const result = await pushService.sendToAdmin(admin._id, {
            title: 'תזכורת להובלה מחר',
            body: `${appointment.customerName} — ${formatJerusalemDate(instant)} ${appointment.timeType === 'range' && appointment.endTime ? `בין ${appointment.time} ל-${appointment.endTime}` : `בשעה ${appointment.time}`}, מ-${appointment.pickupAddress} אל ${appointment.destinationAddress}`,
            url: './dashboard.html',
            tag: `owner-moving-reminder-${appointment._id}`,
            appointmentId: appointment._id
          });
          sent += result.sent;
        }
        appointment.ownerReminderScheduledFor = new Date(instant.getTime() - 24 * 60 * 60 * 1000);
        if (sent > 0) appointment.ownerReminderSent = true;
        await appointment.save();
      }
    } catch (error) {
      console.error('Owner reminder cron failed:', error.message);
    } finally {
      this.running = false;
    }
  }
}

module.exports = new CronService();
