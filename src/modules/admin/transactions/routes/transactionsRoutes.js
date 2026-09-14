const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactionsController');
const { authenticate } = require('../../../../middlewares');

router.get('/', authenticate, transactionsController.getTransactions.bind(transactionsController));

module.exports = router;
