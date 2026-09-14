const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

router.post('/create-order', checkoutController.createOrder.bind(checkoutController));
router.post('/verify-payment', checkoutController.verifyPayment.bind(checkoutController));
router.post('/upload-invoice/:id', checkoutController.uploadInvoice.bind(checkoutController));

module.exports = router;

