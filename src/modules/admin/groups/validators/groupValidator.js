const Joi = require('joi');

module.exports = {
  createGroup: Joi.object({
    id: Joi.string().allow('').optional(),
    name: Joi.string().trim().min(2).max(100).required().messages({
      'string.empty': 'Group Name is required and cannot be just spaces',
      'any.required': 'Group Name is required',
      'string.min': 'Group Name must be at least 2 characters long'
    }),
    description: Joi.string().allow('').max(500).optional(),
    badgeVariant: Joi.string().valid('primary', 'success', 'info', 'warning', 'danger', 'secondary').optional(),
    memberCount: Joi.number().min(0).optional(),
    status: Joi.string().valid('Active', 'Inactive').optional(),
    permissionsCount: Joi.number().min(0).optional(),
    createdDate: Joi.string().optional(),
    permissions: Joi.array().optional()
  }),

  updateGroup: Joi.object({
    id: Joi.string().allow('').optional(),
    name: Joi.string().trim().min(2).max(100).required().messages({
      //'string.empty': 'Group Name is required and cannot be just spaces',
      'any.required': 'Group Name is required',
      'string.min': 'Group Name must be at least 2 characters long'
    }),
    description: Joi.string().allow('').max(500).optional(),
    badgeVariant: Joi.string().valid('primary', 'success', 'info', 'warning', 'danger', 'secondary').optional(),
    memberCount: Joi.number().min(0).optional(),
    status: Joi.string().valid('Active', 'Inactive').optional(),
    permissionsCount: Joi.number().min(0).optional(),
    createdDate: Joi.string().optional(),
    permissions: Joi.array().optional()
  }),
};
