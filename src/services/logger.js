const fs = require('fs');
const path = require('path');
const winston = require('winston');
const expressWinston = require('express-winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('../config');

const logsDir = path.join(__dirname, '../../logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const environment = config.app.env || process.env.NODE_ENV || 'development';
const isProd = environment === 'production';

const {
  combine,
  timestamp,
  printf,
  colorize,
  errors,
  splat,
  json
} = winston.format;

/*
|--------------------------------------------------------------------------
| Console Format
|--------------------------------------------------------------------------
*/

const consoleFormat = printf((info) => {
  const { timestamp, level, message, stack, ...meta } = info;

  const rest = Object.keys(meta).length
    ? ` ${JSON.stringify(meta)}`
    : '';

  return `${timestamp} ${level}: ${stack || message}${rest}`;
});

/*
|--------------------------------------------------------------------------
| Ignore HTTP logs in production console
|--------------------------------------------------------------------------
*/

const ignoreHttpLogsInProd = winston.format((info) => {
  if (isProd && info.isHttpLog) {
    return false;
  }

  return info;
});

/*
|--------------------------------------------------------------------------
| Main Logger
|--------------------------------------------------------------------------
*/

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),

  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    splat(),
    isProd ? json() : consoleFormat
  ),

  defaultMeta: {
    service: config.app.name || 'backend-service',
  },

  transports: [
    /*
    |--------------------------------------------------------------------------
    | Console Logs (Development)
    |--------------------------------------------------------------------------
    */
    ...(!isProd
      ? [
        new winston.transports.Console({
          format: combine(
            colorize(),
            consoleFormat
          ),
        }),
      ]
      : []),

    /*
    |--------------------------------------------------------------------------
    | Error Logs
    |--------------------------------------------------------------------------
    */
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '7d',
      maxSize: '20m',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json()
      ),
    }),

    /*
    |--------------------------------------------------------------------------
    | Combined Logs
    |--------------------------------------------------------------------------
    */
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d',
      maxSize: '20m',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json()
      ),
    }),
  ],

  exitOnError: false,
});

/*
|--------------------------------------------------------------------------
| Morgan Stream
|--------------------------------------------------------------------------
*/

logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

/*
|--------------------------------------------------------------------------
| Express HTTP Logger
|--------------------------------------------------------------------------
*/

const httpLogger = expressWinston.logger({
  winstonInstance: logger,

  meta: false,

  colorize: !isProd,

  expressFormat: false,

  msg: (req, res) => {
    const time = new Date().toISOString();

    return `${time} ${req.method} ${req.originalUrl} - ${res.statusCode} - ${req.get('User-Agent') || ''
      } - ${req.ip}`;
  },

  dynamicMeta: () => ({
    isHttpLog: true,
  }),

  requestFilter: (req, propName) => {
    if (propName === 'headers') {
      const headers = { ...req.headers };

      delete headers.authorization;
      delete headers.cookie;

      return headers;
    }

    return req[propName];
  },

  /*
  |--------------------------------------------------------------------------
  | Ignore Health Check Logs
  |--------------------------------------------------------------------------
  */
  ignoreRoute: (req) =>
    req.originalUrl === '/api/health',
});

logger.httpLogger = httpLogger;

module.exports = logger;