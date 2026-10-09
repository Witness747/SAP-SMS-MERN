const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  connectDB,
  validateTestMongoUri,
  getP3TestDatabaseName,
  assertTestDatabaseIdentity,
  assertTestDatabaseEmpty,
} = require('../src/config/db');

const TEST_RUN_ID = '0123456789abcdef0123456789abcdef';
const TEST_DATABASE_NAME = getP3TestDatabaseName(TEST_RUN_ID);

const previousEnv = {
  NODE_ENV: process.env.NODE_ENV,
  TEST_MONGODB_URI: process.env.TEST_MONGODB_URI,
  MONGODB_URI: process.env.MONGODB_URI,
  P3_TEST_RUN_ID: process.env.P3_TEST_RUN_ID,
};

afterEach(() => {
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('accepts only the approved loopback URI bound to the unique run ID', () => {
  process.env.P3_TEST_RUN_ID = TEST_RUN_ID;
  const uri = `mongodb://127.0.0.1:27017/${TEST_DATABASE_NAME}`;
  assert.equal(
    validateTestMongoUri(uri),
    uri
  );
  assert.equal(validateTestMongoUri(`mongodb://localhost:27017/${TEST_DATABASE_NAME}`), `mongodb://localhost:27017/${TEST_DATABASE_NAME}`);
  assert.equal(
    getP3TestDatabaseName(TEST_RUN_ID),
    TEST_DATABASE_NAME
  );
});

test('rejects missing, remote, wrong-database and topology-changing URIs', () => {
  process.env.P3_TEST_RUN_ID = TEST_RUN_ID;
  for (const uri of [
    undefined,
    '',
    'mongodb+srv://example.invalid/sap_sms_p3_test_0123456789abcdef0123456789abcdef',
    `mongodb://example.invalid:27017/${TEST_DATABASE_NAME}`,
    'mongodb://127.0.0.1:27017/admin',
    'mongodb://127.0.0.1:27017/config',
    'mongodb://127.0.0.1:27017/local',
    `mongodb://127.0.0.1:27018/${TEST_DATABASE_NAME}`,
    `mongodb://127.0.0.1/${TEST_DATABASE_NAME}`,
    `mongodb://127.0.0.1:27017/${TEST_DATABASE_NAME}?replicaSet=remote`,
    'mongodb://127.0.0.1:27017/sap_sms_p3_test_not-a-run-id',
  ]) {
    assert.throws(() => validateTestMongoUri(uri));
  }
  assert.throws(() => getP3TestDatabaseName('invalid-run-id'));
});

test('test mode fails closed without TEST_MONGODB_URI and never falls back to MONGODB_URI', async () => {
  process.env.NODE_ENV = 'test';
  delete process.env.TEST_MONGODB_URI;
  process.env.MONGODB_URI = 'mongodb://remote.invalid/application';

  const originalConnect = mongoose.connect;
  let connectCalled = false;
  mongoose.connect = async () => {
    connectCalled = true;
    throw new Error('Unexpected connection attempt');
  };

  try {
    await assert.rejects(connectDB(), /TEST_MONGODB_URI/);
    assert.equal(connectCalled, false);
  } finally {
    mongoose.connect = originalConnect;
  }
});

test('database identity and emptiness guards accept only the approved connected target', async () => {
  process.env.P3_TEST_RUN_ID = TEST_RUN_ID;
  const connection = {
    host: '127.0.0.1',
    port: 27017,
    name: TEST_DATABASE_NAME,
    getClient: () => ({ topology: { description: { servers: new Map([['127.0.0.1:27017', {}]]) } } }),
    db: { listCollections: () => ({ toArray: async () => [] }) },
  };

  assert.equal(assertTestDatabaseIdentity(connection), true);
  assert.equal(await assertTestDatabaseEmpty(connection), true);
  assert.throws(() => assertTestDatabaseIdentity({ ...connection, name: 'local' }));
  assert.throws(() => assertTestDatabaseIdentity({ ...connection, host: 'remote.invalid' }));
  await assert.rejects(assertTestDatabaseEmpty({
    ...connection,
    db: { listCollections: () => ({ toArray: async () => [{ name: 'events' }] }) },
  }), /not empty/);
});
