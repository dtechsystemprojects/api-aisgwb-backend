const app = require('./app');
const config = require('./config');
const logger = require('./services/logger');
const { connectDB } = require('./database/connection');

const PORT = config.app.port || 3000;
const NODE_ENV = config.app.env;

(async () => {
  try {
    // Connect MongoDB first
    await connectDB();

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT} in ${NODE_ENV} mode`);

      logger.info(`📍 http://localhost:${PORT}`);
    });

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received');

      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (err) {
    logger.error('Server startup failed:', err);
    process.exit(1);
  }
})();
