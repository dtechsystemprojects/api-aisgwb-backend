const Razorpay = require('razorpay');
const crypto = require('crypto');
const Settings = require('../../../admin/settings/models/settingsModel');
const Membership = require('../../../admin/memberships/models/membershipsModel');
const Transactions = require('../../../admin/transactions/models/transactionsModel');
const PDFDocument = require('pdfkit');
const emailService = require('../../../../services/emailService');
const { BaseController } = require('../../../../core');

class MembershipsController extends BaseController {
  constructor() {
    super();
    this.getAllMemberships = this.getAllMemberships.bind(this);
    this.getById = this.getById.bind(this);
    this.getSettings = this.getSettings.bind(this);
    this.applyMembership = this.applyMembership.bind(this);
    this.getRazorpayKeys = this.getRazorpayKeys.bind(this);
  }

  async getAllMemberships(req, res) {
    try {
      const memberships = await Membership.find().sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: memberships });
    } catch (error) {
      console.error('Error fetching memberships:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch memberships', error: error.message });
    }
  }
  async getById(req, res) {
    try {
      // find membership by userId
      const { userId } = req.params;
      const data = await Membership.findOne({ userId }).sort({ _id: -1, createdAt: -1 });
      if (!data) return this.error(res, 'Membership not found', 404);
      this.success(res, data, 'Membership fetched successfully');
    } catch (error) {
      this.error(res, error.message, 500);
    }
  }

  async getRazorpayKeys(reqBody) {
    let key_id = reqBody?.key_id || process.env.RAZORPAY_KEY_ID || '';
    let key_secret = reqBody?.key_secret || process.env.RAZORPAY_KEY_SECRET || '';

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
      } catch (err) {
        console.log('Could not fetch razorpay keys from settings.', err);
      }
    }
    return { key_id, key_secret };
  }

  async getSettings(req, res) {
    try {
      const feeSetting = await Settings.findOne({ key: 'general.membership_amount' });
      const fee = feeSetting && feeSetting.value ? parseFloat(feeSetting.value) : 5000;

      res.status(200).json({ success: true, amount: fee });
    } catch (error) {
      console.error('Error fetching membership settings:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch membership settings', error: error.message });
    }
  }

  async applyMembership(req, res) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, membershipData, transactionData } = req.body;

      const { key_secret } = await this.getRazorpayKeys(req.body);

      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto.createHmac('sha256', key_secret).update(body.toString()).digest('hex');

      const isAuthentic = expectedSignature === razorpay_signature;

      if (!isAuthentic) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }

      const membership = new Membership({
        ...membershipData,
        stateMembershipId: 'STATE-' + Math.floor(100000 + Math.random() * 900000),
        paymentStatus: 'Completed',
        status: 'Pending',
        userId: req.user._id,
      });
      const savedMembership = await membership.save();

      const transaction = new Transactions({
        ...transactionData,
        type: 'MEMBERSHIP',
        userId: req.user._id,
        transactionRef: razorpay_payment_id,
        status: 'Success',
      });
      await transaction.save();

      // Send Email asynchronously
      (async () => {
        try {
          const emailSubject = 'Your Life Time Membership Application Confirmation';
          const emailHtml = `
            <h3>Hello ${membershipData.name},</h3>
            <p>Thank you for applying for the Life Time Membership!</p>
            <p>Your payment of Rs. ${membershipData.amount} was successful.</p>
            <p>Your application is currently under review by our admins. You will be notified once it is approved.</p>
            <br>
            <p>Best Regards,<br>AISGWB Team</p>
          `;

          await emailService.sendEmail(membershipData.email, emailSubject, emailHtml);
          console.log('Confirmation email sent to: ', membershipData.email);
        } catch (emailErr) {
          console.error('Error sending membership confirmation email: ', emailErr);
        }
      })();

      res.status(200).json({
        success: true,
        message: 'Membership applied successfully. Waiting for admin approval.',
        membershipId: savedMembership._id,
      });
    } catch (error) {
      console.error('Membership application error:', error);
      res.status(500).json({ success: false, message: 'Membership application failed', error: error.message });
    }
  }

  async applyMembershipPdf(req, res) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, membershipData, transactionData } = req.body;

      const { key_secret } = await this.getRazorpayKeys(req.body);

      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto.createHmac('sha256', key_secret).update(body.toString()).digest('hex');

      const isAuthentic = expectedSignature === razorpay_signature;

      if (!isAuthentic) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
      }

      const membership = new Membership({
        ...membershipData,
        stateMembershipId: 'STATE-' + Math.floor(100000 + Math.random() * 900000),
        paymentStatus: 'Completed',
        status: 'Pending',
        userId: req.user._id,
      });
      const savedMembership = await membership.save();

      const transaction = new Transactions({
        ...transactionData,
        type: 'MEMBERSHIP',
        userId: req.user._id,
        transactionRef: razorpay_payment_id,
        status: 'Success',
      });
      await transaction.save();

      // ==========================================
      // Generate PDF Invoice
      // ==========================================
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      // PDF Content
      doc.fontSize(20).text('Invoice - Life Time Membership', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('Payment ID: ' + razorpay_payment_id);
      doc.text('Order ID: ' + razorpay_order_id);
      doc.text('Date: ' + new Date().toLocaleString());
      doc.moveDown();
      doc.text('Name: ' + membershipData.name);
      doc.text('Email: ' + membershipData.email);
      doc.text('Phone: ' + membershipData.phone);
      doc.moveDown();
      doc.fontSize(14).text('Total Amount Paid: Rs. ' + membershipData.amount, { underline: true });
      doc.end();

      doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);

        // Send Email with PDF
        const emailSubject = 'Your Life Time Membership Application Invoice';
        const emailHtml = `
          <h3>Hello ${membershipData.name},</h3>
          <p>Thank you for applying for the Life Time Membership!</p>
          <p>Your payment of Rs. ${membershipData.amount} was successful.</p>
          <p>Your application is currently under review by our admins. You will be notified once it is approved.</p>
          <p>Please find your payment invoice attached below.</p>
          <br>
          <p>Best Regards,<br>AISGWB Team</p>
        `;

        try {
          await emailService.sendEmail(membershipData.email, emailSubject, emailHtml, [
            {
              filename: `Invoice_${razorpay_payment_id}.pdf`,
              content: pdfData,
            },
          ]);
          console.log('Confirmation email sent to: ', membershipData.email);
        } catch (emailErr) {
          console.error('Error sending membership confirmation email: ', emailErr);
        }
      });

      res.status(200).json({
        success: true,
        message: 'Membership applied successfully. Waiting for admin approval.',
        membershipId: savedMembership._id,
      });
    } catch (error) {
      console.error('Membership application error:', error);
      res.status(500).json({ success: false, message: 'Membership application failed', error: error.message });
    }
  }
}

module.exports = new MembershipsController();
