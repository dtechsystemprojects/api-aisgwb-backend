const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../modules/admin/users/models/usersModel');

module.exports = async (req, res, next) => {
  try {
    // Get Authorization Header
    const authHeader = req.headers.authorization;

    // Check if header exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token is required.',
      });
    }

    // Check Bearer Token format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format. Use: Bearer <token>',
      });
    }

    // Extract Token
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token not provided.',
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.jwt.secret);

    // Find Admin User
    const adminUser = await User.findById(decoded.id);

    if (!adminUser) {
      return res.status(401).json({
        success: false,
        message: 'This user account not found.',
      });
    }

    // Check Active Status
    if (!adminUser.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact administrator.',
      });
    }

    // Attach User to Request
    req.admin = adminUser;

    next();
  } catch (error) {
    // Token Expired
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.',
      });
    }

    // Invalid Token
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
