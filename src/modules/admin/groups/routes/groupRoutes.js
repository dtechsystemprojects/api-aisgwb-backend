const express = require('express');
const groupController = require('../controllers/groupController');
const { validate, authenticate, permission } = require('../../../../middlewares');
const groupValidator = require('../validators/groupValidator');

const router = express.Router();

const groupConfig = { moduleName: 'Groups', type: 'group-access' };

router.get('/', authenticate, permission(groupConfig, 'READ'), groupController.getAll.bind(groupController));
router.get('/:id', authenticate, permission(groupConfig, 'READ'), groupController.getById.bind(groupController));
router.post('/', authenticate, permission(groupConfig, 'WRITE'), validate(groupValidator.createGroup), groupController.create.bind(groupController));
router.put('/:id', authenticate, permission(groupConfig, 'WRITE'), validate(groupValidator.updateGroup), groupController.update.bind(groupController));
router.delete('/:id', authenticate, permission(groupConfig, 'DELETE'), groupController.delete.bind(groupController));

module.exports = router;
