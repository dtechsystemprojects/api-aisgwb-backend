const express = require('express');
const router = express.Router();
const userController = require('../controllers/usersController');
const { authenticate, permission } = require('../../../../middlewares');

const userConfig = { moduleName: 'Users', type: 'group-access' };

router.get('/', authenticate, permission(userConfig, 'READ'), userController.getAll.bind(userController));
router.get('/:id', authenticate, permission(userConfig, 'READ'), userController.getById.bind(userController));
router.post('/', authenticate, permission(userConfig, 'WRITE'), userController.create.bind(userController));
router.put('/:id', authenticate, permission(userConfig, 'WRITE'), userController.update.bind(userController));
router.put('/:id/status', authenticate, permission(userConfig, 'WRITE'), userController.status.bind(userController));
router.delete('/:id', authenticate, permission(userConfig, 'DELETE'), userController.delete.bind(userController));

module.exports = router;
