const Events = require('../../../admin/events/models/eventsModel');
const Tickets = require('../../../admin/tickets/models/ticketsModel');
const Attendee = require('../../../admin/attendees/models/attendeesModel');

class EventsController {
  async getEvents(req, res) {
    try {
      const events = await Events.find({ isActive: true,status:'Upcoming' });
      return res.status(200).json({
        success: true,
        data: events
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch events',
        error: error.message
      });
    }
  }

  async getEventDetails(req, res) {
    try {
      const { id } = req.params;
      const event = await Events.findById(id);
      
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: event
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch event details',
        error: error.message
      });
    }
  }

  
  async getAttendees(req, res) {
    try {
      const attendees = await Attendee.find().lean();
      return res.status(200).json({
        success: true,
        data: attendees
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch attendees',
        error: error.message
      });
    }
  }

  async getEventTickets(req, res) {
    try {
      const { eventId } = req.params;
      

      const ticketQuery = { eventId: eventId, isActive: true };

      

      const tickets = await Tickets.find(ticketQuery).populate('groupId').lean();

      const attendeeCounts = await Attendee.aggregate([
        {
          $match: {
            eventId: eventId,
            ticketStatus: { $ne: 'Cancelled' }
          }
        },
        {
          $group: {
            _id: { eventId: '$eventId', ticketId: '$ticketId' },
            count: { $sum: 1 }
          }
        }
      ]);

      const countMap = attendeeCounts.reduce((acc, item) => {
        const ticketId = item._id.ticketId.toString();
        acc[ticketId] = item.count;
        return acc;
      }, {});

      const data = tickets.map((ticket) => ({
        ...ticket,
        eventId: ticket.eventId ? ticket.eventId.toString() : eventId,
        ticketId: ticket._id ? ticket._id.toString() : ticket.ticketId,
        count: countMap[ticket._id.toString()] || 0
      }));

      return res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch event tickets',
        error: error.message
      });
    }
  }
}

module.exports = new EventsController();

