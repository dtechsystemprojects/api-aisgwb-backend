const express = require('express');
const eventsController = require('../controllers/eventsController');
const { validate, authenticate } = require('../../../../middlewares');
const eventsValidator = require('../validators/eventsValidator');

const router = express.Router();

router.get('/', authenticate, eventsController.getAll.bind(eventsController));
router.get('/:id', authenticate, eventsController.getById.bind(eventsController));
router.post('/', authenticate, validate(eventsValidator.createEvents), eventsController.create.bind(eventsController));
router.put('/:id', authenticate, validate(eventsValidator.updateEvents), eventsController.update.bind(eventsController));
router.patch('/status/:id', authenticate, eventsController.status.bind(eventsController));
router.delete('/:id', authenticate, eventsController.delete.bind(eventsController));

module.exports = router;
