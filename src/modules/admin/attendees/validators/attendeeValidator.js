const Joi = require('joi');

const createAttendeeSchema = Joi.object({
  eventId: Joi.string().required().messages({
    'string.empty': 'Event ID is required',
    'any.required': 'Event ID is required'
  }),
  name: Joi.string().required().trim().messages({
    'string.empty': 'Name is required',
    'any.required': 'Name is required'
  }),
  ticketId: Joi.string().required().messages({
    'string.empty': 'Ticket ID is required',
    'any.required': 'Ticket ID is required'
  }),
  ticketPrice: Joi.number().min(0).required().messages({
    'number.base': 'Ticket price must be a number',
    'number.min': 'Ticket price cannot be negative',
    'any.required': 'Ticket price is required'
  }),
  ticketStatus: Joi.string().valid('Unused', 'Used', 'Cancelled').optional(),
  paymentStatus: Joi.string().valid('Success', 'Failed', 'Pending').optional()
});

const updateAttendeeSchema = Joi.object({
  eventId: Joi.string().optional(),
  name: Joi.string().trim().optional(),
  ticketId: Joi.string().optional(),
  ticketPrice: Joi.number().min(0).optional(),
  ticketStatus: Joi.string().valid('Unused', 'Used', 'Cancelled').optional(),
  paymentStatus: Joi.string().valid('Success', 'Failed', 'Pending').optional()
});

exports.validateCreateAttendee = (req, res, next) => {
  const { error } = createAttendeeSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return res.status(400).json({ success: false, errors });
  }
  next();
};

exports.validateUpdateAttendee = (req, res, next) => {
  const { error } = updateAttendeeSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return res.status(400).json({ success: false, errors });
  }
  next();
};
