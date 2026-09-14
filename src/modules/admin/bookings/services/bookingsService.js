const Attendee = require('../../attendees/models/attendeesModel');
const Booking = require('../models/bookingsModel');
const Event = require('../../events/models/eventsModel');
const Ticket = require('../../tickets/models/ticketsModel');
const Transactions = require('../../transactions/models/transactionsModel');
const Settings = require('../../settings/models/settingsModel');


const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const emailService = require('../../../../services/emailService');

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

module.exports = {
  async getAll() {
    const bookings = await Booking.find()
      .populate('eventId', 'title startDate endDate')
      .populate('userId', 'name email memberId')
      .populate('tickets.ticketId', 'ticketName ticketPrice')
      .sort({ createdAt: -1 })
      .lean();

    const bookingIds = bookings.map(b => b._id);
    const usedAttendees = await Attendee.find({ bookingId: { $in: bookingIds }, ticketStatus: 'Used' }, 'bookingId').lean();
    const usedBookingIds = new Set(usedAttendees.map(a => a.bookingId.toString()));
    
    return bookings.map(b => ({
      ...b,
      hasUsedTickets: usedBookingIds.has(b._id.toString())
    }));
  },

  async getByEventId(eventId) {
    const bookings = await Booking.find({ eventId })
      .populate('userId', 'name email memberId')
      .populate('tickets.ticketId', 'ticketName ticketPrice')
      .sort({ createdAt: -1 })
      .lean();

    const bookingIds = bookings.map(b => b._id);
    const usedAttendees = await Attendee.find({ bookingId: { $in: bookingIds }, ticketStatus: 'Used' }, 'bookingId').lean();
    const usedBookingIds = new Set(usedAttendees.map(a => a.bookingId.toString()));
    
    return bookings.map(b => ({
      ...b,
      hasUsedTickets: usedBookingIds.has(b._id.toString())
    }));
  },

  async getById(id) {
    const booking = await Booking.findById(id)
      .populate('eventId', 'title startDate endDate')
      .populate('userId', 'name email memberId')
      .populate('tickets.ticketId', 'ticketName ticketPrice')
      .lean();
      
    if (!booking) {
      throw new Error('Booking not found');
    }
    return booking;
  },

  async create(payload) {
    // 1. Verify Event exists
    const event = await Event.findById(payload.eventId);
    if (!event) throw new Error('Event not found');

    // 2. Loop through tickets array, validate against DB, and sum total
    let calculatedTotal = 0;

    for (let t of payload.tickets) {
      const ticketDb = await Ticket.findById(t.ticketId);
      if (!ticketDb) throw new Error(`Ticket ID ${t.ticketId} not found`);

      // Validate quantities
      if (t.quantity < ticketDb.minQuantity) {
        throw new Error(`Minimum quantity required for ${ticketDb.ticketName} is ${ticketDb.minQuantity}`);
      }
      if (t.quantity > ticketDb.maxQuantity) {
        throw new Error(`Maximum quantity allowed for ${ticketDb.ticketName} is ${ticketDb.maxQuantity}`);
      }

      // Check attendees length matches quantity
      if (t.attendees && t.attendees.length !== t.quantity) {
        throw new Error(`Number of attendees for ${ticketDb.ticketName} must exactly match the selected quantity of ${t.quantity}`);
      }

      // We trust the DB price over the payload price for security, 
      // but we allow underage free tickets to have 0 price and custom name.
      const isUnderAge = t.ticketName && t.ticketName.includes('(Under');
      const actualPrice = isUnderAge ? 0 : (ticketDb.ticketPrice || 0);
      t.price = actualPrice; // Override with actual price
      t.ticketName = isUnderAge ? t.ticketName : ticketDb.ticketName; // Override with actual name

      calculatedTotal += (actualPrice * t.quantity);
    }

    // Auto-set payment status to Free if total is 0
    let paymentStatus = payload.paymentStatus || 'Pending';
    if (calculatedTotal === 0) {
      paymentStatus = 'Free';
    }

    const bookingData = {
      ...payload,
      totalAmount: calculatedTotal,
      paymentStatus,
      bookingStatus: 'Confirmed'
    };

    const newBooking = new Booking(bookingData);
        const savedBooking = await newBooking.save();

    const attendeesToInsert = [];
    for (let t of savedBooking.tickets) {
      if (t.attendees && t.attendees.length > 0) {
        for (let att of t.attendees) {
          attendeesToInsert.push({
            bookingId: savedBooking._id,
            eventId: savedBooking.eventId,
            name: att.name || 'Unknown Attendee',
            age: att.age,
            relation: att.relation,
            ticketId: t.ticketId,
            ticketPrice: t.price,
            paymentStatus: savedBooking.paymentStatus === 'Completed' || savedBooking.paymentStatus === 'Free' ? 'Success' : savedBooking.paymentStatus,
            ticketStatus: 'Unused'
          });
        }
      }
    }
    if (attendeesToInsert.length > 0) {
      await Attendee.insertMany(attendeesToInsert);
    }

    if (payload.transactionData) {
      try {
        const transaction = new Transactions({
          ...payload.transactionData,
          type: 'EVENT',
          bookingId: savedBooking._id,
          eventId: savedBooking.eventId,
        });
        await transaction.save();
      } catch (err) { console.error('Error creating transaction:', err); }
    }

    return savedBooking;
  },

  async update(id, payload) {
    // Calculate new total if tickets are updated
    let calculatedTotal = undefined;
    
    if (payload.tickets && payload.tickets.length > 0) {
      calculatedTotal = 0;
      for (let t of payload.tickets) {
        const ticketDb = await Ticket.findById(t.ticketId);
        if (ticketDb) {
          const isUnderAge = t.ticketName && t.ticketName.includes('(Under');
          const actualPrice = isUnderAge ? 0 : (ticketDb.ticketPrice || 0);
          t.price = actualPrice;
          t.ticketName = isUnderAge ? t.ticketName : ticketDb.ticketName;
          
          if (t.attendees && t.attendees.length !== t.quantity) {
            throw new Error(`Number of attendees for ${ticketDb.ticketName} must exactly match the selected quantity of ${t.quantity}`);
          }
          
          calculatedTotal += (actualPrice * t.quantity);
        }
      }
    }

    const updateData = {
      ...payload,
      ...(calculatedTotal !== undefined && { totalAmount: calculatedTotal })
    };

        const updatedBooking = await Booking.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedBooking) throw new Error('Booking not found');

    await Attendee.deleteMany({ bookingId: updatedBooking._id });
    const attendeesToInsert = [];
    for (let t of updatedBooking.tickets) {
      if (t.attendees && t.attendees.length > 0) {
        for (let att of t.attendees) {
          attendeesToInsert.push({
            bookingId: updatedBooking._id,
            eventId: updatedBooking.eventId,
            name: att.name || 'Unknown Attendee',
            age: att.age,
            relation: att.relation,
            ticketId: t.ticketId,
            ticketPrice: t.price,
            paymentStatus: updatedBooking.paymentStatus === 'Completed' || updatedBooking.paymentStatus === 'Free' ? 'Success' : updatedBooking.paymentStatus,
            ticketStatus: 'Unused'
          });
        }
      }
    }
    if (attendeesToInsert.length > 0) {
      await Attendee.insertMany(attendeesToInsert);
    }

    return updatedBooking;
  },

  
  async resendInvoice(id, pdfBase64, ticketPdfBase64s) {
    const booking = await this.getById(id);
    if (!booking) throw new Error('Booking not found');

    const invoiceDir = path.join(__dirname, '../../../../..', 'public', 'uploads', 'invoices');
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }
    const invoicePath = path.join(invoiceDir, `invoice-${booking._id}.pdf`);

    if (pdfBase64) {
      const base64Data = pdfBase64.replace(/^data:.*?;base64,/, "");
      fs.writeFileSync(invoicePath, base64Data, 'base64');
    } else {
      throw new Error('Invoice PDF base64 is required');
    }

    const attachments = [ { filename: `invoice-${booking._id}.pdf`, path: invoicePath } ];
    const generatedTickets = [];

    if (booking.billingInfo?.email) {
      try {
        const attendees = await Attendee.find({ bookingId: id })
          .populate('eventId', 'title venueLocation startDate endDate')
          .populate('ticketId', 'ticketName ticketPrice');
        const logoSetting = await Settings.findOne({ key: 'general.logo' });

        let logoValue = logoSetting?.value;
        let logoPathOrBuffer = null;
        
        if (logoValue) {
          if (logoValue.startsWith('http')) {
            try {
              logoPathOrBuffer = await fetchImage(logoValue);
            } catch (e) {
              console.error('Failed to fetch remote logo:', e);
            }
          } else {
            const localPath = path.join(process.cwd(), 'public', logoValue);
            if (fs.existsSync(localPath)) {
              logoPathOrBuffer = localPath;
            }
          }
        }

        if (!logoPathOrBuffer) {
           const fallbackPath = path.join(process.cwd(), 'public', 'images', 'logo.png');
           if (fs.existsSync(fallbackPath)) {
              logoPathOrBuffer = fallbackPath;
           }
        }

        const ticketsDir = path.join(__dirname, '../../../../..', 'public', 'uploads', 'tickets');
        if (!fs.existsSync(ticketsDir)) {
          fs.mkdirSync(ticketsDir, { recursive: true });
        }

        if (ticketPdfBase64s && ticketPdfBase64s.length > 0) {
            for (let i = 0; i < attendees.length; i++) {
                if (ticketPdfBase64s[i]) {
                    const ticketPath = path.join(ticketsDir, `ticket-${attendees[i]._id}.pdf`);
                    const base64Data = ticketPdfBase64s[i].replace(/^data:.*?;base64,/, "");
                    fs.writeFileSync(ticketPath, base64Data, 'base64');
                    attachments.push({ filename: `ticket-${attendees[i]._id}.pdf`, path: ticketPath });
                    generatedTickets.push(ticketPath);
                }
            }
        }
        // No else block, we just don't attach tickets if they aren't provided.

        const hasTickets = ticketPdfBase64s && ticketPdfBase64s.length > 0;
        const emailSubject = hasTickets 
            ? `Your Booking for ${booking.eventId?.title || 'Event'}` 
            : `Your Invoice for ${booking.eventId?.title || 'Event'}`;
            
        const emailBody = hasTickets
            ? `<p>Dear ${booking.billingInfo.firstName},</p><p>Please find attached your invoice and tickets for the event <b>${booking.eventId?.title || 'Event Name'}</b>.</p><p>Thank you!</p>`
            : `<p>Dear ${booking.billingInfo.firstName},</p><p>Please find attached your invoice for the event <b>${booking.eventId?.title || 'Event Name'}</b>.</p><p>Thank you!</p>`;

        await emailService.sendEmail(
          booking.billingInfo.email,
          emailSubject,
          emailBody,
          attachments
        );

        for (const ticketPath of generatedTickets) {
          fs.unlink(ticketPath, (err) => { if (err) console.error('Error deleting ticket PDF:', err); });
        }
        
        fs.unlink(invoicePath, (err) => {
          if (err) console.error('Error deleting invoice PDF:', err);
        });

      } catch (err) {
        console.error('Email sending failed:', err.message);
        return { message: 'Invoice and tickets generated successfully, but failed to send email. (' + err.message + ')' };
      }
    }
    
    return { message: 'Invoice generated and sent successfully' };
  },

  async delete(id) {
        const deletedBooking = await Booking.findByIdAndDelete(id);
    if (!deletedBooking) throw new Error('Booking not found');
    await Attendee.deleteMany({ bookingId: id });
    return deletedBooking;
  }
};






