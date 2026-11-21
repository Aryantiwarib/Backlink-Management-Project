import crypto from 'crypto';

const DEFAULT_SECRET = 'linkora_development_session_secret_2026_growth_seo';

function getSecret() {
  return process.env.SESSION_SECRET || DEFAULT_SECRET;
}

/**
 * Creates an HMAC-SHA256 signed bearer token for a user.
 * Enables cross-origin authentication when third-party cookies are blocked by browsers.
 *
 * @param {Object} user - User document or object with _id/id and email
 * @param {number} expiresInMs - Expiration duration in milliseconds (default: 7 days)
 * @returns {string} URL-safe signed bearer token
 */
export function createAuthToken(user, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
  const userId = user._id ? user._id.toString() : user.id ? user.id.toString() : '';
  const payload = {
    id: userId,
    email: user.email || '',
    role: user.role || 'user',
    exp: Date.now() + expiresInMs
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(payloadStr)
    .digest('base64url');

  return `${payloadStr}.${signature}`;
}

/**
 * Verifies the HMAC-SHA256 signature and expiration of an auth token.
 *
 * @param {string} token - Signed bearer token
 * @returns {Object|null} Decoded payload or null if invalid/expired
 */
export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadStr, signature] = parts;

  // Re-generate signature to verify integrity
  const expectedSignature = crypto
    .createHmac('sha256', getSecret())
    .update(payloadStr)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch (_) {
    return null;
  }
}
