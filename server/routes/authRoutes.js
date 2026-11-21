import express from 'express';
import {
  signup,
  login,
  logout,
  getMe,
  getStatus,
  initiateGoogleAuth,
  handleGoogleCallback
} from '../controllers/authController.js';
import { ensureAuthenticated } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Local Email/Password Routes (Rate Limited)
router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/logout', logout);

// Session & Profile Inspection
router.get('/me', ensureAuthenticated, getMe);
router.get('/status', getStatus);

// Google OAuth 2.0 Routes
router.get('/google', initiateGoogleAuth);
router.get('/google/callback', handleGoogleCallback);

export default router;
