const express = require('express');
const router = express.Router();

const groupRoutes = require('./routes/groupRoutes');
const groupAccessRoutes = require('./routes/groupAccessRoutes');

router.use('/', groupRoutes);
router.use('/', groupAccessRoutes);

module.exports = {
  routes: router,
};
