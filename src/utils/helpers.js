const crypto = require('crypto');

module.exports = {
  hashString(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  },

  randomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  },

  formatPagination(page = 1, limit = 10) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(100, limit));
    return { page, limit, skip: (page - 1) * limit };
  },

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  calculateTotal(items) {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },
};