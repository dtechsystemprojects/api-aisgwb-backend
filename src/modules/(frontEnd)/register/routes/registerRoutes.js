const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController');

// Frontend Registration Route
router.post('/', registerController.register.bind(registerController));
router.post('/send-otp', registerController.sendOtp.bind(registerController));
router.get('/getGroups', registerController.getGroups.bind(registerController));

module.exports = router;
