const mongoose = require('mongoose');

const ticketsSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Events', required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketGroup' },
    ticketName: { type: String, required: true, trim: true },
    numberOfTickets: { type: Number, required: true },
    ticketPrice: { type: Number, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    minQuantity: { type: Number, default: 1 },
    maxQuantity: { type: Number, default: 10 },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ticketsSchema.index({ eventId: 1 });

module.exports = mongoose.model('Tickets', ticketsSchema);
