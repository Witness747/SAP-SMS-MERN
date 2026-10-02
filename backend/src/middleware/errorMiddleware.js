const { errorResponse } = require('../utils/responseHandler');

const redactSensitive = (text) => {
  if (!text || typeof text !== 'string') return 'An error occurred';
  return text
    .replace(/mongodb(\+srv)?:\/\/\S+/gi, '[redacted]')
    .replace(/JWT_SECRET[^\s]*/gi, '[redacted]')
    .replace(/[A-Za-z]:\\[^\s"'`]+/g, '[path]')
    .replace(/\/(?:home|Users|var|etc|usr|opt)[^\s"'`]*/g, '[path]');
};

/**
 * 404 Route Not Found Middleware
 */
const notFound = (req, res, next) => {
  const error = new Error(`Resource not found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Central Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Internal Server Error';
  let errors = null;

  console.error(`[${req.method} ${req.originalUrl}] ${err.name || 'Error'}: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for unique field '${field}'. Please provide another value.`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((val) => val.message);
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
  }

  if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoNotConnectedError' ||
    (err.name === 'MongooseError' && /buffer/i.test(err.message || ''))
  ) {
    statusCode = 503;
    message = 'Database unavailable';
  }

  if (typeof err.message === 'string' && err.message.startsWith('CORS')) {
    statusCode = 403;
    message = 'Origin not allowed';
  }

  if (statusCode >= 500) {
    message = statusCode === 503 ? 'Database unavailable' : 'Internal Server Error';
  } else {
    message = redactSensitive(message);
  }

  return errorResponse(res, statusCode, message, errors);
};

module.exports = { notFound, errorHandler };
