
const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookingsController');
const { tokenAuth } = require('../../../../middlewares');

router.get('/my-bookings', tokenAuth, bookingsController.getMyBookings.bind(bookingsController));
router.get('/:bookingId/ticket/:attendeeId/pdf', tokenAuth, bookingsController.downloadTicketPdf.bind(bookingsController));

module.exports = router;
