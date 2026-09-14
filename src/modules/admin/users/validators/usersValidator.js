const Joi = require('joi');

module.exports = {
  createUsers: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  updateUsers: Joi.object({
    name: Joi.string().min(3).max(100).optional(),
    email: Joi.string().email().optional(),
    isActive: Joi.boolean().optional(),
  }),
};
