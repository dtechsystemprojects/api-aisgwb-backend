const express = require('express');
const ticketsController = require('../controllers/ticketsController');
const { validate, authenticate } = require('../../../../middlewares');
const ticketsValidator = require('../validators/ticketsValidator');

const router = express.Router(); 

router.get('/event/:eventId', authenticate, ticketsController.getByEventId.bind(ticketsController));
router.get('/groups', authenticate, ticketsController.getTicketGroups.bind(ticketsController));
router.post('/', authenticate, validate(ticketsValidator.createTicket), ticketsController.create.bind(ticketsController));
router.put('/:ticketId', authenticate, validate(ticketsValidator.updateTicket), ticketsController.update.bind(ticketsController));
router.delete('/:ticketId', authenticate, ticketsController.delete.bind(ticketsController));

module.exports = router;
