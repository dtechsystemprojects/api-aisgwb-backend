const crypto = require('crypto');

const requestId = (req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  next();
};

module.exports = {
  requestId,
  authenticate: require('./auth'),
  permission: require('./permission'),
  tokenAuth: require('./tokenAuth'),
  validate: require('./validator'),
};
