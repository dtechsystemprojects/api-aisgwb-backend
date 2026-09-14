const Razorpay = require('razorpay');
const crypto = require('crypto');
const Bookings = require('../../../admin/bookings/models/bookingsModel');
const Attendee = require('../../../admin/attendees/models/attendeesModel');
const Transactions = require('../../../admin/transactions/models/transactionsModel');
const Settings = require('../../../admin/settings/models/settingsModel');

class CheckoutController {
  
  async getRazorpayKeys(reqBody) {
    let key_id = reqBody?.key_id || process.env.RAZORPAY_KEY_ID || '';
    let key_secret = reqBody?.key_secret || process.env.RAZORPAY_KEY_SECRET || '';
    
    // Only query DB if not passed from frontend explicitly
    if (!key_id || !key_secret || key_id === 'rzp_test_placeholder') {
        try {
          const settingId = await Settings.findOne({ key: 'general.razorpay_key_id' });
          if (settingId && settingId.value && settingId.value.trim() !== '') {
              key_id = settingId.value.trim();
          }
          
          const settingSecret = await Settings.findOne({ key: 'general.razorpay_key_secret' });
          if (settingSecret && settingSecret.value && settingSecret.value.trim() !== '') {
              key_secret = settingSecret.value.trim();
          }
        } catch(err) {
          console.log('Could not fetch razorpay keys from settings, using env variables.', err);
        }
    }
    
    return { key_id, key_secret };
  }

  async createOrder(req, res) {
    try {
      const { amount, currency = 'INR', receipt = 'receipt_order_1' } = req.body;
      const { key_id, key_secret } = await this.getRazorpayKeys(req.body);
      
      if (!key_id || !key_secret || key_id === 'rzp_test_placeholder') {
         return res.status(400).json({ 
             success: false, 
             message: 'Razorpay API keys are missing or invalid. Please configure them in Settings.'
         });
      }

      const razorpay = new Razorpay({ key_id, key_secret });
      
      const options = {
        amount: Math.round(amount * 100),
        currency,
        receipt
      };
      
      const order = await razorpay.orders.create(options);
      
      res.status(200).json({ success: true, order, key_id });
    } catch (error) {
      console.error("Razorpay order creation error:", error);
      res.status(500).json({ success: false, message: error.error ? error.error.description : 'Could not create order with Razorpay.', error });
    }
  }

  async verifyPayment(req, res) {
    try {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        bookingData,
        attendeesData,
        transactionData
      } = req.body;

      const { key_secret } = await this.getRazorpayKeys(req.body);
      
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', key_secret)
        .update(body.toString())
        .digest('hex');

      const isAuthentic = expectedSignature === razorpay_signature;

      if (!isAuthentic) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }

      // Create Booking
      const booking = new Bookings({
        ...bookingData,
        paymentStatus: 'Completed'
      });
      const savedBooking = await booking.save();

      // Create Attendees
      if (attendeesData && attendeesData.length > 0) {
        const mappedAttendees = attendeesData.map(a => ({
          ...a,
          bookingId: savedBooking._id,
          paymentStatus: 'Success'
        }));
        await Attendee.insertMany(mappedAttendees);
      }

      // Decrement available seats/inventory
      const Ticket = require('../../../admin/tickets/models/ticketsModel');
      if (bookingData.tickets && bookingData.tickets.length > 0) {
        for (let t of bookingData.tickets) {
          if (t.ticketId) {
            try {
              await Ticket.findByIdAndUpdate(t.ticketId, { $inc: { numberOfTickets: -t.quantity } });
            } catch (e) {
              console.error('Error updating ticket inventory:', e);
            }
          }
        }
      }

      // Create Transaction
      const transaction = new Transactions({
        ...transactionData,
        type: 'EVENT',
        bookingId: savedBooking._id,
        transactionRef: razorpay_payment_id,
        status: 'Success'
      });
      await transaction.save();

      res.status(200).json({ 
        success: true, 
        message: 'Payment verified and booking saved successfully',
        bookingId: savedBooking._id
      });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ success: false, message: 'Verification failed', error });
    }
  }

  async uploadInvoice(req, res) {
    try {
      const { id } = req.params;
      const { pdfBase64, ticketPdfBase64s } = req.body;
      if (!pdfBase64) {
        return res.status(400).json({ success: false, message: 'pdfBase64 is required' });
      }

      // Hand off entirely to bookingsService which will save the base64 invoice, generate tickets, email them both, and delete them.
      const BookingsService = require('../../../admin/bookings/services/bookingsService');
      await BookingsService.resendInvoice(id, pdfBase64, ticketPdfBase64s);

      res.status(200).json({ success: true, message: 'Invoice uploaded and sent successfully' });
    } catch (error) {
      console.error("Invoice upload error:", error);
      res.status(500).json({ success: false, message: 'Failed to upload invoice', error });
    }
  }

}

module.exports = new CheckoutController();





