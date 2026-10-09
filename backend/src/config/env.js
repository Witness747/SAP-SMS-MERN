/**
 * Fail-fast environment checks. Secrets are never logged.
 */

const MIN_JWT_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRETS = new Set([
  'your_jwt_secret_key_here_min_32_chars',
  'fallback_development_secret_change_in_production_32chars',
]);

const parseTrustProxyHops = (value) => {
  if (value === undefined || value === '') return false;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
  }
  const hops = Number(value);
  if (!Number.isSafeInteger(hops) || hops > 5) {
    throw new Error('TRUST_PROXY_HOPS must be between 0 and 5.');
  }
  return hops === 0 ? false : hops;
};

const assertProductionConfig = (env = process.env) => {
  if (env.NODE_ENV !== 'production') return true;
  if (typeof env.CLIENT_URL !== 'string' || env.CLIENT_URL.length === 0) {
    throw new Error('CLIENT_URL must be configured in production.');
  }
  let clientUrl;
  try {
    clientUrl = new URL(env.CLIENT_URL);
  } catch {
    throw new Error('CLIENT_URL must be a valid HTTPS origin in production.');
  }
  if (clientUrl.protocol !== 'https:' || clientUrl.origin !== env.CLIENT_URL || clientUrl.username || clientUrl.password) {
    throw new Error('CLIENT_URL must be a valid HTTPS origin without a path or trailing slash.');
  }
  return true;
};

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
  parseTrustProxyHops,
  assertProductionConfig,
  MIN_JWT_SECRET_LENGTH,
};
