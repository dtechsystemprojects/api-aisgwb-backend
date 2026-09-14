
const config = require('./config');
const logger = require('./services/logger');


require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');

const app = express();

const PORT = Number(process.env.PORT || process.env.APP_PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// HEALTH CHECK
// ========================================

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'AISGWB Node.js server is running'
    });
    logger.info('✅ AISGWB Node.js server is running');
    logger.info(`📍 api.aisgwb.org`);
    logger.info(`📍 https://api.aisgwb.org/health`);
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'AISGWB API is healthy',
        environment: process.env.NODE_ENV || 'development'
    });
    logger.info('✅ AISGWB Node.js server is running');
    logger.info(`📍 api.aisgwb.org`);
    logger.info(`📍 https://api.aisgwb.org/health`);
});

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

    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        logger.error('❌ MONGO_URI is not configured');
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
