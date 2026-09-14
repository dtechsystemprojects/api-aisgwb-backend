const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');
const { tokenAuth } = require('../../../../middlewares');

router.get('/', eventsController.getEvents.bind(eventsController));
router.get('/attendees', tokenAuth, eventsController.getAttendees.bind(eventsController));
router.get('/tickets/:eventId', tokenAuth, eventsController.getEventTickets.bind(eventsController));
router.get('/:id', tokenAuth, eventsController.getEventDetails.bind(eventsController));

module.exports = router;
