const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/env');

/**
 * Generate a signed JWT for an authenticated user
 * @param {string} userId - Mongoose User ObjectId as string
 * @returns {string} Signed JWT token
 */
const generateToken = (userId) => {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign({ id: userId }, secret, {
    expiresIn,
  });
};

module.exports = generateToken;
