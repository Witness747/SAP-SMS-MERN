const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 0);

/**
 * Connect to MongoDB Atlas
 * Reads connection URI strictly from environment variables.
 * Fails with helpful guidance if URI is missing.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('====================================================');
    console.error('❌ MONGODB_URI environment variable is not defined!');
    console.error('Please create backend/.env with your MongoDB Atlas URI.');
    console.error('====================================================');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`);

    mongoose.connection.on('error', (err) => {
      console.error(`⚠️ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully.');
    });

    return true;
  } catch (error) {
    console.error(`❌ MongoDB initial connection failed (${error.name}).`);
    console.error('Make sure your MongoDB Atlas cluster is online, network access (IP whitelist) allows your IP, and credentials in .env are correct.');
    return false;
  }
};

/**
 * Graceful database disconnect helper
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed cleanly through app termination.');
  } catch (error) {
    console.error('Error closing MongoDB connection.');
  }
};

const getDatabaseStatus = async () => {
  const readyState = mongoose.connection.readyState;
  if (readyState !== 1 || !mongoose.connection.db) {
    return { status: 'unavailable', readyState };
  }

  try {
    await mongoose.connection.db.admin().command({ ping: 1 }, { maxTimeMS: 2000 });
    return { status: 'connected', readyState };
  } catch {
    return { status: 'unavailable', readyState };
  }
};

module.exports = { connectDB, disconnectDB, getDatabaseStatus };
