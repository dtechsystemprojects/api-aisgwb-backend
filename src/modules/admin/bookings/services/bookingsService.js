const Attendee = require('../../attendees/models/attendeesModel');
const Booking = require('../models/bookingsModel');
const Event = require('../../events/models/eventsModel');
const Ticket = require('../../tickets/models/ticketsModel');
const Transactions = require('../../transactions/models/transactionsModel');
const Settings = require('../../settings/models/settingsModel');

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
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

function formatCurrency(num) {
  if (num === 0 || num === '0' || !num) return '₹ 0.00';
  return '₹ ' + Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(date);
  }
}

/**
 * Fetch and extract general settings
 */
async function getGeneralSettings() {
  const settingKeys = [
    'general.title',
    'general.logo',
    'general.support_email',
    'general.contact',
    'general.website_address',
    'general.website_url',
    'general.ticket_description',
  ];
  const settingsDocs = await Settings.find({ key: { $in: settingKeys } }).lean();
  const settings = {};
  settingsDocs.forEach((s) => {
    settings[s.key] = s.value;
  });
  return {
    title: settings['general.title'] || 'AISGWB',
    logo: settings['general.logo'] || '',
    supportEmail: settings['general.support_email'] || 'isgwbc@gmail.com',
    contact: settings['general.contact'] || '',
    websiteAddress: settings['general.website_address'] || '',
    websiteUrl: settings['general.website_url'] || 'www.aisgwb.org',
    ticketDescription: settings['general.ticket_description'] || '',
    raw: settings,
  };
}

/**
 * Generate Invoice PDF using dynamic general settings
 */

function registerPdfFonts(doc) {
  const fontDir = path.join(__dirname, '../../../../assets/fonts');
  const regularPath = path.join(fontDir, 'Roboto-Regular.ttf');
  const boldPath = path.join(fontDir, 'Roboto-Bold.ttf');

  if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
    doc.registerFont('AppFont', regularPath);
    doc.registerFont('AppFont-Bold', boldPath);
    return { regular: 'AppFont', bold: 'AppFont-Bold' };
  }

  const altDir = path.join(process.cwd(), 'src', 'assets', 'fonts');
  const altReg = path.join(altDir, 'Roboto-Regular.ttf');
  const altBold = path.join(altDir, 'Roboto-Bold.ttf');
  if (fs.existsSync(altReg) && fs.existsSync(altBold)) {
    doc.registerFont('AppFont', altReg);
    doc.registerFont('AppFont-Bold', altBold);
    return { regular: 'AppFont', bold: 'AppFont-Bold' };
  }

  if (process.platform === 'win32') {
    const winArial = 'C:/Windows/Fonts/arial.ttf';
    const winArialBold = 'C:/Windows/Fonts/arialbd.ttf';
    if (fs.existsSync(winArial) && fs.existsSync(winArialBold)) {
      doc.registerFont('AppFont', winArial);
      doc.registerFont('AppFont-Bold', winArialBold);
      return { regular: 'AppFont', bold: 'AppFont-Bold' };
    }
  }

  return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
}

