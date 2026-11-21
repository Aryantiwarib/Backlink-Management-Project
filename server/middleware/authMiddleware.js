import { verifyAuthToken } from '../utils/tokenHelper.js';
import User from '../models/User.js';

/**
 * Middleware to ensure the incoming request is from an authenticated session or valid bearer token.
 * Supports both Session Cookie and Bearer Authorization header for cross-origin reliability.
 */
export const ensureAuthenticated = async (req, res, next) => {
  // 1. Session Cookie Authentication
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // 2. Bearer Token Authentication (Cross-origin / Third-party cookie blocked fallback)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const payload = verifyAuthToken(token);

    if (payload && payload.id) {
      try {
        const user = await User.findById(payload.id).select('-password');
        if (user) {
          req.user = user;
          return next();
        }
      } catch (err) {
        console.warn('Bearer token user lookup failed:', err.message);
      }
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized. Please log in to access this resource.'
  });
};

/**
 * Optional middleware to check for admin role
 */
export const ensureAdmin = async (req, res, next) => {
  if (!req.user) {
    // Run authentication check first
    await ensureAuthenticated(req, res, () => {});
  }

  if (req.user && req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden. Admin privileges required.'
  });
};
