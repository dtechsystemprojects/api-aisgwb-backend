const Joi = require('joi');

module.exports = {
  createPermission: Joi.object({
    id: Joi.string().allow('').optional(),
    _id: Joi.any().optional(),
    name: Joi.string().trim().min(2).max(100).required().messages({
      'string.empty': 'Module / Resource Name is required and cannot be just spaces',
      'any.required': 'Module / Resource Name is required',
      'string.min': 'Module / Resource Name must be at least 2 characters long'
    }),
    category: Joi.string().optional(),
    roles: Joi.array().optional(),
    date: Joi.string().optional(),
    time: Joi.string().optional(),
    url: Joi.string().allow('').optional(),
    icon: Joi.string().allow('').optional(),
    users: Joi.number().optional()
  }),

  updatePermission: Joi.object({
    id: Joi.string().allow('').optional(),
    _id: Joi.any().optional(),
    name: Joi.string().trim().min(2).max(100).required().messages({
      //'string.empty': 'Module / Resource Name is required and cannot be just spaces',
      'any.required': 'Module / Resource Name is required',
      'string.min': 'Module / Resource Name must be at least 2 characters long'
    }),
    category: Joi.string().optional(),
    roles: Joi.array().optional(),
    date: Joi.string().optional(),
    time: Joi.string().optional(),
    url: Joi.string().allow('').optional(),
    icon: Joi.string().allow('').optional(),
    users: Joi.number().optional()
  })
};
