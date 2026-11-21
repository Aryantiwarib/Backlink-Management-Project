import './loadEnv.js';
import mongoose from 'mongoose';

let memoryServer = null;
let connectionPromise = null;

/**
 * Reusable MongoDB connection function with resilient development fallback
 */
export const connectDB = async () => {
  // If already connected, return existing client
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If connection is in progress, return existing promise
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/linkora';

    // Auto-strip accidental angle brackets around password in URI, e.g. :<mypassword>@ -> :mypassword@
    if (uri.includes('mongodb+srv://') || uri.includes('mongodb://')) {
      uri = uri.replace(/:<([^>]+)>@/, ':$1@');
    }

    // Check if the URI still contains unreplaced placeholder text
    if (uri.includes('<db_password>') || uri.includes('<password>')) {
      console.warn('⚠️  MONGODB_URI contains placeholder "<db_password>" or "<password>".');
      console.warn('👉 To connect to MongoDB Atlas, replace it with your actual database user password in server/.env.');
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔄 Initializing embedded MongoDB server for seamless development...');
        return await startMemoryServer();
      } else {
        throw new Error('MONGODB_URI contains unconfigured password placeholder in production.');
      }
    }

    try {
      // Attempt standard connection to Atlas/primary URI with 5s timeout
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn.connection;
    } catch (primaryError) {
      const maskedUri = uri.replace(/:[^@]+@/, ':****@');
      console.error(`\n❌ Could not connect to primary MongoDB URI (${maskedUri}):`);
      console.error(`   Error: ${primaryError.message}`);

      if (primaryError.message.includes('authentication failed')) {
        console.error('👉 TIP: MongoDB Atlas rejected your credentials ("bad auth : authentication failed").');
        console.error('   1. Open MongoDB Atlas > Database Access');
        console.error('   2. Verify user "aryantiwari" exists, or click "Edit" to reset its password');
        console.error('   3. Put that exact password in server/.env (omit angle brackets < >)');
        console.error('   4. Verify in Network Access that your current IP or 0.0.0.0/0 is allowed.\n');
      }

      // If in development mode, spin up embedded MongoMemoryServer so the app never crashes
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔄 Initializing embedded MongoDB server for development fallback...');
        return await startMemoryServer();
      } else {
        console.error('❌ MongoDB connection failed in production:', primaryError);
        throw primaryError;
      }
    }
  })();

  return connectionPromise;
};

/**
 * Start MongoMemoryServer for fallback development
 */
const startMemoryServer = async () => {
  try {
    try {
      await mongoose.disconnect();
    } catch (_) {}

    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const memoryUri = memoryServer.getUri();

    const conn = await mongoose.connect(memoryUri);
    console.log(`⚡ Embedded MongoDB fallback connected at: ${memoryUri}`);
    return conn.connection;
  } catch (memError) {
    console.error('❌ Failed to start embedded MongoDB server:', memError);
    throw memError;
  }
};

/**
 * Helper promise for connect-mongo to obtain MongoClient safely
 */
export const getMongoClientPromise = async () => {
  await connectDB();
  return mongoose.connection.getClient();
};

/**
 * Graceful database disconnect handler
 */
export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
    console.log('MongoDB disconnected successfully.');
  } catch (err) {
    console.error('Error during MongoDB disconnect:', err);
  }
};
