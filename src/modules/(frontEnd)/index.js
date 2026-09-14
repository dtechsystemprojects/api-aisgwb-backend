const express = require('express');
const router = express.Router();

const registerModule = require('./register');
const loginModule = require('./login');
const eventsModule = require('./events');
const checkoutModule = require('./checkout');
const bookingsModule = require('./bookings');
const transactionsModule = require('./transactions');

// Mount frontend module routes
router.use('/register', registerModule.routes);
router.use('/login', loginModule.routes);
router.use('/events', eventsModule.routes);
router.use('/checkout', checkoutModule.routes);
router.use('/bookings', bookingsModule.routes);
router.use('/transactions', transactionsModule.routes);

module.exports = {
  routes: router,
};
