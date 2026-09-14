const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('./logger');
const settingsService = require('../modules/admin/settings/services/settingsService');

module.exports = {
  async sendEmail(to, subject, html, attachments = []) {
    try {
      const emailSentSetting = await settingsService.getByIdOrKey("email_smtp.email_sent");
      const settingEnabled = emailSentSetting?.value;
      const emailEnabled =
        settingEnabled === undefined || settingEnabled === ''
          ? config.mail.enabled
          : !['false', '0', 'no', 'off'].includes(String(settingEnabled).toLowerCase());
      if (!emailEnabled) {
        return;
      }
      const hostSetting = await settingsService.getByIdOrKey('email_smtp.mail_host');
      const portSetting = await settingsService.getByIdOrKey('email_smtp.mail_port');
      const userSetting = await settingsService.getByIdOrKey('email_smtp.mail_user');
      const passSetting = await settingsService.getByIdOrKey('email_smtp.mail_password');
      const fromSetting = await settingsService.getByIdOrKey('email_smtp.mail_from');
      const smtpSecure = await settingsService.getByIdOrKey('email_smtp.smtp_secure');

      const host = hostSetting?.value || config.mail.host;
      const port = Number(portSetting?.value) || config.mail.port;
      const user = userSetting?.value || config.mail.user;
      const pass = passSetting?.value || config.mail.pass;
      const from = fromSetting?.value || config.mail.from || user;
      let secure = smtpSecure?.value !== undefined ? smtpSecure.value : config.mail.secure;
      // parse string boolean
      if (typeof secure === 'string') {
        secure = secure === 'true' || secure === '1' || secure.toLowerCase() === 'tls' || secure.toLowerCase() === 'ssl';
      }
      
      // enforce standard secure ports just in case config is misconfigured
      if (port === 465) secure = true;
      else if (port === 587) secure = false;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });

      const mailOptions = {
        from,
        to,
        subject,
        html,
      };

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error(`Email error: ${error.message}`);
      throw error;
    }
  },
};