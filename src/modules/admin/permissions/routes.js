const express = require('express');
const router = express.Router();
const PermissionController = require('./controllers/PermissionController');
const { authenticate, permission } = require('../../../middlewares');
const validate = require('../../../middlewares/validator');
const permissionValidator = require('./validators/permissionValidator');

const permissionsConfig = { moduleName: 'Permissions', type: 'group-access' };

router.get('/', authenticate, permission(permissionsConfig, 'READ'), PermissionController.getAll);
router.post('/', authenticate, permission(permissionsConfig, 'WRITE'), validate(permissionValidator.createPermission), PermissionController.create);
router.put('/:id', authenticate, permission(permissionsConfig, 'WRITE'), validate(permissionValidator.updatePermission), PermissionController.update);
router.delete('/:id', authenticate, permission(permissionsConfig, 'DELETE'), PermissionController.delete);

module.exports = router;
