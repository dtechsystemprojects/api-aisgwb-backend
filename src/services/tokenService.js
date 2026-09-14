const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = {
  generateToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiry,
    });
  },

  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  },

  decodeToken(token) {
    return jwt.decode(token);
  },
};