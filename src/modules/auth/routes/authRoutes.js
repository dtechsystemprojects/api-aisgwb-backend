const express = require('express');
const authController = require('../controllers/authController');
const { validate, authenticate } = require('../../../middlewares');
const authValidator = require('../validators/authValidator');

const router = express.Router();

router.post('/register', validate(authValidator.register), authController.register.bind(authController));
router.post('/login', validate(authValidator.login), authController.login.bind(authController));
router.get('/me', authenticate, authController.me.bind(authController));

module.exports = router;
