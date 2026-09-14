const express = require('express');
const router = express.Router();
const membershipsController = require('../controllers/membershipsController');
const { tokenAuth } = require('../../../../middlewares');

router.get('/settings', membershipsController.getSettings);
router.post('/apply', tokenAuth, membershipsController.applyMembership);
router.get('/', tokenAuth, membershipsController.getAllMemberships);
router.get('/membership/:userId', tokenAuth, membershipsController.getById);

module.exports = router;
