const Joi = require('joi');

module.exports = {
  register: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    mobile: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .optional(),
    password: Joi.string().min(6).required(),
  }),

  login: Joi.object({
    username: Joi.string()
      .required()
      .custom((value, helpers) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const mobileRegex = /^[0-9]{10,15}$/;

        if (!emailRegex.test(value) && !mobileRegex.test(value)) {
          return helpers.error('any.invalid');
        }

        return value;
      })
      .messages({
        'any.required': 'Email or mobile number is required',
        'any.invalid': 'Login must be a valid email or mobile number',
      }),

    password: Joi.string().required().messages({
      'any.required': 'Password is required',
      'string.empty': 'Password is required',
    }),
  }),
};
