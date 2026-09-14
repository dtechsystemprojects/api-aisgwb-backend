const Joi = require('joi');

module.exports = {
  createTicket: Joi.object({
    ticketName: Joi.string().required(),
    numberOfTickets: Joi.number().required().min(1),
    ticketPrice: Joi.number().required().min(0),
    startDate: Joi.date().allow(null, ''),
    endDate: Joi.date().allow(null, ''),
    startTime: Joi.string().allow(null, ''),
    endTime: Joi.string().allow(null, ''),
    minQuantity: Joi.number().min(1).default(1),
    maxQuantity: Joi.number().min(1).default(10),
    description: Joi.string().allow(null, ''),
    isActive: Joi.boolean().default(true),
    groupId: Joi.string().allow(null, '').optional(),
    eventId: Joi.string().optional()
  }),

  updateTicket: Joi.object({
    ticketName: Joi.string().optional(),
    numberOfTickets: Joi.number().min(1).optional(),
    ticketPrice: Joi.number().min(0).optional(),
    startDate: Joi.date().allow(null, '').optional(),
    endDate: Joi.date().allow(null, '').optional(),
    startTime: Joi.string().allow(null, '').optional(),
    endTime: Joi.string().allow(null, '').optional(),
    minQuantity: Joi.number().min(1).optional(),
    maxQuantity: Joi.number().min(1).optional(),
    description: Joi.string().allow(null, '').optional(),
    isActive: Joi.boolean().optional(),
    groupId: Joi.string().allow(null, '').optional(),
    eventId: Joi.string().optional()
  })
};
