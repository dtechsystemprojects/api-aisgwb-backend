const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../services/logger');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    logger.info('Already connected to MongoDB');
    return;
  }

  try {
    let uri;

    if (config.database.uri) {
      uri = config.database.uri;
    } else if (config.database.user && config.database.pass) {
      uri = `mongodb://${config.database.user}:${config.database.pass}@${config.database.host}:${config.database.port}/${config.database.name}`;
    } else {
      uri = `mongodb://${config.database.host}:${config.database.port}/${config.database.name}`;
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    logger.info('✅ MongoDB connected');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('✅ MongoDB disconnected');
  } catch (error) {
    logger.error('❌ MongoDB disconnection error:', error.message);
  }
};

module.exports = { connectDB, disconnectDB };
