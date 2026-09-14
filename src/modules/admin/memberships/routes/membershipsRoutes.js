const express = require('express');
const router = express.Router();
const membershipsController = require('../controllers/membershipsController');
const { authenticate, permission } = require('../../../../middlewares');

const config = { moduleName: 'Memberships', type: 'group-access' };

router.get('/', authenticate, permission(config, 'READ'), membershipsController.getAll);
router.patch('/:id/status', authenticate, permission(config, 'WRITE'), membershipsController.updateStatus);
router.get('/:userId', authenticate, permission(config, 'READ'), membershipsController.getById);

module.exports = router;
