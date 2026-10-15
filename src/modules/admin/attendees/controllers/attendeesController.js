const Attendee = require('../models/attendeesModel');
const settingsService = require('../../settings/services/settingsService');
const logger = require('../../../../services/logger');
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
    client
      .get(url, (res) => {
        const data = [];
        res.on('data', (chunk) => data.push(chunk));
        res.on('end', () => resolve(Buffer.concat(data)));
      })
      .on('error', reject);
  });
}

function formatDate(date) {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
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
    'general.under_age',
  ];
  const settings = {};
  const allSettings = await settingsService.getAll();
  allSettings.forEach((setting) => {
    const key = String(setting.key || '').replace(/^setting\(['"]?(.+?)['"]?\)$/, '$1');
    if (settingKeys.includes(key)) {
      settings[key] = setting.value;
    }
  });
  return {
    title: settings['general.title'] || 'AISGWB',
    logo: settings['general.logo'] || '',
    supportEmail: settings['general.support_email'] || '',
    contact: settings['general.contact'] || '',
    websiteAddress: settings['general.website_address'] || '',
    websiteUrl: settings['general.website_url'] || 'www.aisgwb.org',
    ticketDescription: settings['general.ticket_description'] || '',
    underAge: settings['general.under_age'] || '10',
    raw: settings,
  };
}

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

async function generateTicketPdf(outputPath, { attendee, event, booking, user, logoPathOrBuffer, settings }) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 0, size: [800, 500] });
      const fonts = registerPdfFonts(doc);
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.BASE_URL ||
        (settings?.websiteUrl
          ? settings.websiteUrl.startsWith('http')
            ? settings.websiteUrl
            : `https://${settings.websiteUrl}`
          : 'https://booking.aisgwb.org');
      const normalizedBaseUrl = String(baseUrl).replace(/\/+$/, '');
      const attendeeId = attendee._id || attendee.id || 'temp';
      const eventId = event?._id || event?.id || '';
      const ticketId = attendee.ticketId?._id || attendee.ticketId || '';
      const qrUrlData = `${normalizedBaseUrl}/admin/attendees/scanner?eventId=${eventId}&attendeeId=${attendeeId}&ticketId=${ticketId}`;

      const qrBuffer = await QRCode.toBuffer(qrUrlData, {
        width: 180,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });

      doc.rect(1, 1, 798, 498).lineWidth(1).stroke('#303030');

      // 1. Header (Logo + Event Title, Venue, Date)
      const logoX = 40;
      const logoY = 20;
      let headerLeft = logoX;

      if (logoPathOrBuffer) {
        try {
          doc.image(logoPathOrBuffer, logoX, logoY, { width: 52, height: 78, fit: [52, 78] });
          headerLeft = logoX + 66;
        } catch (e) {}
      } else {
        const fallbackLogo = path.join(process.cwd(), 'public', 'images', 'logo.png');
        if (fs.existsSync(fallbackLogo)) {
          try {
            doc.image(fallbackLogo, logoX, logoY, { width: 52, height: 78, fit: [52, 78] });
            headerLeft = logoX + 66;
          } catch (e) {}
        }
      }

      const textWidth = 760 - headerLeft;
      const eventTitle = event?.title || 'Event Title';
      let titleFontSize = 17;
      doc.font(fonts.bold);
      while (titleFontSize > 12 && doc.fontSize(titleFontSize).widthOfString(eventTitle) > textWidth) {
        titleFontSize -= 0.5;
      }
      doc
        .fillColor('#062d72')
        .fontSize(titleFontSize)
        .font(fonts.bold)
        .text(eventTitle, headerLeft, 34, { width: textWidth, height: 22, ellipsis: true });

      const eventVenue = event?.venueLocation || event?.venue || 'Venue TBD';
      doc
        .fillColor('#2f2f2f')
        .fontSize(13)
        .font(fonts.bold)
        .text(`Venue: ${eventVenue}`, headerLeft, 59, { width: textWidth, height: 17, ellipsis: true });

      const startStr = formatDate(event?.startDate);
      const endStr = formatDate(event?.endDate);
      const startTime = event?.startTime || '10:00 AM';
      const endTime = event?.endTime || '06:00 PM';
      const eventDateStr = `${startStr} - ${endStr} @ ${startTime} - ${endTime}`;
      doc
        .fillColor('#2f2f2f')
        .fontSize(13)
        .font(fonts.bold)
        .text(eventDateStr, headerLeft, 78, { width: textWidth, height: 17, ellipsis: true });

      // Dashed separator line below header
      const sep1Y = 115;
      doc
        .strokeColor('#dce1e8')
        .lineWidth(1)
        .dash(3, { space: 2 })
        .moveTo(40, sep1Y)
        .lineTo(760, sep1Y)
        .undash()
        .stroke();

      // 2. Details Section
      const detailsY = 142;
      const col1X = 40;
      const col1ValX = 178;
      const col2X = 335;
      const col2ValX = 475;

      const bookedBy =
        `${booking?.billingInfo?.firstName || ''} ${booking?.billingInfo?.lastName || ''}`.trim() ||
        user?.name ||
        'N/A';

      const rawTicketName = attendee.ticketName || attendee.ticketId?.ticketName || 'General';
      const cleanBaseTicketName = rawTicketName.replace(/\s*\(Under\s*\d+[^)]*\)/gi, '').trim();
      const underAgeLimit = parseInt(settings?.underAge || '10') || 10;
      const isUnderAge =
        (attendee.ticketPrice === 0 || !attendee.ticketPrice) &&
        attendee.age &&
        !isNaN(parseInt(attendee.age)) &&
        (cleanBaseTicketName.toLowerCase().includes('accompanying') || rawTicketName.toLowerCase().includes('accompanying'));
      const safeTicketName = isUnderAge ? `${cleanBaseTicketName} (Under ${underAgeLimit})` : rawTicketName;
      const ticketTypeText = String(safeTicketName || 'N/A');
      let ticketTypeFontSize = 13;
      doc.font(fonts.regular);
      while (ticketTypeFontSize > 8) {
        doc.fontSize(ticketTypeFontSize);
        if (doc.heightOfString(ticketTypeText, { width: 154, lineGap: 0 }) <= 40) {
          break;
        }
        ticketTypeFontSize -= 0.5;
      }
      const drawDetail = (label, value, labelX, valueX, y, valueWidth, labelWidth = 130) => {
        doc
          .fillColor('#303848')
          .fontSize(13)
          .font(fonts.bold)
          .text(label, labelX, y, { width: labelWidth, height: 20, ellipsis: true });
        doc
          .fillColor('#2f2f2f')
          .fontSize(13)
          .font(fonts.regular)
          .text(String(value || 'N/A'), valueX, y, { width: valueWidth, height: 38, ellipsis: true });
      };

      // Column 1
      const payStatus = attendee.paymentStatus || booking?.paymentStatus || 'Completed';
      drawDetail('BOOKED BY :', bookedBy, col1X, col1ValX, detailsY, 135);
      doc
        .fillColor('#303848')
        .fontSize(13)
        .font(fonts.bold)
        .text('TYPE :', col1X, detailsY + 28, { width: 130 });
      doc
        .fillColor('#2f2f2f')
        .fontSize(ticketTypeFontSize)
        .font(fonts.regular)
        .text(ticketTypeText, col1ValX, detailsY + 28, { width: 154, lineGap: 0 });
      drawDetail('PAYMENT STATUS :', payStatus, col1X, col1ValX, detailsY + 72, 135, 133);
      doc
        .fillColor('#303848')
        .fontSize(13)
        .font(fonts.bold)
        .text('ATTENDEE :', col1X, detailsY + 100, { width: 130 });
      doc
        .fillColor('#2f2f2f')
        .fontSize(13)
        .font(fonts.regular)
        .text(attendee.name || 'N/A', col1ValX, detailsY + 100, { width: 135, height: 38, ellipsis: true });

      // Column 2
      const memberId = user?.memberId || booking?.billingInfo?.memberId || 'N/A';
      const priceVal = attendee.ticketPrice !== undefined ? attendee.ticketPrice : attendee.ticketId?.ticketPrice;
      const priceText = priceVal == 0 || !priceVal ? 'FREE' : `₹ ${Number(priceVal).toLocaleString('en-IN')}`;
      drawDetail('MEMBERSHIP ID :', memberId, col2X, col2ValX, detailsY, 125, 135);
      drawDetail('PRICE :', priceText, col2X, col2ValX, detailsY + 28, 125, 135);
      drawDetail(
        'STATUS :',
        attendee.ticketStatus || attendee.status || 'Unused',
        col2X,
        col2ValX,
        detailsY + 56,
        125,
        135
      );
      if (attendee.age) {
        drawDetail('AGE :', attendee.age, col2X, col2ValX, detailsY + 84, 125, 135);
      }
      if (attendee.relation) {
        drawDetail('RELATION :', attendee.relation, col2X, col2ValX, detailsY + (attendee.age ? 112 : 84), 125, 135);
      }

      // Column 3: QR Box
      const qrBoxX = 620;
      const qrBoxY = detailsY - 5;
      const qrBoxW = 130;
      const qrBoxH = 130;
      doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 4).fillAndStroke('#ffffff', '#d8dde5');
      doc.image(qrBuffer, qrBoxX + 6, qrBoxY + 6, { width: 118, height: 118 });
      doc
        .fillColor('#303848')
        .fontSize(12)
        .font(fonts.bold)
        .text('SCAN QR CODE', qrBoxX, qrBoxY + 143, { width: qrBoxW, align: 'center' });

      // Dashed separator line below details
      const sep2Y = 330;
      doc
        .strokeColor('#dce1e8')
        .lineWidth(1)
        .dash(3, { space: 2 })
        .moveTo(40, sep2Y)
        .lineTo(760, sep2Y)
        .undash()
        .stroke();

      // 3. Notice / Ticket description
      const noticeY = sep2Y + 18;
      const contentWidth = 720;
      let rawNotice = String(
        settings?.ticketDescription ||
          'Please carry this ticket pass with QR code on your phone or printout to the venue entrance.'
      )
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&');

      const noticeLines = rawNotice
        .split(/\r?\n/)
        .map((l) => l.trim().replace(/\s+/g, ' '))
        .filter((l) => l.length > 0 && l !== '.' && l !== '-');

      const ticketDescription = noticeLines.join('\n');
      let noticeFontSize = 11.5;
      doc.font(fonts.bold);
      while (noticeFontSize > 8) {
        doc.fontSize(noticeFontSize);
        if (doc.heightOfString(ticketDescription, { width: contentWidth, align: 'center', lineGap: 2 }) <= 72) {
          break;
        }
        noticeFontSize -= 0.5;
      }
      doc.fillColor('#303848').fontSize(noticeFontSize).font(fonts.bold).text(ticketDescription, 40, noticeY, {
        width: contentWidth,
        height: 75,
        align: 'center',
        lineGap: 2,
      });

      // 4. Footer info
      const footerLines = ['Indian Society of Gastroenterology, West Bengal Chapter'];
      if (settings?.websiteAddress) {
        footerLines.push(settings.websiteAddress);
      }
      const contactParts = [];
      if (settings?.contact) contactParts.push(`Contact No. ${settings.contact}`);
      if (settings?.supportEmail) contactParts.push(`Email: ${settings.supportEmail}`);
      if (settings?.websiteUrl) contactParts.push(`Website: ${settings.websiteUrl}`);
      if (contactParts.length > 0) {
        footerLines.push(contactParts.join(' '));
      }

      doc.fillColor('#555555').fontSize(11.5).font(fonts.regular).text(footerLines.join('\n'), 40, 436, {
        width: contentWidth,
        align: 'center',
        lineGap: 1.5,
        height: 50,
      });

      stream.on('finish', resolve);
      stream.on('error', reject);
      doc.end();
    } catch (err) {
      reject(err);
    }
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
  let ticketPath = null;
  try {
    const { id } = req.params;
    const { ticketPdfBase64 } = req.body || {};

    const attendee = await Attendee.findById(id)
      .populate('eventId', 'title venue venueLocation startDate endDate startTime endTime')
      .populate('ticketId', 'ticketName ticketPrice')
      .populate({
        path: 'bookingId',
        select: 'userId billingInfo totalAmount paymentStatus tickets',
        populate: {
          path: 'userId',
          select: 'name memberId email phone mobile',
        },
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

    const settings = await getGeneralSettings();

    const ticketsDir = path.join(__dirname, '../../../../../public/uploads/tickets');
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }

    ticketPath = path.join(ticketsDir, `ticket-${attendee._id}.pdf`);

    if (ticketPdfBase64) {
      const tBase64Data = ticketPdfBase64.replace(/^data:.*?;base64,/, '');
      fs.writeFileSync(ticketPath, tBase64Data, 'base64');
    } else {
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

      await generateTicketPdf(ticketPath, {
        attendee,
        event: attendee.eventId,
        booking,
        user: booking.userId,
        logoPathOrBuffer,
        settings,
      });
    }

    const attachments = [{ filename: `ticket-${attendee._id}.pdf`, path: ticketPath }];

    const emailSubject = `Your Event Ticket for ${attendee.eventId?.title || 'the Event'} - ${settings.title}`;
    const emailBody = `
      <p>Dear ${attendee.name || 'Attendee'},</p>
      <p>Please find attached your official event admission ticket for <b>${attendee.eventId?.title || 'the Event'}</b>.</p>
      <p>For any queries or assistance ${settings.supportEmail ? `<strong>Email:</strong> <a href="mailto:${settings.supportEmail}">${settings.supportEmail}</a>` : ''} ${settings.websiteUrl ? `<strong>Website:</strong> <a href="${settings.websiteUrl.startsWith('http') ? settings.websiteUrl : 'https://' + settings.websiteUrl}">${settings.websiteUrl}</a>` : ''}</p>
      <p>Warm regards,<br/><strong>${settings.title}</strong></p>
    `;

    await emailService.sendEmail(email, emailSubject, emailBody, attachments);

    return res.status(200).json({ success: true, message: 'Ticket emailed successfully to ' + email });
  } catch (error) {
    logger.error('Error resending ticket:', error);
    if (res.headersSent) return;
    return res.status(500).json({ success: false, message: 'Failed to send ticket: ' + error.message });
  } finally {
    if (ticketPath && fs.existsSync(ticketPath)) {
      fs.unlink(ticketPath, (err) => {
        if (err) console.error('Error deleting ticket PDF:', err);
      });
    }
  }
};
