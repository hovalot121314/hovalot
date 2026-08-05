const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

// התחברות בעל העסק
router.post('/login', adminController.login);
router.get('/me', protect, adminController.me);

module.exports = router;
