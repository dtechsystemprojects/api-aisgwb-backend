const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactionsController');
const { authenticate } = require('../../../../middlewares');

router.get('/', authenticate, transactionsController.getTransactions.bind(transactionsController));

router.post('/bulk-delete', authenticate, transactionsController.bulkDeleteTransactions.bind(transactionsController));
router.delete('/:id', authenticate, transactionsController.deleteTransaction.bind(transactionsController));

module.exports = router;

