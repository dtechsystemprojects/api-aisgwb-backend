
const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactionsController');
const { tokenAuth } = require('../../../../middlewares');

router.get('/my-transactions', tokenAuth, transactionsController.getMyTransactions.bind(transactionsController));
router.get('/transactionExport', tokenAuth, transactionsController.exportMyTransactions.bind(transactionsController));

module.exports = router;
