/**
 * Middleware to ensure the incoming request is from an authenticated session
 */
export const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized. Please log in to access this resource.'
  });
};

/**
 * Optional middleware to check for admin role
 */
export const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden. Admin privileges required.'
  });
};
