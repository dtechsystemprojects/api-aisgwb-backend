const Joi = require('joi');

module.exports = {
  createEvents: Joi.object({
    title: Joi.string().min(3).max(200).required().messages({
      'string.empty': 'Title is required.',
      'string.min': 'Title must be at least 3 characters long.',
      'string.max': 'Title cannot exceed 200 characters.',
      'any.required': 'Title is required.',
    }),
    slug: Joi.string().min(3).max(200).required().messages({
      'string.empty': 'Slug is required.',
      'string.min': 'Slug must be at least 3 characters long.',
      'string.max': 'Slug cannot exceed 200 characters.',
      'any.required': 'Slug is required.',
    }),
    description: Joi.string().allow(''),
    startDate: Joi.date().required().messages({
      'date.base': 'Start Date must be a valid date.',
      'any.required': 'Start Date is required.',
    }),
    endDate: Joi.date().required().messages({
      'date.base': 'End Date must be a valid date.',
      'any.required': 'End Date is required.',
    }),
    startTime: Joi.string().required().messages({
      'string.empty': 'Start Time is required.',
      'any.required': 'Start Time is required.',
    }),
    endTime: Joi.string().required().messages({
      'string.empty': 'End Time is required.',
      'any.required': 'End Time is required.',
    }),
    timezone: Joi.string().allow(''),
    registrationOpen: Joi.date().required().messages({
      'date.base': 'Registration Open must be a valid date.',
      'any.required': 'Registration Open date is required.',
    }),
    registrationClose: Joi.date().required().messages({
      'date.base': 'Registration Close must be a valid date.',
      'any.required': 'Registration Close date is required.',
    }),
    eventType: Joi.string().valid('Offline', 'Online', 'Hybrid').required().messages({
      'any.only': 'Event Type must be Offline, Online, or Hybrid.',
      'string.empty': 'Event Type is required.',
      'any.required': 'Event Type is required.',
    }),
    venueLocation: Joi.string().allow(''),
    onlinePlatformUrl: Joi.string().uri().allow('').messages({
      'string.uri': 'Online Platform URL must be a valid URL.',
    }),
    logo: Joi.string().allow('').messages({
      'string.base': 'Logo must be a string.',
    }),
    banner: Joi.string().allow('').messages({
      'string.base': 'Banner must be a string.',
    }),
    maximumSeats: Joi.number().integer().min(1).allow(null, '').messages({
      'number.base': 'Maximum Seats must be a number.',
      'number.integer': 'Maximum Seats must be an integer.',
      'number.min': 'Maximum Seats must be at least 1.',
    }),
    organizerId: Joi.string().allow(null, ''),
    status: Joi.string().valid('Draft', 'Ongoing', 'Upcoming', 'Expired').default('Draft').messages({
      'any.only': 'Status must be Draft, Ongoing, Upcoming, or Expired.',
    }),
    isActive: Joi.boolean().optional(),
  }),

  updateEvents: Joi.object({
    title: Joi.string().min(3).max(200).optional().messages({
      'string.empty': 'Title cannot be empty.',
      'string.min': 'Title must be at least 3 characters long.',
      'string.max': 'Title cannot exceed 200 characters.',
    }),
    slug: Joi.string().min(3).max(200).optional().messages({
      'string.empty': 'Slug cannot be empty.',
      'string.min': 'Slug must be at least 3 characters long.',
      'string.max': 'Slug cannot exceed 200 characters.',
    }),
    description: Joi.string().allow(''),
    startDate: Joi.date().optional().messages({
      'date.base': 'Start Date must be a valid date.',
    }),
    endDate: Joi.date().optional().messages({
      'date.base': 'End Date must be a valid date.',
    }),
    startTime: Joi.string().required().messages({
      'string.empty': 'Start Time is required.',
      'any.required': 'Start Time is required.',
    }),
    endTime: Joi.string().required().messages({
      'string.empty': 'End Time is required.',
      'any.required': 'End Time is required.',
    }),
    timezone: Joi.string().allow(''),
    registrationOpen: Joi.date().required().messages({
      'date.base': 'Registration Open must be a valid date.',
      'any.required': 'Registration Open date is required.',
    }),
    registrationClose: Joi.date().required().messages({
      'date.base': 'Registration Close must be a valid date.',
      'any.required': 'Registration Close date is required.',
    }),
    eventType: Joi.string().valid('Offline', 'Online', 'Hybrid').optional().messages({
      'any.only': 'Event Type must be Offline, Online, or Hybrid.',
    }),
    venueLocation: Joi.string().allow(''),
    onlinePlatformUrl: Joi.string().uri().allow('').messages({
      'string.uri': 'Online Platform URL must be a valid URL.',
    }),
    logo: Joi.string().allow('').messages({
      'string.base': 'Logo must be a string.',
    }),
    banner: Joi.string().allow('').messages({
      'string.base': 'Banner must be a string.',
    }),
    maximumSeats: Joi.number().integer().min(1).allow(null, '').messages({
      'number.base': 'Maximum Seats must be a number.',
      'number.integer': 'Maximum Seats must be an integer.',
      'number.min': 'Maximum Seats must be at least 1.',
    }),
    organizerId: Joi.string().allow(null, ''),
    status: Joi.string().valid('Draft', 'Ongoing', 'Upcoming', 'Expired').optional().messages({
      'any.only': 'Status must be Draft, Ongoing, Upcoming, or Expired.',
    }),
    isActive: Joi.boolean().optional(),
  }),
};
