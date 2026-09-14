const Joi = require('joi');

module.exports = {
  createBooking: Joi.object({
    eventId: Joi.string().required(),
    userId: Joi.string().allow(null, '').optional(),
    billingInfo: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().allow(null, '').optional(),
      email: Joi.string().email().allow(null, '').optional(),
      phone: Joi.string().allow(null, '').optional()
    }).required(),
    tickets: Joi.array().items(
      Joi.object({
        ticketId: Joi.string().required(),
        ticketName: Joi.string().allow(null, '').optional(),
        price: Joi.number().min(0).required(),
        quantity: Joi.number().min(1).required(),
        attendees: Joi.array().items(
          Joi.object({
            name: Joi.string().required()
          }).unknown(true)
        ).optional()
      }).unknown(true)
    ).min(1).required(),
    paymentMethod: Joi.string().allow(null, '').optional(),
    paymentStatus: Joi.string().valid('Pending', 'Completed', 'Failed', 'Refunded', 'Free').optional(),
    bookingStatus: Joi.string().valid('Confirmed', 'Cancelled').optional()
  }).unknown(true),

  updateBooking: Joi.object({
    billingInfo: Joi.object({
      firstName: Joi.string().optional(),
      lastName: Joi.string().allow(null, '').optional(),
      email: Joi.string().email().allow(null, '').optional(),
      phone: Joi.string().allow(null, '').optional()
    }).optional(),
    tickets: Joi.array().items(
      Joi.object({
        ticketId: Joi.string().required(),
        ticketName: Joi.string().allow(null, '').optional(),
        price: Joi.number().min(0).required(),
        quantity: Joi.number().min(1).required(),
        attendees: Joi.array().items(
          Joi.object({
            name: Joi.string().allow(null, '').optional()
          }).unknown(true)
        ).optional()
      }).unknown(true)
    ).optional(),
    paymentMethod: Joi.string().allow(null, '').optional(),
    paymentStatus: Joi.string().valid('Pending', 'Completed', 'Failed', 'Refunded', 'Free').optional(),
    bookingStatus: Joi.string().valid('Confirmed', 'Cancelled').optional(),
    eventId: Joi.string().optional(),
    userId: Joi.string().allow(null, '').optional()
  }).unknown(true)
};

