const { BaseController } = require('../../../../core');
const BookingsService = require('../services/bookingsService');

class BookingsController extends BaseController {
  async getAll(req, res) {
    try {
      const data = await BookingsService.getAll();
      this.success(res, data, 'Bookings fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  async getByEventId(req, res) {
    try {
      const { eventId } = req.params;
      const data = await BookingsService.getByEventId(eventId);
      this.success(res, data, 'Event bookings fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await BookingsService.getById(id);
      this.success(res, data, 'Booking fetched successfully');
    } catch (error) {
      this.error(res, error.message, 404);
    }
  }

  async create(req, res) {
    try {
      const data = await BookingsService.create(req.body);
      await this.logActivity(req, 'Event Bookings', data._id, 'CREATE', req.body);
      this.success(res, data, 'Booking created successfully', 201);
    } catch (error) {
      console.error("BOOKINGS_CONTROLLER_ERROR:", error); this.error(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const data = await BookingsService.update(id, req.body);
      await this.logActivity(req, 'Event Bookings', id, 'UPDATE', req.body);
      this.success(res, data, 'Booking updated successfully');
    } catch (error) {
      console.error("BOOKINGS_CONTROLLER_ERROR:", error); this.error(res, error.message, 400);
    }
  }

  
  async resendInvoice(req, res) {
    try {
      const { id } = req.params;
      const { pdfBase64 } = req.body;
      const data = await BookingsService.resendInvoice(id, pdfBase64);
      this.success(res, data, 'Invoice sent successfully');
    } catch (error) {
      console.error("BOOKINGS_CONTROLLER_ERROR:", error); this.error(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const data = await BookingsService.delete(id);
      await this.logActivity(req, 'Event Bookings', id, 'DELETE', data);
      this.success(res, data, 'Booking deleted successfully');
    } catch (error) {
      console.error("BOOKINGS_CONTROLLER_ERROR:", error); this.error(res, error.message, 400);
    }
  }
}

module.exports = new BookingsController();

