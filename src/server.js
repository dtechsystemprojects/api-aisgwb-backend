const app = require('./app');
const config = require('./config');
const logger = require('./services/logger');
const mongoose = require('mongoose');

require('dotenv').config();

const PORT = Number(process.env.PORT || config.app.port || 3000);

// ========================================
// START SERVER FIRST
// ========================================

app.listen(PORT, '0.0.0.0', () => {

    console.log('====================================');
    console.log('AISGWB SERVER STARTED');
    console.log('PORT:', PORT);
    console.log('====================================');

    // Connect MongoDB AFTER listen()
    connectMongoDB();
});

// ========================================
// MONGODB
// ========================================

async function connectMongoDB() {

    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        logger.error('❌ MONGODB_URI is not configured');
        return;
    }
    logger.info('✅ MongoDB connected successfully');

    try {

        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000
        });

        logger.info('✅ MongoDB connected successfully');

    } catch (error) {

        logger.error('❌ MongoDB connection error:', error.message);

    }
}
