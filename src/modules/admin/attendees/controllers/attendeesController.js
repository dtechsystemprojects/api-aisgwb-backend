const Attendee = require('../models/attendeesModel');
const logger = require('../../../../services/logger');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const https = require('https');
const path = require('path');
const emailService = require('../../../../services/emailService');

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

// Create a new attendee
exports.createAttendee = async (req, res, next) => {
  try {
    const attendee = await Attendee.create(req.body);
    return res.status(201).json({ success: true, data: attendee });
  } catch (error) {
    logger.error('Error creating attendee:', error);
    next(error);
  }
};

// Get all attendees with pagination and search
exports.getAttendees = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }
    
    if (req.query.eventId) {
      query.eventId = req.query.eventId;
    }

    const attendees = await Attendee.find(query)
      .populate('eventId', 'title')
      .populate('ticketId', 'ticketName ticketPrice')
      .populate({
        path: 'bookingId',
        select: 'userId billingInfo tickets',
        populate: {
          path: 'userId',
          select: 'name memberId',
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Attendee.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: attendees,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching attendees:', error);
    next(error);
  }
};

// Get single attendee
exports.getAttendeeById = async (req, res, next) => {
  try {
    const attendee = await Attendee.findById(req.params.id)
      .populate('eventId', 'title')
      .populate('ticketId', 'ticketName ticketPrice')
      .populate({
        path: 'bookingId',
        select: 'userId billingInfo tickets',
        populate: {
          path: 'userId',
          select: 'name memberId',
        }
      });
      
    if (!attendee) {
      return res.status(404).json({ success: false, message: 'Attendee not found' });
    }
    return res.status(200).json({ success: true, data: attendee });
  } catch (error) {
    logger.error('Error fetching attendee:', error);
    next(error);
  }
};

// Update attendee
exports.updateAttendee = async (req, res, next) => {
  try {
    const attendee = await Attendee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('eventId', 'title')
      .populate('ticketId', 'ticketName ticketPrice')
      .populate({
        path: 'bookingId',
        select: 'userId billingInfo',
        populate: {
          path: 'userId',
          select: 'name memberId',
        }
      });
    
    if (!attendee) {
      return res.status(404).json({ success: false, message: 'Attendee not found' });
    }
    return res.status(200).json({ success: true, data: attendee });
  } catch (error) {
    logger.error('Error updating attendee:', error);
    next(error);
  }
};

// Delete attendee
exports.deleteAttendee = async (req, res, next) => {
  try {
    const attendee = await Attendee.findByIdAndDelete(req.params.id);
    if (!attendee) {
      return res.status(404).json({ success: false, message: 'Attendee not found' });
    }
    return res.status(200).json({ success: true, data: {} });
  } catch (error) {
    logger.error('Error deleting attendee:', error);
    next(error);
  }
};

// Resend Ticket PDF via Email
exports.resendTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    //const { ticketPdfBase64, invoicePdfBase64 } = req.body;
    const { ticketPdfBase64 } = req.body;
    
    if (!ticketPdfBase64) {
      return res.status(400).json({ success: false, message: 'Ticket PDF base64 is required' });
    }

    const attendee = await Attendee.findById(id)
      .populate('eventId', 'title venue startDate endDate')
      .populate('ticketId', 'ticketName ticketPrice')
      .populate({
        path: 'bookingId',
        select: 'userId billingInfo totalAmount paymentStatus tickets',
        populate: {
          path: 'userId',
          select: 'name memberId email',
        }
      });
      
    if (!attendee) {
      return res.status(404).json({ success: false, message: 'Attendee not found' });
    }

    const booking = attendee.bookingId;
    if (!booking) {
      return res.status(400).json({ success: false, message: 'Booking not found for this attendee' });
    }

    const email = booking.billingInfo?.email || booking.userId?.email;
    if (!email) {
      return res.status(400).json({ success: false, message: 'No email address associated with this booking' });
    }

    const ticketsDir = path.join(__dirname, '../../../../../public/uploads/tickets');
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }
    
    const attachments = [];
    const ticketPath = path.join(ticketsDir, `ticket-${attendee._id}.pdf`);
    
    // Save Ticket PDF
    const tBase64Data = ticketPdfBase64.replace(/^data:.*?;base64,/, "");
    fs.writeFileSync(ticketPath, tBase64Data, "base64");
    attachments.push({ filename: `ticket-${attendee._id}.pdf`, path: ticketPath });

    // Save Invoice PDF if present
    // const invoicePath = path.join(ticketsDir, `invoice-${attendee._id}.pdf`);
    // if (invoicePdfBase64) {
    //   const iBase64Data = invoicePdfBase64.replace(/^data:.*?;base64,/, "");
    //   fs.writeFileSync(invoicePath, iBase64Data, "base64");
    //   attachments.push({ filename: `invoice-${attendee._id}.pdf`, path: invoicePath });
    // }

    try {
      await emailService.sendEmail(
        email,
        `Your Event Ticket for ${attendee.eventId?.title || 'the Event'}`,
        '<p>Dear Attendee,</p><p>Please find attached your ticket and invoice (if applicable) for the event.</p><p>Thank you!</p>',
        attachments
      );
      
      // Clean up the files
      fs.unlink(ticketPath, (err) => { if (err) console.error('Error deleting ticket PDF:', err); });
      // if (invoicePdfBase64) {
      //   fs.unlink(invoicePath, (err) => { if (err) console.error('Error deleting invoice PDF:', err); });
      // }
      
      return res.status(200).json({ success: true, message: 'Ticket emailed successfully to ' + email });
    } catch (err) {
      logger.error('Email sending failed:', err.message);
      return res.status(500).json({ success: false, message: 'Ticket PDF generated but failed to send email. (' + err.message + ')' });
    }

  } catch (error) {
    logger.error('Error resending ticket:', error);
    next(error);
  }
};
