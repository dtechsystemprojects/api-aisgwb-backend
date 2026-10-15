const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');

// Public endpoints - no tokenAuth required so event details and tickets can be viewed by anyone
router.get('/', eventsController.getEvents.bind(eventsController));
router.get('/attendees', eventsController.getAttendees.bind(eventsController));
router.get('/tickets/:eventId', eventsController.getEventTickets.bind(eventsController));
router.get('/:id', eventsController.getEventDetails.bind(eventsController));

module.exports = router;
