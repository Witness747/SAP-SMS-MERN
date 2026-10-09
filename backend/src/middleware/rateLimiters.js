const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

const createApiLimiter = (overrides = {}) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 1000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many API requests. Please try again later.',
  },
  ...overrides,
});

const apiLimiter = createApiLimiter();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 100 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 50 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password change attempts. Please try again later.',
  },
});

module.exports = { apiLimiter, createApiLimiter, authLimiter, passwordChangeLimiter };
