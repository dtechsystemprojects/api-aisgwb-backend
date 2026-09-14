const express = require('express');
const settingsController = require('../controllers/settingsController');
const { authenticate, permission } = require('../../../../middlewares');
const upload = require('../../../../middlewares/upload');

const router = express.Router();

const settingsConfig = { moduleName: 'Settings', type: 'group-access'};

router.post('/upload', authenticate, upload.single('file'), settingsController.uploadFile.bind(settingsController));
router.get('/', settingsController.getAll.bind(settingsController));
router.get('/:id', authenticate, settingsController.getById.bind(settingsController));
router.post('/', authenticate, permission(settingsConfig, 'WRITE'), settingsController.create.bind(settingsController));
router.post('/bulk-save', authenticate, permission(settingsConfig, 'WRITE'), settingsController.saveAll.bind(settingsController));
router.put('/:id', authenticate, permission(settingsConfig, 'WRITE'), settingsController.update.bind(settingsController));
router.patch('/:id', authenticate, permission(settingsConfig, 'WRITE'), settingsController.update.bind(settingsController));
router.delete('/:id', authenticate, permission(settingsConfig, 'DELETE'), settingsController.delete.bind(settingsController));

module.exports = router;
