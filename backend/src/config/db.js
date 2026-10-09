const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 0);

const P3_TEST_DATABASE_PREFIX = 'sap_sms_p3_test_';

const getP3TestDatabaseName = (runId = process.env.P3_TEST_RUN_ID) => {
  if (typeof runId !== 'string' || !/^[a-f0-9]{32}$/.test(runId)) {
    throw new Error('P3_TEST_RUN_ID must be a 32-character lowercase hexadecimal run ID.');
  }
  return `${P3_TEST_DATABASE_PREFIX}${runId}`;
};

const validateTestMongoUri = (uri) => {
  if (typeof uri !== 'string' || uri.trim() === '') {
    throw new Error('TEST_MONGODB_URI must be explicitly configured in test mode.');
  }

  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('TEST_MONGODB_URI is not a valid MongoDB connection URI.');
  }

  const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  if (parsed.protocol !== 'mongodb:' || !loopbackHosts.has(parsed.hostname.toLowerCase())) {
    throw new Error('TEST_MONGODB_URI must use a loopback MongoDB host.');
  }

  if (parsed.port !== '27017') {
    throw new Error('TEST_MONGODB_URI must use the approved local MongoDB port.');
  }

  const expectedDatabaseName = getP3TestDatabaseName();
  if (parsed.pathname !== `/${expectedDatabaseName}`) {
    throw new Error('TEST_MONGODB_URI database name must match the unique P3_TEST_RUN_ID.');
  }

  // Disallow URI options that can alter topology or route connections elsewhere.
  if (parsed.search || parsed.hash) {
    throw new Error('TEST_MONGODB_URI must not include query options or a fragment.');
  }

  return uri;
};

const assertTestDatabaseIdentity = (connection = mongoose.connection, expectedName = getP3TestDatabaseName()) => {
  const host = String(connection.host || '').toLowerCase();
  const port = Number(connection.port || 27017);
  const allowedHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

  if (connection.name !== expectedName || !allowedHosts.has(host) || port !== 27017) {
    throw new Error('Connected MongoDB identity does not match the approved P3 test database.');
  }

  const servers = connection.getClient()?.topology?.description?.servers;
  const addresses = servers ? [...servers.keys()] : [];
  if (addresses.length !== 1) {
    throw new Error('Could not confirm a single loopback MongoDB server for P3 tests.');
  }

  const address = addresses[0];
  const addressMatch = /^(.*):(\d+)$/.exec(address);
  if (!addressMatch || !allowedHosts.has(addressMatch[1].toLowerCase()) || Number(addressMatch[2]) !== 27017) {
    throw new Error('Connected MongoDB server address is not the approved loopback address.');
  }

  return true;
};

const assertTestDatabaseEmpty = async (connection = mongoose.connection, expectedName = getP3TestDatabaseName()) => {
  assertTestDatabaseIdentity(connection, expectedName);
  const collections = await connection.db.listCollections({}, { nameOnly: true }).toArray();
  if (collections.length !== 0) {
    throw new Error('P3 test database is not empty; no fixtures were written.');
  }
  return true;
};

/**
 * Connect to MongoDB Atlas
 * Reads connection URI strictly from environment variables.
 * Fails with helpful guidance if URI is missing.
 */
const connectDB = async () => {
  const isTest = process.env.NODE_ENV === 'test';
  const uri = isTest
    ? validateTestMongoUri(process.env.TEST_MONGODB_URI)
    : process.env.MONGODB_URI;

  if (!uri) {
    if (isTest) {
      throw new Error('TEST_MONGODB_URI is required in test mode.');
    }
    console.error('====================================================');
    console.error('❌ MONGODB_URI environment variable is not defined!');
    console.error('Please create backend/.env with your MongoDB Atlas URI.');
    console.error('====================================================');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: !isTest,
      ...(isTest ? { directConnection: true } : {}),
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
    if (isTest) {
      // Keep connection details and credentials out of test output.
      throw new Error(`Test MongoDB connection failed (${error.name}).`);
    }
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

module.exports = {
  connectDB,
  disconnectDB,
  getDatabaseStatus,
  validateTestMongoUri,
  getP3TestDatabaseName,
  assertTestDatabaseIdentity,
  assertTestDatabaseEmpty,
  P3_TEST_DATABASE_PREFIX,
};
