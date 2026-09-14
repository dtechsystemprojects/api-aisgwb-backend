const { BaseController } = require('../../../../core');
  const EventsService = require('../services/eventsService');
class EventsController extends BaseController {
  async getAll(req, res) {
    try {
      const pageNum = parseInt(req.query.page, 10) || 1;
      const limitNum = parseInt(req.query.limit, 10) || 10;
      const data = await EventsService.getAll(pageNum, limitNum);
      this.paginated(res, data.data, data.total, pageNum, limitNum, 'Events fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  async getById(req, res) {
    try {
      const data = await EventsService.getById(req.params.id);
      if (!data) return this.error(res, 'Events not found', 404);
      this.success(res, data, 'Events fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  async create(req, res) {
    try {
      // Default organizer is the admin creating the event
      if (!req.body.organizerId && req.admin && req.admin._id) {
        req.body.organizerId = req.admin._id;
      }
      const data = await EventsService.create(req.body);
      // Log Activities //
      await this.logActivity(req, 'Events', data._id, 'CREATE', req.body);
      this.success(res, data, 'Events created successfully', 201);
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const data = await EventsService.update(req.params.id, req.body);
      // Log Activities //
      await this.logActivity(req, 'Events', req.params.id, 'UPDATE', req.body);
      this.success(res, data, 'Events updated successfully');
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  async status(req, res) {
    try {
      const { status } = req.body;
      const data = await EventsService.status(req.params.id, status);
      //  Log Activities //
      await this.logActivity(req, 'Events', req.params.id, 'STATUS', req.body);
      this.success(res, data, 'Events status updated successfully');
    } catch (error) {
      this.error(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      const data = await EventsService.getById(req.params.id);
      // Log Activities //
      await this.logActivity(req, 'Events', req.params.id, 'DELETE', data);
      await EventsService.delete(req.params.id);
      this.success(res, null, 'Events deleted successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }
}

module.exports = new EventsController();
