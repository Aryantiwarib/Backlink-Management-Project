import bcrypt from 'bcryptjs';
import passport from 'passport';
import User from '../models/User.js';
import { createAuthToken } from '../utils/tokenHelper.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');

/**
 * Register a new user with email & password
 * POST /api/auth/signup
 */
export const signup = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validate required fields
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, email, password, confirm password) are required.'
      });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long.'
      });
    }

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.'
      });
    }

    // Check for existing user
    let existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      // If user signed up via Google but never created a password, allow setting a password
      if (!existingUser.password && existingUser.googleId) {
        const salt = await bcrypt.genSalt(10);
        existingUser.password = await bcrypt.hash(password, salt);
        if (!existingUser.providers.includes('local')) {
          existingUser.providers.push('local');
        }
        await existingUser.save();

        req.login(existingUser, (loginErr) => {
          if (loginErr) return next(loginErr);
          const token = createAuthToken(existingUser);
          return res.status(200).json({
            success: true,
            message: 'Password added to your existing Google account. Logged in successfully.',
            data: {
              ...existingUser.toSafeObject(),
              token
            }
          });
        });
        return;
      }

      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please log in.'
      });
    }

    // Hash password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user in MongoDB
    const newUser = new User({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
      providers: ['local'],
      role: 'user'
    });

    await newUser.save();

    // Automatically log in the user after successful registration
    req.login(newUser, (loginErr) => {
      const token = createAuthToken(newUser);
      if (loginErr) {
        console.error('Auto-login error after signup:', loginErr);
        return res.status(201).json({
          success: true,
          message: 'Account created successfully. Please log in.',
          data: {
            ...newUser.toSafeObject(),
            token
          }
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Account created and logged in successfully.',
        data: {
          ...newUser.toSafeObject(),
          token
        }
      });
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user account.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Authenticate user with Passport Local Strategy
 * POST /api/auth/login
 */
export const login = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Passport authenticate error:', err);
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: info?.message || 'Invalid email or password.'
      });
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('req.login error:', loginErr);
        return next(loginErr);
      }

      const safeUser = user.toSafeObject ? user.toSafeObject() : user;
      const token = createAuthToken(user);
      return res.status(200).json({
        success: true,
        message: 'Logged in successfully.',
        data: {
          ...safeUser,
          token
        }
      });
    });
  })(req, res, next);
};

/**
 * Log out user and destroy session
 * POST /api/auth/logout
 */
export const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      console.error('req.logout error:', err);
      return next(err);
    }

    if (req.session) {
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('Session destroy error:', sessionErr);
        }
        res.clearCookie('connect.sid', { path: '/' });
        return res.status(200).json({
          success: true,
          message: 'Logged out successfully.'
        });
      });
    } else {
      res.clearCookie('connect.sid', { path: '/' });
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    }
  });
};

/**
 * Initiate Google OAuth flow
 * GET /api/auth/google
 */
export const initiateGoogleAuth = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      success: false,
      message: 'Google OAuth is not configured on the server. Please provide GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
    });
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })(req, res, next);
};

/**
 * Render a clean HTML client-side redirect page.
 * This terminates the multi-hop HTTPS -> HTTP cross-port redirect chain cleanly,
 * preventing Safari and other WebKit browsers from throwing "Safari cannot connect to the server".
 */
const sendClientRedirect = (res, targetUrl) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
  <title>Signing in to LINKORA...</title>
  <style>
    body {
      margin: 0;
      background-color: #0B0D10;
      color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid rgba(16, 185, 129, 0.2);
      border-top-color: #10B981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .title {
      font-size: 16px;
      font-weight: 600;
      color: #FFFFFF;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 13px;
      color: #94A3B8;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      background: #10B981;
      color: #000000;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #059669;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <div class="title">Signing in with Google...</div>
  <div class="subtitle">Redirecting to your LINKORA dashboard...</div>
  <a class="btn" href="${targetUrl}">Click here if not redirected automatically</a>
  <script>
    // Immediate client-side top-level navigation to bypass Safari cross-port redirect blocks
    try {
      window.location.replace("${targetUrl}");
    } catch (_) {
      window.location.href = "${targetUrl}";
    }
  </script>
</body>
</html>`);
};

/**
 * Handle Google OAuth callback
 * GET /api/auth/google/callback or GET /auth/google/callback
 */
export const handleGoogleCallback = (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      console.error('Google OAuth callback error:', err);
      const errorMsg = encodeURIComponent(err.message || 'Google authentication failed');
      return sendClientRedirect(res, `${CLIENT_URL}/login?error=oauth_error&message=${errorMsg}`);
    }

    if (!user) {
      const infoMsg = encodeURIComponent(info?.message || 'Google authentication was cancelled or failed.');
      return sendClientRedirect(res, `${CLIENT_URL}/login?error=oauth_failed&message=${infoMsg}`);
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('req.login error after Google OAuth:', loginErr);
        return sendClientRedirect(res, `${CLIENT_URL}/login?error=session_error&message=Failed+to+establish+session`);
      }

      // Generate a signed bearer token for cross-origin reliability (Safari / Chrome third-party cookie restrictions)
      const token = createAuthToken(user);

      // Successful Google Sign-In: Clean client redirect to frontend dashboard with token
      return sendClientRedirect(res, `${CLIENT_URL}/?oauth=success&token=${encodeURIComponent(token)}`);
    });
  })(req, res, next);
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export const getMe = (req, res) => {
  if (!req.user && (!req.isAuthenticated || !req.isAuthenticated())) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated.'
    });
  }

  const safeUser = req.user.toSafeObject ? req.user.toSafeObject() : req.user;
  return res.status(200).json({
    success: true,
    data: safeUser
  });
};

/**
 * Check whether the user is currently authenticated
 * GET /api/auth/status
 */
export const getStatus = (req, res) => {
  const isAuth = !!req.user || (req.isAuthenticated ? req.isAuthenticated() : false);
  const safeUser = isAuth && req.user ? (req.user.toSafeObject ? req.user.toSafeObject() : req.user) : null;

  return res.status(200).json({
    success: true,
    isAuthenticated: isAuth,
    user: safeUser
  });
};
