const express = require('express');
const bookingsController = require('../controllers/bookingsController');
const { validate, authenticate } = require('../../../../middlewares');
const bookingsValidator = require('../validators/bookingsValidator');

const router = express.Router();

router.get('/', authenticate, bookingsController.getAll.bind(bookingsController));
router.get('/event/:eventId', authenticate, bookingsController.getByEventId.bind(bookingsController));
router.get('/:id', authenticate, bookingsController.getById.bind(bookingsController));
router.post('/', authenticate, validate(bookingsValidator.createBooking), bookingsController.create.bind(bookingsController));
router.put('/:id', authenticate, validate(bookingsValidator.updateBooking), bookingsController.update.bind(bookingsController));
router.post('/:id/resend-invoice', authenticate, bookingsController.resendInvoice.bind(bookingsController));
router.delete('/:id', authenticate, bookingsController.delete.bind(bookingsController));

module.exports = router;