function generateInvoicePdf(outputPath, { booking, transaction, event, user, logoPathOrBuffer, settings }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const fonts = registerPdfFonts(doc);
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // 1. Logo
      if (logoPathOrBuffer) {
        try {
          doc.image(logoPathOrBuffer, 40, 40, { width: 75, height: 75, fit: [75, 75] });
        } catch (e) {}
      } else {
        const fallbackLogo = path.join(process.cwd(), 'public', 'images', 'logo.png');
        if (fs.existsSync(fallbackLogo)) {
          try {
            doc.image(fallbackLogo, 40, 40, { width: 75, height: 75, fit: [75, 75] });
          } catch (e) {}
        }
      }

      // 2. Status Badge & Invoice #
      const status = transaction?.status || booking.paymentStatus || 'Completed';
      const isSuccess = ['Success', 'Completed', 'Free'].includes(status);
      const isPending = ['Processing', 'Pending'].includes(status);

      const badgeBg = isSuccess ? '#dcfce7' : isPending ? '#fef08a' : '#fee2e2';
      const badgeColor = isSuccess ? '#166534' : isPending ? '#854d0e' : '#991b1b';

      doc.roundedRect(445, 40, 110, 22, 4).fill(badgeBg);
      doc
        .fillColor(badgeColor)
        .fontSize(10)
        .font(fonts.bold)
        .text(status, 445, 46, { width: 110, align: 'center' });

      const invoiceRef = transaction?.transactionRef || String(booking._id).slice(-8).toUpperCase();
      doc
        .fillColor('#1f2937')
        .fontSize(14)
        .font(fonts.bold)
        .text(`Invoice #${invoiceRef}`, 300, 72, { width: 255, align: 'right' });

      // 3. Booked By & Invoice Date
      let y = 130;
      doc.fillColor('#6b7280').fontSize(9).font(fonts.regular).text('BOOKED BY', 40, y);
      const customerName =
        `${booking.billingInfo?.firstName || ''} ${booking.billingInfo?.lastName || ''}`.trim() ||
        user?.name ||
        user?.fullName ||
        'N/A';
      doc
        .fillColor('#1f2937')
        .fontSize(11)
        .font(fonts.bold)
        .text(customerName, 40, y + 14);
      doc
        .fillColor('#6b7280')
        .fontSize(9.5)
        .font(fonts.regular)
        .text(`Email: ${booking.billingInfo?.email || user?.email || 'N/A'}`, 40, y + 30);
      doc.text(`Phone: ${booking.billingInfo?.phone || user?.phone || user?.mobile || 'N/A'}`, 40, y + 45);

      const invoiceDate = formatDate(booking.createdAt || new Date());
      doc.fillColor('#6b7280').fontSize(9).text('INVOICE DATE', 400, y, { width: 155, align: 'right' });
      doc
        .fillColor('#1f2937')
        .fontSize(11)
        .font(fonts.bold)
        .text(invoiceDate, 400, y + 14, { width: 155, align: 'right' });

      // 4. Event Title
      y = 205;
      const eventName = transaction?.eventName || event?.title || transaction?.description || 'Event Booking';
      doc.fillColor('#1f2937').fontSize(12).font(fonts.bold).text(`Event: ${eventName}`, 40, y);

      // 5. Table Header
      y = 230;
      doc
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .moveTo(40, y + 22)
        .lineTo(555, y + 22)
        .stroke();

      doc.fillColor('#6b7280').fontSize(9).font(fonts.bold);
      doc.text('#', 40, y + 7, { width: 35 });
      doc.text('TICKET NAME', 75, y + 7, { width: 230 });
      doc.text('QTY', 310, y + 7, { width: 45, align: 'center' });
      doc.text('PRICE', 365, y + 7, { width: 85, align: 'right' });
      doc.text('AMOUNT', 460, y + 7, { width: 95, align: 'right' });

      y += 24;
      let calculatedTotal = 0;
      const tickets = booking.tickets && booking.tickets.length > 0 ? booking.tickets : [];

      if (tickets.length > 0) {
        tickets.forEach((ticket, idx) => {
          const qty = Number(ticket.quantity || 1);
          const price = Number(ticket.price || 0);
          const lineTotal = qty * price;
          calculatedTotal += lineTotal;

          doc
            .strokeColor('#e5e7eb')
            .lineWidth(0.5)
            .moveTo(40, y + 24)
            .lineTo(555, y + 24)
            .stroke();

          doc
            .fillColor('#6b7280')
            .fontSize(9.5)
            .font(fonts.regular)
            .text(String(idx + 1).padStart(2, '0'), 40, y + 7, { width: 35 });

          doc
            .fillColor('#1f2937')
            .font(fonts.bold)
            .text(ticket.ticketName || 'Ticket', 75, y + 7, { width: 230 });

          doc
            .fillColor('#1f2937')
            .font(fonts.regular)
            .text(String(qty), 310, y + 7, { width: 45, align: 'center' });

          doc.text(formatCurrency(price), 365, y + 7, { width: 85, align: 'right' });
          doc.text(formatCurrency(lineTotal), 460, y + 7, { width: 95, align: 'right' });

          y += 28;
        });
      } else {
        const qty = 1;
        const price = Number(booking.totalAmount || 0);
        doc
          .strokeColor('#e5e7eb')
          .lineWidth(0.5)
          .moveTo(40, y + 24)
          .lineTo(555, y + 24)
          .stroke();

        doc
          .fillColor('#6b7280')
          .fontSize(9.5)
          .font(fonts.regular)
          .text('01', 40, y + 7, { width: 35 });
        doc
          .fillColor('#1f2937')
          .font(fonts.bold)
          .text(eventName, 75, y + 7, { width: 230 });
        doc
          .fillColor('#1f2937')
          .font(fonts.regular)
          .text(String(qty), 310, y + 7, { width: 45, align: 'center' });
        doc.text(formatCurrency(price), 365, y + 7, { width: 85, align: 'right' });
        doc.text(formatCurrency(price), 460, y + 7, { width: 95, align: 'right' });
        y += 28;
      }

      // 6. Subtotal & Total Amount
      y += 15;
      const totalAmount = booking.totalAmount !== undefined ? booking.totalAmount : calculatedTotal;
      const formattedAmount = formatCurrency(totalAmount);

      doc.fillColor('#4b5563').fontSize(9.5).font(fonts.regular).text('Subtotal', 365, y);
      doc.text(formattedAmount, 460, y, { width: 95, align: 'right' });

      y += 18;
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(365, y).lineTo(555, y).stroke();
      y += 8;

      doc.fillColor('#1f2937').fontSize(11).font(fonts.bold).text('Total Amount', 365, y);
      doc.text(formattedAmount, 460, y, { width: 95, align: 'right' });

      // 7. Note Box (using general.support_email and general.contact)
      y += 35;
      doc.roundedRect(40, y, 515, 30, 4).fill('#f8fafc');
      let noteQuery = `Note: For any queries, please contact ${settings?.supportEmail || 'isgwbc@gmail.com'}`;
      doc
        .fillColor('#6b7280')
        .fontSize(8.5)
        .font(fonts.regular)
        .text(noteQuery, 50, y + 9, { width: 495 });

      // 8. Warm Regards Footer (using general.title)
      doc
        .fillColor('#1f2937')
        .fontSize(9.5)
        .font(fonts.bold)
        .text('Thank you for being a part of this event!', 40, y, { width: 515, align: 'right' });
      doc.text(`warm regards,\n${settings?.title || 'AISGWB'}`, 40, y + 16, { width: 515, align: 'right' });

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate Ticket Pass PDF using dynamic general settings
 */
async function generateTicketPdf(outputPath, { attendee, event, booking, user, logoPathOrBuffer, settings }) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 25, size: 'A5', layout: 'portrait' });
      const fonts = registerPdfFonts(doc);
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        (settings?.websiteUrl
          ? settings.websiteUrl.startsWith('http')
            ? settings.websiteUrl
            : `https://${settings.websiteUrl}`
          : 'https://booking.aisgwb.org');
      const attendeeId = attendee._id || attendee.id || 'temp';
      const eventId = event?._id || event?.id || '';
      const ticketId = attendee.ticketId?._id || attendee.ticketId || '';
      const qrUrlData = `${baseUrl}/admin/attendees/scanner?eventId=${eventId}&attendeeId=${attendeeId}&ticketId=${ticketId}`;

      const qrBuffer = await QRCode.toBuffer(qrUrlData, {
        width: 130,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });

      // Outer border
      doc.rect(15, 15, 390, 565).stroke('#dce1e8');

      // Header
      let headerLeft = 25;
      if (logoPathOrBuffer) {
        try {
          doc.image(logoPathOrBuffer, headerLeft, 25, { width: 55, height: 60, fit: [55, 60] });
          headerLeft = 90;
        } catch (e) {}
      } else {
        const fallbackLogo = path.join(process.cwd(), 'public', 'images', 'logo.png');
        if (fs.existsSync(fallbackLogo)) {
          try {
            doc.image(fallbackLogo, headerLeft, 25, { width: 55, height: 60, fit: [55, 60] });
            headerLeft = 90;
          } catch (e) {}
        }
      }

      const eventTitle = event?.title || 'Event Title';
      doc
        .fillColor('#062d72')
        .fontSize(11)
        .font(fonts.bold)
        .text(eventTitle, headerLeft, 26, { width: 390 - headerLeft });

      const eventVenue = event?.venueLocation || event?.venue || 'Venue TBD';
      doc
        .fillColor('#2f2f2f')
        .fontSize(8.5)
        .font(fonts.bold)
        .text(`Venue: ${eventVenue}`, headerLeft, 46, { width: 390 - headerLeft });

      const startStr = formatDate(event?.startDate);
      const endStr = formatDate(event?.endDate);
      const startTime = event?.startTime || '10:00 AM';
      const endTime = event?.endTime || '06:00 PM';
      const eventDateStr = `${startStr} - ${endStr} @ ${startTime} - ${endTime}`;
      doc
        .fillColor('#2f2f2f')
        .fontSize(8.5)
        .font(fonts.bold)
        .text(eventDateStr, headerLeft, 60, { width: 390 - headerLeft });

      doc.strokeColor('#dce1e8').lineWidth(1).dash(4, { space: 3 }).moveTo(25, 92).lineTo(395, 92).undash().stroke();

      // Details
      let y = 105;
      const bookedBy =
        `${booking?.billingInfo?.firstName || ''} ${booking?.billingInfo?.lastName || ''}`.trim() ||
        user?.name ||
        'N/A';
      doc.fillColor('#303848').fontSize(7.5).font(fonts.bold).text('BOOKED BY :', 25, y);
      doc.fillColor('#2f2f2f').fontSize(7.5).font(fonts.regular).text(bookedBy, 105, y, { width: 90 });

      doc
        .fillColor('#303848')
        .font(fonts.bold)
        .text('TYPE :', 25, y + 20);
      doc
        .fillColor('#2f2f2f')
        .font(fonts.regular)
        .text(attendee.ticketName || attendee.ticketId?.ticketName || 'General', 105, y + 20, { width: 90 });

      doc
        .fillColor('#303848')
        .font(fonts.bold)
        .text('PAYMENT STATUS :', 25, y + 40);
      const payStatus = attendee.paymentStatus || booking?.paymentStatus || 'Completed';
      doc
        .fillColor('#166534')
        .font(fonts.bold)
        .text(payStatus, 105, y + 40, { width: 90 });

      doc
        .fillColor('#303848')
        .font(fonts.bold)
        .text('ATTENDEE :', 25, y + 60);
      doc
        .fillColor('#062d72')
        .font(fonts.bold)
        .text(attendee.name || 'N/A', 105, y + 60, { width: 90 });

      // Column 2
      doc.fillColor('#303848').font(fonts.bold).text('MEMBERSHIP ID :', 205, y);
      doc
        .fillColor('#2f2f2f')
        .font(fonts.regular)
        .text(user?.memberId || 'N/A', 285, y, { width: 45 });

      doc
        .fillColor('#303848')
        .font(fonts.bold)
        .text('PRICE :', 205, y + 20);
      const priceVal = attendee.ticketPrice !== undefined ? attendee.ticketPrice : attendee.ticketId?.ticketPrice;
      const priceText = priceVal == 0 || !priceVal ? 'FREE' : `₹ ${priceVal}`;
      doc
        .fillColor('#2f2f2f')
        .font(fonts.regular)
        .text(priceText, 285, y + 20, { width: 45 });

      doc
        .fillColor('#303848')
        .font(fonts.bold)
        .text('STATUS :', 205, y + 40);
      doc
        .fillColor('#2f2f2f')
        .font(fonts.regular)
        .text(attendee.ticketStatus || 'Unused', 285, y + 40, { width: 45 });

      if (attendee.age) {
        doc
          .fillColor('#303848')
          .font(fonts.bold)
          .text('AGE :', 205, y + 60);
        doc
          .fillColor('#2f2f2f')
          .font(fonts.regular)
          .text(String(attendee.age), 285, y + 60, { width: 45 });
      }
      if (attendee.relation) {
        doc
          .fillColor('#303848')
          .font(fonts.bold)
          .text('RELATION :', 205, y + 80);
        doc
          .fillColor('#2f2f2f')
          .font(fonts.regular)
          .text(String(attendee.relation), 285, y + 80, { width: 45 });
      }

      // QR box
      const qrBoxX = 330;
      const qrBoxY = y - 5;
      doc.roundedRect(qrBoxX, qrBoxY, 65, 82, 4).fill('#ffffff').stroke('#d8dde5');
      doc.image(qrBuffer, qrBoxX + 3, qrBoxY + 3, { width: 59, height: 59 });
      doc
        .fillColor('#303848')
        .fontSize(6)
        .font(fonts.bold)
        .text('SCAN QR CODE', qrBoxX, qrBoxY + 65, { width: 65, align: 'center' });

      // Notice section (using general.ticket_description)
      y = 225;
      doc.strokeColor('#dce1e8').lineWidth(1).dash(4, { space: 3 }).moveTo(25, y).lineTo(395, y).undash().stroke();
      y += 8;

      if (settings?.ticketDescription) {
        const tDesc = String(settings.ticketDescription).trim();
        doc
          .fillColor('#92400e')
          .fontSize(6.5)
          .font(fonts.regular)
          .text(tDesc, 25, y, { width: 370, align: 'center', height: 42, ellipsis: true });
        y += 45;
      } else {
        doc
          .fillColor('#303848')
          .fontSize(7.5)
          .font(fonts.bold)
          .text('Please carry this ticket pass with QR code on your phone or printout to the venue entrance.', 25, y, {
            width: 370,
            align: 'center',
          });
        y += 20;
      }

      // Footer info (using general.title, general.website_address, general.contact, general.support_email, general.website_url)
      const footerLines = [`${settings?.title || 'AISGWB'} - Official Event Admission Pass`];
      if (settings?.websiteAddress) {
        footerLines.push(settings.websiteAddress);
      }
      const contactParts = [];
      if (settings?.contact) contactParts.push(`Contact: ${settings.contact}`);
      if (settings?.supportEmail) contactParts.push(`Email: ${settings.supportEmail}`);
      if (settings?.websiteUrl) contactParts.push(`Website: ${settings.websiteUrl}`);
      if (contactParts.length > 0) {
        footerLines.push(contactParts.join(' | '));
      }

      doc
        .fillColor('#2f2f2f')
        .fontSize(6)
        .font(fonts.regular)
        .text(footerLines.join('\n'), 25, y, { width: 370, align: 'center' });

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
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

    const bookingIds = bookings.map((b) => b._id);
    const usedAttendees = await Attendee.find(
      { bookingId: { $in: bookingIds }, ticketStatus: 'Used' },
      'bookingId'
    ).lean();
    const usedBookingIds = new Set(usedAttendees.map((a) => a.bookingId.toString()));

    return bookings.map((b) => ({
      ...b,
      hasUsedTickets: usedBookingIds.has(b._id.toString()),
    }));
  },

  async getByEventId(eventId) {
    const bookings = await Booking.find({ eventId })
      .populate('userId', 'name email memberId')
      .populate('tickets.ticketId', 'ticketName ticketPrice')
      .sort({ createdAt: -1 })
      .lean();

    const bookingIds = bookings.map((b) => b._id);
    const usedAttendees = await Attendee.find(
      { bookingId: { $in: bookingIds }, ticketStatus: 'Used' },
      'bookingId'
    ).lean();
    const usedBookingIds = new Set(usedAttendees.map((a) => a.bookingId.toString()));

    return bookings.map((b) => ({
      ...b,
      hasUsedTickets: usedBookingIds.has(b._id.toString()),
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

    const attendeeCount = await Attendee.countDocuments({ bookingId: id });
    const usedCount = await Attendee.countDocuments({ bookingId: id, ticketStatus: 'Used' });

    return {
      ...booking,
      attendeeCount,
      usedCount,
      hasUsedTickets: usedCount > 0,
    };
  },

  async create(payload) {
    let calculatedTotal = 0;

    for (let t of payload.tickets) {
      const ticketDb = await Ticket.findById(t.ticketId);
      if (!ticketDb) throw new Error(`Ticket not found: ${t.ticketId}`);

      const isUnderAge = t.ticketName && t.ticketName.includes('(Under');
      const actualPrice = isUnderAge ? 0 : ticketDb.ticketPrice || 0;
      t.price = actualPrice;
      t.ticketName = isUnderAge ? t.ticketName : ticketDb.ticketName;

      if (t.attendees && t.attendees.length !== t.quantity) {
        throw new Error(
          `Number of attendees for ${ticketDb.ticketName} must exactly match the selected quantity of ${t.quantity}`
        );
      }

      calculatedTotal += actualPrice * t.quantity;
    }

    let paymentStatus = payload.paymentStatus || 'Pending';
    if (calculatedTotal === 0) {
      paymentStatus = 'Free';
    }

    const bookingData = {
      ...payload,
      totalAmount: calculatedTotal,
      paymentStatus,
      bookingStatus: 'Confirmed',
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
            paymentStatus:
              savedBooking.paymentStatus === 'Completed' || savedBooking.paymentStatus === 'Free'
                ? 'Success'
                : savedBooking.paymentStatus,
            ticketStatus: 'Unused',
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
      } catch (err) {
        console.error('Error creating transaction:', err);
      }
    }

    return savedBooking;
  },

  async update(id, payload) {
    let calculatedTotal = undefined;

    if (payload.tickets && payload.tickets.length > 0) {
      calculatedTotal = 0;
      for (let t of payload.tickets) {
        const ticketDb = await Ticket.findById(t.ticketId);
        if (ticketDb) {
          const isUnderAge = t.ticketName && t.ticketName.includes('(Under');
          const actualPrice = isUnderAge ? 0 : ticketDb.ticketPrice || 0;
          t.price = actualPrice;
          t.ticketName = isUnderAge ? t.ticketName : ticketDb.ticketName;

          if (t.attendees && t.attendees.length !== t.quantity) {
            throw new Error(
              `Number of attendees for ${ticketDb.ticketName} must exactly match the selected quantity of ${t.quantity}`
            );
          }

          calculatedTotal += actualPrice * t.quantity;
        }
      }
    }

    const updateData = {
      ...payload,
      ...(calculatedTotal !== undefined && { totalAmount: calculatedTotal }),
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
            paymentStatus:
              updatedBooking.paymentStatus === 'Completed' || updatedBooking.paymentStatus === 'Free'
                ? 'Success'
                : updatedBooking.paymentStatus,
            ticketStatus: 'Unused',
          });
        }
      }
    }
    if (attendeesToInsert.length > 0) {
      await Attendee.insertMany(attendeesToInsert);
    }

    return updatedBooking;
  },

  /**
   * Resend booking invoice & tickets with general settings
   */
  async resendInvoice(id, pdfBase64, ticketPdfBase64s) {
    const booking = await this.getById(id);
    if (!booking) throw new Error('Booking not found');

    const totalAmount = Number(booking.totalAmount || 0);
    if (totalAmount === 0) {
      logger.info(`[BookingsService] Booking ${booking._id} has totalAmount == 0. Skipping invoice generation/sending.`);
      return { success: true, message: 'Free booking (₹0.00). No invoice required.', skipped: true };
    }

    // 1. Fetch general settings (general.ticket_description, general.website_url, general.website_address, general.contact, general.support_email, general.title, general.logo)
    const settings = await getGeneralSettings();

    const invoiceDir = path.join(__dirname, '../../../../..', 'public', 'uploads', 'invoices');
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }
    const invoicePath = path.join(invoiceDir, `invoice-${booking._id}.pdf`);

    // Prepare logo buffer/path
    let logoValue = settings.logo;
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

    // 2. Generate or save Invoice PDF
    if (pdfBase64) {
      const base64Data = pdfBase64.replace(/^data:.*?;base64,/, '');
      fs.writeFileSync(invoicePath, base64Data, 'base64');
    } else {
      const transaction = await Transactions.findOne({ bookingId: id }).lean();
      const event = booking.eventId || {};
      const user = booking.userId || {};

      await generateInvoicePdf(invoicePath, {
        booking,
        transaction,
        event,
        user,
        logoPathOrBuffer,
        settings,
      });
    }

    const recipientEmail = booking.billingInfo?.email || booking.userId?.email;
    if (!recipientEmail) {
      if (fs.existsSync(invoicePath)) fs.unlinkSync(invoicePath);
      throw new Error('No recipient email found for this booking');
    }

    const attachments = [{ filename: `invoice-${booking._id}.pdf`, path: invoicePath }];
    const generatedTickets = [];

    try {
      // const ticketsDir = path.join(__dirname, '../../../../..', 'public', 'uploads', 'tickets');
      // if (!fs.existsSync(ticketsDir)) {
      //   fs.mkdirSync(ticketsDir, { recursive: true });
      //   }

      // const attendees = await Attendee.find({ bookingId: id })
      //   .populate('eventId', 'title venue venueLocation startDate endDate startTime endTime')
      //   .populate('ticketId', 'ticketName ticketPrice');

      // // 3. Process Ticket PDFs (either from base64 array or generated dynamically using settings)
      // if (ticketPdfBase64s && ticketPdfBase64s.length > 0) {
      //   for (let i = 0; i < attendees.length; i++) {
      //     if (ticketPdfBase64s[i]) {
      //       const ticketPath = path.join(ticketsDir, `ticket-${attendees[i]._id}.pdf`);
      //       const base64Data = ticketPdfBase64s[i].replace(/^data:.*?;base64,/, '');
      //       fs.writeFileSync(ticketPath, base64Data, 'base64');
      //       attachments.push({ filename: `ticket-${attendees[i]._id}.pdf`, path: ticketPath });
      //       generatedTickets.push(ticketPath);
      //     }
      //   }
      // } else if (attendees && attendees.length > 0) {
      //   // Automatically generate ticket passes using settings if not provided
      //   for (const att of attendees) {
      //     const ticketPath = path.join(ticketsDir, `ticket-${att._id}.pdf`);
      //     await generateTicketPdf(ticketPath, {
      //       attendee: att,
      //       event: att.eventId || booking.eventId,
      //       booking,
      //       user: booking.userId,
      //       logoPathOrBuffer,
      //       settings,
      //     });
      //     attachments.push({ filename: `ticket-${att._id}.pdf`, path: ticketPath });
      //     generatedTickets.push(ticketPath);
      //   }
      // }

      const hasTickets = generatedTickets.length > 0;
      const emailSubject = hasTickets
        ? `Your Booking & Tickets for ${booking.eventId?.title || 'Event'} - ${settings.title}`
        : `Your Invoice for ${booking.eventId?.title || 'Event'} - ${settings.title}`;

      // 4. Construct email body incorporating general settings
      const emailBody = `
        <p>Dear ${booking.billingInfo?.firstName || 'Valued Customer'},</p>
        <p>For any assistance or queries, please reach out to us:</p>
        <ul style="font-size: 13px; color: #555;">
          ${settings.supportEmail ? `<li><strong>Email:</strong> <a href="mailto:${settings.supportEmail}">${settings.supportEmail}</a></li>` : ''}
          ${settings.websiteUrl ? `<li><strong>Website:</strong> <a href="${settings.websiteUrl.startsWith('http') ? settings.websiteUrl : 'https://' + settings.websiteUrl}">${settings.websiteUrl}</a></li>` : ''}
        </ul>
        <p>Warm regards,<br/><strong>${settings.title}</strong></p>
      `;

      await emailService.sendEmail(recipientEmail, emailSubject, emailBody, attachments);

      return { success: true, message: 'Invoice generated and sent successfully' };
    } catch (err) {
      console.error('Email sending failed:', err.message);
      throw err;
    } finally {
      // 5. Clean up temporary files immediately
      for (const ticketPath of generatedTickets) {
        if (fs.existsSync(ticketPath)) {
          fs.unlink(ticketPath, (err) => {
            if (err) console.error('Error deleting ticket PDF:', err);
          });
        }
      }
      if (fs.existsSync(invoicePath)) {
        fs.unlink(invoicePath, (err) => {
          if (err) console.error('Error deleting invoice PDF:', err);
        });
      }
    }
  },

  async resendTicketAndInvoice(id, pdfBase64) {
    return this.resendInvoice(id, pdfBase64);
  },

  async delete(id) {
    const deletedBooking = await Booking.findByIdAndDelete(id);
    if (!deletedBooking) throw new Error('Booking not found');
    await Attendee.deleteMany({ bookingId: id });
    return deletedBooking;
  },
};
