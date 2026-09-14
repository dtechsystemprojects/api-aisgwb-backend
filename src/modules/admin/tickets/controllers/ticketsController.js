const { BaseController } = require('../../../../core');
const TicketsService = require('../services/ticketsService');

class TicketsController extends BaseController {
  async getTicketGroups(req, res) {
    try {
      const data = await TicketsService.getTicketGroups();
      this.success(res, data, 'Ticket groups fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  async getByEventId(req, res) {
    try {
      const { eventId } = req.params;
      const data = await TicketsService.getByEventId(eventId);
      this.success(res, data, 'Tickets fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  async create(req, res) {
    try {
      const { eventId } = req.body;
      if (!eventId) {
        return this.error(res, "eventId is required in the body", 400);
      }
      const data = await TicketsService.create(eventId, req.body);
      await this.logActivity(req, 'Event Tickets', data._id, 'CREATE', req.body);
      this.success(res, data, 'Ticket created successfully', 201);
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const { ticketId } = req.params;
      const data = await TicketsService.update(ticketId, req.body);
      await this.logActivity(req, 'Event Tickets', ticketId, 'UPDATE', req.body);
      this.success(res, data, 'Ticket updated successfully');
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      const { ticketId } = req.params;
      const data = await TicketsService.delete(ticketId);
      await this.logActivity(req, 'Event Tickets', ticketId, 'DELETE', data);
      this.success(res, data, 'Ticket deleted successfully');
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }
}

module.exports = new TicketsController();
