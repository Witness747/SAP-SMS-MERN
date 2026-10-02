const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/responseHandler');
const { getJwtSecret } = require('../config/env');

/**
 * Protect routes - Verifies JWT from Authorization header
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return errorResponse(res, 401, 'Authentication required. Please provide a valid Bearer token.');
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return errorResponse(res, 401, 'User associated with this token no longer exists.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.message === 'JWT_SECRET is not configured') {
      return errorResponse(res, 500, 'Authentication is not configured on the server.');
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Session expired. Please log in again.');
    }
    return errorResponse(res, 401, 'Invalid authentication token.');
  }
};

/**
 * Optional Admin check
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return errorResponse(res, 403, 'Forbidden: Admin access required.');
  }
};

module.exports = { protect, adminOnly };
