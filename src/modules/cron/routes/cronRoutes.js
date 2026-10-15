const express = require('express');
const router = express.Router();
const cronController = require('../controllers/cronController');

// GET and POST /api/cron/process-bookings (for Hostinger Cron Job)
router.get('/process-bookings', cronController.processBookings.bind(cronController));
router.post('/process-bookings', cronController.processBookings.bind(cronController));

// GET /api/cron/status
router.get('/status', cronController.getStatus.bind(cronController));

module.exports = router;
