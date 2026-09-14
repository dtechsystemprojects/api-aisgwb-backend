const Ticket = require('../models/ticketsModel');
const Event = require('../../events/models/eventsModel');
const TicketGroup = require('../models/ticketGroupModel');

module.exports = {
  async getTicketGroups() {
    let groups = await TicketGroup.find({ isActive: true }).lean();
    if (groups.length === 0) {
      // Seed initial groups
      const defaultGroups = [
        { name: 'Member' },
        { name: 'Non Member' },
        { name: 'Residents' },
        { name: 'Accompanying Person' }
      ];
      await TicketGroup.insertMany(defaultGroups);
      groups = await TicketGroup.find({ isActive: true }).lean();
    }
    return groups;
  },

  async getByEventId(eventId) {
    return await Ticket.find({ eventId }).sort({ createdAt: -1 }).lean();
  },

  async create(eventId, payload) {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    const newTicket = new Ticket({ ...payload, eventId });
    return await newTicket.save();
  },

  async update(ticketId, payload) {
    const updatedTicket = await Ticket.findByIdAndUpdate(ticketId, payload, { new: true });
    if (!updatedTicket) {
      throw new Error('Ticket not found');
    }
    return updatedTicket;
  },

  async delete(ticketId) {
    const deletedTicket = await Ticket.findByIdAndDelete(ticketId);
    if (!deletedTicket) {
      throw new Error('Ticket not found');
    }
    return deletedTicket;
  }
};
