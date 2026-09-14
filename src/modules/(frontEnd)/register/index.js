const express = require('express');
const router = express.Router();
const registerRoutes = require('./routes/registerRoutes');
router.use('/', registerRoutes);
module.exports = {
  routes: router,
};
