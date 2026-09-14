const express = require('express');
const activitiesController = require('../controllers/activitiesController');
const { validate, authenticate, permission } = require('../../../../middlewares');
const activitiesValidator = require('../validators/activitiesValidator');

const router = express.Router();

const activitiesConfig = { moduleName: 'Activities', type: 'group-access', category: 'Admin' };

router.get('/', authenticate, permission(activitiesConfig, 'READ'), activitiesController.getAll.bind(activitiesController));
router.get('/:id', authenticate, permission(activitiesConfig, 'READ'), activitiesController.getById.bind(activitiesController));
router.post('/', authenticate, permission(activitiesConfig, 'WRITE'), validate(activitiesValidator.createActivities), activitiesController.create.bind(activitiesController));
router.put('/:id', authenticate, permission(activitiesConfig, 'WRITE'), validate(activitiesValidator.updateActivities), activitiesController.update.bind(activitiesController));
router.delete('/:id', authenticate, permission(activitiesConfig, 'DELETE'), activitiesController.delete.bind(activitiesController));

module.exports = router;
