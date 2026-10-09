const logger = require('./logger');
const http = require('http');
const https = require('https');

const smsService = {
  /**
   * Send an SMS message using the configured SMS_API_URI.
   * 
   * @param {string} mobile - The destination mobile number
   * @param {string} message - The SMS content
   * @param {string} [templateId] - Optional DLT template ID
   * @returns {Promise<any>}
   */
  async sendSms(mobile, message, templateId) {
    return new Promise((resolve, reject) => {
      try {
        let apiUrl = process.env.SMS_API_URI;
        
        if (!apiUrl) {
          logger.warn(`[SMS STUB] SMS_API_URI not configured. OTP for ${mobile}: ${message}`);
          return resolve({ success: true, message: 'SMS simulated (No API URI)' });
        }

        // Inject number into URL (replace placeholder if present, else append)
        if (apiUrl.includes('number=')) {
          apiUrl = apiUrl.replace('number=', `number=${encodeURIComponent(mobile)}`);
        } else {
          apiUrl += `&number=${encodeURIComponent(mobile)}`;
        }

        // Inject message into URL
        if (apiUrl.includes('message=')) {
          apiUrl = apiUrl.replace('message=', `message=${encodeURIComponent(message)}`);
        } else {
          apiUrl += `&message=${encodeURIComponent(message)}`;
        }

        // Inject DLT templateId if provided
        if (templateId) {
          apiUrl += `&template_id=${templateId}`;
        }

        const protocol = apiUrl.startsWith('https') ? https : http;

        logger.info(`[SMS] Sending to ${mobile} via API: ${apiUrl}`);
        
        const req = protocol.get(apiUrl, (resp) => {
          let data = '';
          resp.on('data', (chunk) => { data += chunk; });
          resp.on('end', () => {
            logger.info(`[SMS] API response for ${mobile}: ${data}`);
            resolve({ success: true, data });
          });
        });

        // 10-second timeout so it doesn't hang the server
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('SMS API request timed out after 10 seconds'));
        });

        req.on('error', (err) => {
          logger.error(`[SMS] Request error for ${mobile}: ${err.message}`);
          reject(err);
        });

      } catch (error) {
        logger.error(`[SMS] Unexpected error: ${error.message}`);
        reject(error);
      }
    });
  },

  /**
   * Alias method for sendSms
   */
  async smsSend(mobile, message, templateId) {
    return this.sendSms(mobile, message, templateId);
  }
};

module.exports = smsService;
