const express = require("express");
const router = express.Router();

const {
  getAllAppointments,
  getAppointment,
  deleteAppointment
} = require("../controllers/appointmentController");

const {
  createAppointment
} = require("../controllers/bookingController");

const {
  getAvailableSlots
} = require("../controllers/availabilityController");

const {
  updateAppointment
} = require("../controllers/appointmentEditController");
const { protect } = require('../middleware/authMiddleware');

router.post("/", protect, createAppointment);
router.get("/available/:date", getAvailableSlots);

router.get("/", protect, getAllAppointments);
router.get("/:id", protect, getAppointment);
router.put("/:id", protect, updateAppointment);
router.delete("/:id", protect, deleteAppointment);

module.exports = router;
