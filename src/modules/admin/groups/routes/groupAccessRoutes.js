const express = require('express');
const router = express.Router();
const GroupAccessController = require('../controllers/GroupAccessController');
const { authenticate, permission } = require('../../../../middlewares');

const groupAccessConfig = { moduleName: 'Groups', type: 'group-access' };

router.get('/:groupId/access-rules', authenticate, permission(groupAccessConfig, 'READ'), GroupAccessController.getAll);
router.post('/:groupId/access-rules/bulk', authenticate, permission(groupAccessConfig, 'WRITE'), GroupAccessController.bulkSave);
router.post('/:groupId/access-rules', authenticate, permission(groupAccessConfig, 'WRITE'), GroupAccessController.create);
router.put('/:groupId/access-rules/:ruleId', authenticate, permission(groupAccessConfig, 'WRITE'), GroupAccessController.update);
router.delete('/:groupId/access-rules/:ruleId', authenticate, permission(groupAccessConfig, 'DELETE'), GroupAccessController.delete);

module.exports = router;
