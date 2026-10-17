const Booking = require('../../admin/bookings/models/bookingsModel');
const Attendee = require('../../admin/attendees/models/attendeesModel');
const bookingsController = require('../../admin/bookings/controllers/bookingsController');
const attendeesController = require('../../admin/attendees/controllers/attendeesController');
const logger = require('../../../services/logger');

class CronController {
  constructor() {
    this.isProcessing = false;
  }

  /**
   * Process invoice and ticket emailing for a single booking:
   * 1. Calls bookingsController.resendInvoice method
   * 2. Calls attendeesController.resendBulkTicket method to send all tickets in one email
   * 3. Updates MongoDB booking document with emailSent: true
   */
  async processSingleBooking(bookingId) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate('eventId', 'title')
        .populate('userId', 'name email');

      if (!booking) {
        return { success: false, reason: 'Booking not found' };
      }

      const recipientEmail = booking.billingInfo?.email || booking.userId?.email;
      if (!recipientEmail) {
        await Booking.findByIdAndUpdate(bookingId, { emailError: 'No recipient email found' });
        logger.warn(`[CronController] Booking ${bookingId} has no recipient email`);
        return { success: false, reason: 'No recipient email' };
      }

      const isFreeBooking = !booking.totalAmount || Number(booking.totalAmount) === 0;

      logger.info(`[CronController] Processing booking ${bookingId} for ${recipientEmail} (isFree: ${isFreeBooking})...`);

      // 1. Call bookingsController.resendInvoice method ONLY IF NOT FREE (price > 0)
      if (!isFreeBooking) {
        logger.info(`[CronController] Calling bookingsController.resendInvoice for booking ${booking._id}...`);
        try {
          await new Promise((resolve, reject) => {
            const mockReq = {
              params: { id: String(booking._id) },
              body: {},
            };
            const mockRes = {
              status: function (code) {
                this._code = code;
                return this;
              },
              json: function (data) {
                if ((this._code && this._code >= 400) || (data && data.success === false)) {
                  reject(new Error(data?.message || `bookingsController.resendInvoice failed with status ${this._code}`));
                } else {
                  resolve(data);
                }
              },
            };
            bookingsController.resendInvoice(mockReq, mockRes).catch(reject);
          });
          logger.info(`[CronController] Invoice sent successfully for booking ${booking._id}`);
          // Small pause between invoice and ticket emails to avoid SMTP rate limiting
          await new Promise((r) => setTimeout(r, 1000));
        } catch (invErr) {
          logger.error(`[CronController] Invoice sending failed for booking ${booking._id}: ${invErr.message}`);
          // Do not abort ticket delivery if invoice email fails
        }
      } else {
        logger.info(`[CronController] Booking ${booking._id} price == 0 (Free booking). No invoice generated or sent.`);
      }

      // 2. Call attendeesController.resendBulkTicket method to send all tickets in ONE email
      let ticketSuccessCount = 0;
      const attendees = await Attendee.find({ bookingId: booking._id });
      if (attendees && attendees.length > 0) {
        const attendeeIds = attendees.map((att) => String(att._id));
        try {
          logger.info(`[CronController] Calling attendeesController.resendBulkTicket for ${attendees.length} attendee(s) in booking ${booking._id}...`);
          await new Promise((resolve, reject) => {
            const mockReq = {
              body: {
                bookingId: String(booking._id),
                attendeeIds,
              },
            };
            const mockRes = {
              status: function (code) {
                this._code = code;
                return this;
              },
              json: function (data) {
                if ((this._code && this._code >= 400) || (data && data.success === false)) {
                  reject(new Error(data?.message || `attendeesController.resendBulkTicket failed with status ${this._code}`));
                } else {
                  resolve(data);
                }
              },
            };
            const mockNext = (err) => {
              if (err) reject(err);
              else resolve();
            };
            attendeesController.resendBulkTicket(mockReq, mockRes, mockNext).catch(reject);
          });
          ticketSuccessCount = attendees.length;
          logger.info(`[CronController] Bulk tickets (${ticketSuccessCount}) sent successfully in one email for booking ${booking._id}`);
        } catch (tErr) {
          logger.error(`[CronController] attendeesController.resendBulkTicket failed for booking ${booking._id}: ${tErr.message}`);
        }
      }

      // 3. Mark booking in DB
      await Booking.findByIdAndUpdate(booking._id, {
        emailSent: true,
        emailSentAt: new Date(),
        emailError: null,
      });

      logger.info(`[CronController] Successfully processed booking ${booking._id} (tickets sent: ${ticketSuccessCount})`);
      return { 
        success: true, 
        bookingId: booking._id, 
        recipient: recipientEmail, 
        isFreeBooking, 
        ticketsSent: ticketSuccessCount 
      };
    } catch (err) {
      logger.error(`[CronController] Failed to process booking ${bookingId}: ${err.message}`);
      await Booking.findByIdAndUpdate(bookingId, {
        emailError: err.message,
      });
      return { success: false, bookingId, error: err.message };
    }
  }

  /**
   * Process all pending bookings when https://booking.aisgwb.org/api/cron/process-bookings is triggered
   */
  async processBookings(req, res) {
    try {
      const requestKey = req.query.key || req.query.secret || req.headers['x-cron-key'];
      const configuredSecret = process.env.CRON_SECRET;

      if (configuredSecret && requestKey !== configuredSecret) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Invalid cron secret key',
        });
      }

      if (this.isProcessing) {
        logger.info('[CronController] A processing run is already in progress, skipping this tick');
        return res.status(200).json({
          success: false,
          message: 'A batch is already being processed',
          isProcessing: true,
        });
      }

      this.isProcessing = true;
      const results = [];

      try {
        const pendingBookings = await Booking.find({
          bookingStatus: 'Confirmed',
          paymentStatus: { $in: ['Completed', 'Free', 'Success'] },
          emailSent: { $ne: true },
        })
          .sort({ createdAt: 1 })
          .limit(25)
          .select('_id billingInfo paymentStatus createdAt');

        if (pendingBookings.length === 0) {
          return res.status(200).json({
            success: true,
            message: 'No pending bookings found',
            processedCount: 0,
            timestamp: new Date().toISOString(),
          });
        }

        logger.info(`[CronController] Found ${pendingBookings.length} pending booking(s) to process`);

        for (const b of pendingBookings) {
          try {
            const result = await this.processSingleBooking(b._id);
            results.push(result);
          } catch (innerErr) {
            logger.error(`[CronController] Error processing booking ${b._id}: ${innerErr.message}`);
            results.push({ success: false, bookingId: b._id, error: innerErr.message });
          }
        }

        return res.status(200).json({
          success: true,
          message: `Processed ${results.length} booking(s)`,
          processedCount: results.length,
          timestamp: new Date().toISOString(),
          results,
        });
      } finally {
        this.isProcessing = false;
      }
    } catch (error) {
      console.error('[CronController] Error executing processBookings:', error);
      return res.status(500).json({
        success: false,
        message: 'Cron execution failed',
        error: error.message,
      });
    }
  }

  async getStatus(req, res) {
    return res.status(200).json({
      success: true,
      service: 'AISGWB Booking Cron Service',
      endpoint: '/api/cron/process-bookings',
      isProcessing: Boolean(this.isProcessing),
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new CronController();
