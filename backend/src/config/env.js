/**
 * Fail-fast environment checks. Secrets are never logged.
 */

const MIN_JWT_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRETS = new Set([
  'your_jwt_secret_key_here_min_32_chars',
  'fallback_development_secret_change_in_production_32chars',
]);

const assertJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || typeof secret !== 'string' || secret.trim().length < MIN_JWT_SECRET_LENGTH) {
    console.error('====================================================');
    console.error('❌ JWT_SECRET is missing or shorter than 32 characters.');
    console.error('Set a strong JWT_SECRET in backend/.env and restart.');
    console.error('====================================================');
    process.exit(1);
  }

  if (PLACEHOLDER_SECRETS.has(secret.trim())) {
    console.error('====================================================');
    console.error('❌ JWT_SECRET is a known placeholder value.');
    console.error('Replace it with a unique secret (32+ characters) in backend/.env.');
    console.error('====================================================');
    process.exit(1);
  }
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < MIN_JWT_SECRET_LENGTH) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

module.exports = {
  assertJwtSecret,
  getJwtSecret,
  MIN_JWT_SECRET_LENGTH,
};
