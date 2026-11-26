import './config/loadEnv.js';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import { getMongoClientPromise } from './config/db.js';
import passport, { configurePassport } from './config/passport.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import websiteRoutes from './routes/websiteRoutes.js';
import seoRoutes from './routes/seoRoutes.js';
import backlinkRoutes from './routes/backlinkRoutes.js';
import monitoringRoutes from './routes/monitoringRoutes.js';
import prospectRoutes from './routes/prospectRoutes.js';
import outreachRoutes from './routes/outreachRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { ensureAuthenticated } from './middleware/authMiddleware.js';

const app = express();

// Trust reverse proxy (essential for Render, Heroku, Cloudflare, etc. to recognize HTTPS & set secure cookies)
app.set('trust proxy', 1);

// Configure allowed CORS origins
const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.trim().replace(/\/+$/, '') : null;
const allowedOrigins = [
  ...(clientUrl ? [clientUrl] : []),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      // Allow localhost on any port for flexible developer setups
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session with MongoDB store
const mongoSessionStore = MongoStore.create({
  clientPromise: getMongoClientPromise(),
  collectionName: 'sessions',
  ttl: 7 * 24 * 60 * 60, // 7 days
  autoRemove: 'native'
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'linkora_development_session_secret_2026',
    resave: false,
    saveUninitialized: false,
    proxy: true, // Enables proxy cookie forwarding on Render/Cloudflare
    store: mongoSessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  })
);

// Initialize Passport & Session
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Public Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Linkora Backend API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    version: '1.0.0'
  });
});

// Authentication Routes (Public)
app.use('/api/auth', authRoutes);

// Direct root routes matching Google Cloud Console callback paths
app.get('/auth/google/callback', (req, res, next) => {
  import('./controllers/authController.js').then(m => m.handleGoogleCallback(req, res, next));
});
app.get('/auth/google', (req, res, next) => {
  import('./controllers/authController.js').then(m => m.initiateGoogleAuth(req, res, next));
});

// Protected Dashboard, Campaign, Website and SEO Provider API Routes
app.use('/api/dashboard', ensureAuthenticated, dashboardRoutes);
app.use('/api/campaigns', ensureAuthenticated, campaignRoutes);
app.use('/api/websites', ensureAuthenticated, websiteRoutes);
app.use('/api/seo', ensureAuthenticated, seoRoutes);
app.use('/api/backlinks', ensureAuthenticated, backlinkRoutes);
app.use('/api/monitoring', ensureAuthenticated, monitoringRoutes);
app.use('/api/prospects', ensureAuthenticated, prospectRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/assistant', ensureAuthenticated, assistantRoutes);
app.use('/api/analytics', ensureAuthenticated, analyticsRoutes);
app.use('/api/reports', ensureAuthenticated, analyticsRoutes);

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Linkora Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;
