const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/responseHandler');
const { getJwtSecret } = require('../config/env');

/**
 * Protect routes - Verifies JWT from Authorization header
 */
const protect = async (req, res, next) => {
  let token;

  const authorization = req.headers.authorization;
  if (typeof authorization === 'string') {
    const bearerMatch = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (bearerMatch) token = bearerMatch[1];
  }

  if (!token) {
    return errorResponse(res, 401, 'Authentication required. Please provide a valid Bearer token.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (error) {
    if (error.message === 'JWT_SECRET is not configured') {
      return errorResponse(res, 500, 'Authentication is not configured on the server.');
    }
    if (error instanceof jwt.TokenExpiredError) {
      return errorResponse(res, 401, 'Session expired. Please log in again.');
    }
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError) {
      return errorResponse(res, 401, 'Invalid authentication token.');
    }
    return next(error);
  }

  try {
    const user = await User.findById(decoded.id).select('-passwordHash +tokenVersion');
    if (!user) {
      return errorResponse(res, 401, 'User associated with this token no longer exists.');
    }

    if ((decoded.ver ?? 0) !== (user.tokenVersion || 0)) {
      return errorResponse(res, 401, 'Session invalidated. Please log in again.');
    }

    req.user = user;
    return next();
  } catch (error) {
    // Database and infrastructure errors must keep their server-side status;
    // they are not evidence that the user's token is invalid.
    return next(error);
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
