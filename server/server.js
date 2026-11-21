import './config/loadEnv.js';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
// import 'dotenv/config';

const PORT = parseInt(process.env.PORT, 10) || 5002;

// Connect to MongoDB and then start listening
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Linkora API Server running on http://localhost:${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth/status`);
      console.log(`🌐 Google Auth: http://localhost:${PORT}/api/auth/google`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is already in use by another running server process.`);
        console.error(`👉 You can free it with: kill -9 $(lsof -t -i :${PORT})\n`);
        process.exit(1);
      } else {
        console.error('Server error:', err);
      }
    });

    // If GOOGLE_CALLBACK_URL specifies port 5000 and PORT is different, also bind 5000 on both IPv4 and IPv6
    const secondaryServers = [];
    if (PORT !== 5000) {
      // 1. Bind IPv4 (127.0.0.1:5000)
      try {
        const s4 = app.listen(5000, '127.0.0.1', () => {
          console.log(`🔗 Secondary OAuth listener (IPv4) active on http://127.0.0.1:5000/auth/google/callback`);
        });
        s4.on('error', (err) => {
          if (err.code !== 'EADDRINUSE') {
            console.warn(`Note on port 5000 IPv4 (${err.code}): Primary server remains active on port ${PORT}.`);
          }
        });
        secondaryServers.push(s4);
      } catch (err) {
        console.warn('Could not bind port 5000 IPv4:', err.message);
      }

      // 2. Bind IPv6 (::1:5000) so macOS localhost requests don't hit Apple AirTunes
      try {
        const s6 = app.listen(5000, '::1', () => {
          console.log(`🔗 Secondary OAuth listener (IPv6) active on http://[::1]:5000/auth/google/callback`);
        });
        s6.on('error', (err) => {
          if (err.code !== 'EADDRINUSE') {
            console.warn(`Note on port 5000 IPv6 (${err.code}): Primary server remains active on port ${PORT}.`);
          }
        });
        secondaryServers.push(s6);
      } catch (err) {
        console.warn('Could not bind port 5000 IPv6:', err.message);
      }
    }

    const shutdown = async (signal) => {
      console.log(`\n${signal} received: closing HTTP server and database...`);
      server.close(async () => {
        for (const s of secondaryServers) {
          try {
            s.close();
          } catch (_) {}
        }
        await disconnectDB();
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
