const express = require('express');
const router = express.Router();
const eventsRoutes = require('./routes/eventsRoutes');
router.use('/', eventsRoutes);
module.exports = {
  routes: router,
};
