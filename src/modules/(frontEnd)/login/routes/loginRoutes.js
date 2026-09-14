const { tokenAuth } = require('../../../../middlewares');
const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

// Frontend Login Routes
router.post('/send-otp', loginController.sendOtp.bind(loginController));
router.post('/verify-otp', loginController.verifyOtp.bind(loginController));
router.get('/profile', tokenAuth, loginController.getProfile.bind(loginController));
router.put('/profile', tokenAuth, loginController.updateProfile.bind(loginController));

module.exports = router;
