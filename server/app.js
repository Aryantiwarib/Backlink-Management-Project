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
import { ensureAuthenticated } from './middleware/authMiddleware.js';

const app = express();

// Configure allowed CORS origins
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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

// Protected Dashboard, Campaign and Website API Routes
app.use('/api/dashboard', ensureAuthenticated, dashboardRoutes);
app.use('/api/campaigns', ensureAuthenticated, campaignRoutes);
app.use('/api/websites', ensureAuthenticated, websiteRoutes);

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
