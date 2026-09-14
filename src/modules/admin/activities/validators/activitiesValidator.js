const Joi = require('joi');

module.exports = {
  createActivities: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().allow('').max(500),
  }),

  updateActivities: Joi.object({
    name: Joi.string().min(3).max(100).optional(),
    description: Joi.string().allow('').max(500),
  }),
};
