const Joi = require('joi');

module.exports = {
  email: Joi.string().email().required(),

  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$'))
    .required()
    .messages({
      'string.pattern.base':
        'Password must contain at least 1 uppercase, 1 lowercase, and 1 number',
    }),

  name: Joi.string().min(3).max(100).required(),

  phone: Joi.string()
    .pattern(/^[0-9+\-()\\s]+$/)
    .required(),

  description: Joi.string().min(10).max(500),

  price: Joi.number().min(0).required(),

  quantity: Joi.number().integer().min(0).required(),
};