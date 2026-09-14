const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./services/logger');

const app = express();

// Middlewares
app.use(cors(config.cors));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(logger.httpLogger);
app.use(express.static(path.join(__dirname, '../public')));

const middlewares = require('./middlewares');
app.use(middlewares.requestId);

// Auto-load Modules
/*
|--------------------------------------------------------------------------
| Recursive Module Loader
|--------------------------------------------------------------------------
*/

const loadModules = (dir, routePrefix = '/api') => {
  fs.readdirSync(dir).forEach((item) => {
    const itemPath = path.join(dir, item);

    if (!fs.statSync(itemPath).isDirectory()) {
      return;
    }

    const indexFile = path.join(itemPath, 'index.js');

    const routeComponent = item.startsWith('(') && item.endsWith(')') ? '' : `/${item}`;
    const nextRoutePrefix = `${routePrefix}${routeComponent}`;

    /*
     * Register route if index.js exists
     */
    if (fs.existsSync(indexFile)) {
      try {
        delete require.cache[require.resolve(indexFile)];

        const moduleEntry = require(indexFile);

        if (moduleEntry && moduleEntry.routes) {
          app.use(nextRoutePrefix, moduleEntry.routes);

          logger.info(`✅ Module loaded: ${nextRoutePrefix}`);
        }
      } catch (error) {
        logger.error(`❌ Failed loading ${indexFile}`);

        logger.error(error.stack);
      }
    }

    /*
     * Continue scanning child directories
     */
    loadModules(itemPath, nextRoutePrefix);
  });
};

const modulesPath = path.join(__dirname, 'modules');

if (fs.existsSync(modulesPath)) {
  loadModules(modulesPath);
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    success: false,
    message,
    error: config.app.env === 'development' ? err : undefined,
  });
});

module.exports = app;

