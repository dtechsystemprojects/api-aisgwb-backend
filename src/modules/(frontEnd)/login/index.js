const loginRoutes = require('./routes/loginRoutes');
const express = require('express');
const router = express.Router();
router.use('/', loginRoutes);
module.exports = {
  routes: router,
};
