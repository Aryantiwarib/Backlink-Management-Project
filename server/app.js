import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes/dashboardRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins in development prototype
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Linkora Backend API',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/campaigns', campaignRoutes);

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
