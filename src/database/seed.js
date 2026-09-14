const logger = require('../services/logger');
const { connectDB } = require('./connection');

async function seed() {
  await connectDB();
  logger.info('Running seeders...');

  // Add your seeder logic here

  logger.info('Seeders completed!');
  process.exit(0);
}

seed().catch((error) => {
  logger.error('Seeder error:', error);
  process.exit(1);
});