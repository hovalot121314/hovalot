const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// התחברות בעל העסק
router.post('/login', adminController.login);

module.exports = router;