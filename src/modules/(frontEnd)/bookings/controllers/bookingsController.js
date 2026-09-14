const Bookings = require('../../../admin/bookings/models/bookingsModel');
const Settings = require('../../../admin/settings/models/settingsModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const https = require('https');

const http = require('http');

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

class BookingsController {
  async getMyBookings(req, res) {
    try {
      const userId = req.user._id;
      const bookings = await Bookings.find({ userId }).populate('eventId').sort({ createdAt: -1 });
      
      return res.status(200).json({
        success: true,
        data: bookings
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch your bookings',
        error: error.message
      });
    }
  }

  async downloadTicketPdf(req, res) {
    try {
      const { bookingId, attendeeId } = req.params;
      const booking = await Bookings.findOne({ _id: bookingId, userId: req.user._id })
        .populate('eventId')
        .populate('userId', 'name email memberId');

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      let targetAttendee = null;
      let targetTicket = null;
      for (const t of booking.tickets) {
        const attendee = t.attendees.find((a) => a._id.toString() === attendeeId);
        if (attendee) {
          targetAttendee = attendee;
          targetTicket = t;
          break;
        }
      }

      if (!targetAttendee) {
        return res.status(404).json({ success: false, message: 'Attendee not found' });
      }

      const titleSetting = await Settings.findOne({ key: 'seo.meta_description' });
      const emailSetting = await Settings.findOne({ key: 'general.support_email' });
      const phoneSetting = await Settings.findOne({ key: 'general.contact' });
      const websiteAddress = await Settings.findOne({ key: 'general.website_address' });
      const ticketDescriptionSetting = await Settings.findOne({ key: 'general.ticket_description' });
      const websiteUrlSetting = await Settings.findOne({ key: 'general.website_url' });
      const logoSetting = await Settings.findOne({ key: 'general.logo' });

      const doc = new PDFDocument({ margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=ticket-${attendeeId}.pdf`);
      doc.pipe(res);

      // Logo
      const path = require('path');
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

      if (logoPathOrBuffer) {
        try {
          doc.image(logoPathOrBuffer, 40, 40, { width: 60 });
        } catch (err) {
          console.error('Error drawing logo:', err);
        }
      }

      // Header Text
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#004b87')
        .text(booking.eventId?.title || 'Indian Society of Gastroenterology, West Bengal Chapter', 120, 40, {
          width: 400,
        });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#333333')
        .text(`Venue: ${booking.eventId?.venueLocation || ''}`, 120, doc.y + 8);

      const startDate = booking.eventId?.startDate ? new Date(booking.eventId.startDate).toLocaleDateString() : '';
      const endDate = booking.eventId?.endDate ? new Date(booking.eventId.endDate).toLocaleDateString() : '';
      let dateString = '';
      if (startDate && endDate) dateString = `${startDate} - ${endDate}`;
      else if (startDate) dateString = startDate;

      doc.text(dateString, 120, doc.y + 5);

      doc.moveDown(2);

      // Dashed line separator
      doc.lineWidth(0.5).strokeColor('#cccccc').dash(5, { space: 5 });
      doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
      doc.undash();

      doc.moveDown(2);

      // 2-Column Details Grid
      const col1 = 40;
      const col2 = 300;
      let currentY = doc.y;

      // Row 1
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('BOOKED BY :', col1, currentY);
      doc
        .font('Helvetica')
        .fillColor('#555555')
        .text(`${booking.billingInfo?.firstName || ''} ${booking.billingInfo?.lastName || ''}`, col1 + 90, currentY);

      doc.font('Helvetica-Bold').fillColor('#000000').text('MEMBERSHIP ID :', col2, currentY);
      doc
        .font('Helvetica')
        .fillColor('#555555')
        .text(`${booking.userId?.memberId || 'N/A'}`, col2 + 100, currentY);

      currentY += 25;
      // Row 2
      doc.font('Helvetica-Bold').fillColor('#000000').text('PRICE :', col1, currentY);
      doc
        .font('Helvetica')
        .fillColor('#555555')
        .text(`INR ${targetTicket.price || 0}`, col1 + 90, currentY);

      doc.font('Helvetica-Bold').fillColor('#000000').text('PAYMENT STATUS :', col2, currentY);
      doc
        .font('Helvetica')
        .fillColor('#555555')
        .text(`${booking.paymentStatus || 'Pending'}`, col2 + 110, currentY);

      currentY += 25;
      // Row 3
      doc.font('Helvetica-Bold').fillColor('#000000').text('ATTENDEE :', col1, currentY);
      doc
        .font('Helvetica')
        .fillColor('#555555')
        .text(`${targetAttendee.name}`, col1 + 90, currentY);

      doc.font('Helvetica-Bold').fillColor('#000000').text('TYPE :', col2, currentY);
      doc
        .font('Helvetica')
        .fillColor('#555555')
        .text(`${targetTicket.ticketName}`, col2 + 50, currentY);

      currentY += 50;

      // QR Code
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#000000')
        .text('Scan the QR code:', 40, currentY, { align: 'center' });
      currentY += 15;

      const FRONTEND_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const eventIdStr = booking.eventId?._id || booking.eventId;
      const ticketIdStr = targetTicket.ticketId?._id || targetTicket.ticketId;
      const qrData = `${FRONTEND_URL}/admin/attendees/scanner?eventId=${eventIdStr}&attendeeId=${attendeeId}&ticketId=${ticketIdStr}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

      try {
        const qrBuffer = await fetchImage(qrUrl);
        doc.image(qrBuffer, (doc.page.width - 150) / 2, currentY, { width: 150 });
        currentY += 165;
      } catch (qrErr) {
        currentY += 20; // skip if QR fails
      }

      currentY += 10;
      // Red / Brown footer text
      // doc.font('Helvetica-Bold').fontSize(9).fillColor('#cc0000')
      //    .text('Screenshot of successful payment to be mandatorily sent to: 9830330503 (Mr.Bidyut Mukhopadhyay)', 40, currentY, { align: 'center' });

      currentY += 20;
      doc.fillColor('#201818').text(ticketDescriptionSetting?.value || '', 40, currentY, { align: 'center' });

      currentY += 100;
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#666666')
        .text(titleSetting?.value || '', 40, currentY, { align: 'center' });
      currentY += 15;
      doc.text(websiteAddress?.value || '', 40, currentY, { align: 'center' });
      currentY += 15;
      doc.text(
        `Contact No. ${phoneSetting?.value || ''} Email: ${emailSetting?.value || ''} Website: ${websiteUrlSetting?.value || ''}`,
        40,
        currentY,
        { align: 'center' }
      );

      doc.end();
    } catch (error) {
      console.error("PDF_ERROR:", error);
      if (!res.headersSent) {
         res.status(500).json({ success: false, message: 'Failed to generate ticket', error: error.message });
      }
    }
  }
}

module.exports = new BookingsController();
