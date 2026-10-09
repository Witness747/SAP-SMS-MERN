const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { randomBytes } = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const webpush = require('web-push');
const User = require('../src/models/User');
const { protect, adminOnly } = require('../src/middleware/authMiddleware');
const { createApiLimiter } = require('../src/middleware/rateLimiters');
const { errorHandler } = require('../src/middleware/errorMiddleware');
const {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validatePushSubscription,
  validateSubject,
  validateTask,
  validateEvent,
  validateAttendance,
  validateTimetable,
  validateNotificationPreferences,
} = require('../src/validators');
const { parseTrustProxyHops, assertProductionConfig } = require('../src/config/env');

const TEST_SECRET = randomBytes(32).toString('base64url');
process.env.JWT_SECRET = TEST_SECRET;

const invoke = async (middleware, req) => {
  let statusCode = 200;
  let body;
  let nextError;
  const res = {
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; },
  };
  await middleware(req, res, (error) => { nextError = error; });
  return { statusCode, body, nextError };
};

const requestWithToken = (authorization) => ({ headers: { authorization } });

test('authentication rejects missing, malformed, expired, and invalid bearer tokens', async () => {
  const originalFindById = User.findById;
  let databaseLookups = 0;
  User.findById = () => { databaseLookups += 1; throw new Error('unexpected lookup'); };
  try {
    assert.equal((await invoke(protect, requestWithToken(undefined))).statusCode, 401);
    assert.equal((await invoke(protect, requestWithToken('Basic abc'))).statusCode, 401);
    assert.equal((await invoke(protect, requestWithToken('BearerXYZ abc'))).statusCode, 401);
    assert.equal((await invoke(protect, requestWithToken('Bearer abc extra'))).statusCode, 401);
    assert.equal((await invoke(protect, requestWithToken('Bearer malformed'))).statusCode, 401);

    const expired = jwt.sign({ id: 'user-id' }, TEST_SECRET, { expiresIn: -1 });
    assert.equal((await invoke(protect, requestWithToken(`Bearer ${expired}`))).statusCode, 401);
    const wrongSignature = jwt.sign({ id: 'user-id' }, randomBytes(32).toString('base64url'));
    assert.equal((await invoke(protect, requestWithToken(`Bearer ${wrongSignature}`))).statusCode, 401);
    assert.equal(databaseLookups, 0);
  } finally {
    User.findById = originalFindById;
  }
});

test('valid token loads only the identified user and database errors pass to the error handler', async () => {
  const originalFindById = User.findById;
  const token = jwt.sign({ id: 'user-id' }, TEST_SECRET, { expiresIn: '1m' });
  let selected;
  User.findById = (id) => ({ select: async (fields) => { selected = { id, fields }; return { _id: id, role: 'student' }; } });
  try {
    const req = requestWithToken(`Bearer ${token}`);
    const valid = await invoke(protect, req);
    assert.equal(valid.nextError, undefined);
    assert.equal(req.user._id, 'user-id');
    assert.deepEqual(selected, { id: 'user-id', fields: '-passwordHash +tokenVersion' });

    User.findById = () => ({ select: async () => { throw new Error('database unavailable'); } });
    const failed = await invoke(protect, requestWithToken(`Bearer ${token}`));
    assert.equal(failed.nextError.message, 'database unavailable');
  } finally {
    User.findById = originalFindById;
  }
});

test('authentication rejects tokens invalidated by a password change', async () => {
  const originalFindById = User.findById;
  const staleToken = jwt.sign({ id: 'user-id', ver: 1 }, TEST_SECRET, { expiresIn: '1m' });
  User.findById = () => ({ select: async () => ({ _id: 'user-id', role: 'student', tokenVersion: 2 }) });
  try {
    const stale = await invoke(protect, requestWithToken(`Bearer ${staleToken}`));
    assert.equal(stale.statusCode, 401);
    assert.match(stale.body.message, /Session invalidated/);
  } finally {
    User.findById = originalFindById;
  }
});

test('password change increments token version and returns a replacement token', async () => {
  const { changePassword } = require('../src/controllers/authController');
  const originalFindById = User.findById;
  const originalHashPassword = User.hashPassword;
  const user = {
    _id: 'user-id',
    tokenVersion: 3,
    passwordHash: 'old-hash',
    comparePassword: async () => true,
    save: async () => {},
  };
  User.findById = () => ({ select: async () => user });
  User.hashPassword = async () => 'new-hash';
  try {
    const response = await invoke(changePassword, {
      headers: {},
      user: { _id: user._id },
      body: { currentPassword: 'old-password', newPassword: 'new-password' },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(user.tokenVersion, 4);
    assert.equal(user.passwordHash, 'new-hash');
    assert.equal(jwt.verify(response.body.data.token, TEST_SECRET).ver, 4);
  } finally {
    User.findById = originalFindById;
    User.hashPassword = originalHashPassword;
  }
});

test('admin middleware denies missing roles and allows only explicit admins', async () => {
  assert.equal((await invoke(adminOnly, { user: { role: 'student' } })).statusCode, 403);
  assert.equal((await invoke(adminOnly, { user: { role: 'admin' } })).statusCode, 200);
});

test('authentication and profile validators reject malformed, oversized, and privilege fields', () => {
  assert.ok(validateRegister(null).length > 0);
  assert.ok(validateRegister({ name: 'A', email: 'a@example.com', password: 'x'.repeat(73) }).length > 0);
  assert.ok(validateRegister({ name: 'A', email: 'a@example.com', password: 'valid123', role: 'admin' }).some((e) => e.includes('role')));
  assert.ok(validateLogin([]).length > 0);
  assert.ok(validateLogin({ email: 'a@example.com', password: { $ne: '' } }).length > 0);
  assert.ok(validateLogin({ email: 'a@example.com', password: 'secret', role: 'admin' }).some((e) => e.includes('role')));

  assert.deepEqual(validateProfileUpdate({ name: 'Student', email: 'student@example.com', phone: '123' }), []);
  assert.ok(validateProfileUpdate({ role: 'admin' }).some((e) => e.includes('role')));
  assert.ok(validateProfileUpdate({ name: { $gt: '' } }).length > 0);
  assert.ok(validatePasswordChange({ currentPassword: 'old-pass', newPassword: 'new-password', passwordHash: 'injected' }).length > 0);
  assert.ok(validatePasswordChange({ currentPassword: 'old-pass', newPassword: 'é'.repeat(37) }).length > 0);
  assert.deepEqual(validatePasswordChange({ currentPassword: 'old-pass', newPassword: 'new-password' }), []);
});

test('resource validators reject non-object bodies, unsafe numeric types, and non-string text fields', () => {
  assert.ok(validateSubject(null).length > 0);
  assert.ok(validateSubject({ name: { $ne: '' }, code: 'X', credits: [] }).length > 0);
  assert.ok(validateTask({ title: { $ne: '' }, dueDate: '2030-01-01' }).length > 0);
  assert.ok(validateTask({ title: 'Task', dueDate: {} }).length > 0);
  assert.ok(validateEvent({ title: 'Event', date: '2030-01-01', location: [] }).length > 0);
  assert.ok(validateAttendance({ subject: '507f1f77bcf86cd799439011', attendedClasses: true }).length > 0);
  assert.ok(validateTimetable({ subject: {}, day: 'Monday', startTime: '09:00', endTime: '10:00' }).length > 0);
  assert.ok(validateNotificationPreferences({ taskReminders: 'false' }).length > 0);
  assert.ok(validateNotificationPreferences({ role: 'admin' }).length > 0);
  assert.deepEqual(validateNotificationPreferences({ taskReminders: false }), []);
});

test('push subscription validator accepts browser push providers and rejects arbitrary HTTPS hosts', () => {
  const keys = {
    p256dh: Buffer.alloc(65, 1).toString('base64url'),
    auth: Buffer.alloc(16, 2).toString('base64url'),
  };
  const subscription = (endpoint) => ({ endpoint, keys });
  for (const endpoint of [
    'https://fcm.googleapis.com/fcm/send/example',
    'https://updates.push.services.mozilla.com/wpush/v2/example',
    'https://web.push.apple.com/example',
    'https://db3.notify.windows.com/example',
  ]) assert.deepEqual(validatePushSubscription(subscription(endpoint)), []);

  for (const endpoint of [
    'https://127.0.0.1/internal',
    'https://localhost/internal',
    'https://attacker.example/push',
    'https://fcm.googleapis.com.attacker.example/push',
    'https://fcm.googleapis.com:8443/push',
    'http://fcm.googleapis.com/push',
  ]) assert.ok(validatePushSubscription(subscription(endpoint)).length > 0, endpoint);
});

test('push delivery revalidates stored endpoints before calling web-push', async () => {
  const { initWebPush, sendPushNotification } = require('../src/services/notificationService');
  const originalSetVapidDetails = webpush.setVapidDetails;
  const originalSendNotification = webpush.sendNotification;
  const originalPublicKey = process.env.VAPID_PUBLIC_KEY;
  const originalPrivateKey = process.env.VAPID_PRIVATE_KEY;
  let sentCount = 0;
  webpush.setVapidDetails = () => {};
  webpush.sendNotification = async () => { sentCount += 1; };
  process.env.VAPID_PUBLIC_KEY = 'test-public-key';
  process.env.VAPID_PRIVATE_KEY = 'test-private-key';

  try {
    initWebPush();
    const subscription = (endpoint) => ({
      endpoint,
      keys: {
        p256dh: Buffer.alloc(65, 1).toString('base64url'),
        auth: Buffer.alloc(16, 2).toString('base64url'),
      },
    });
    const invalidEndpoints = [
      'https://attacker.example/legacy-subscription',
      'not a URL',
      'https://fcm.googleapis.com.attacker.example/push',
      'https://user:password@fcm.googleapis.com/push',
      'https://fcm.googleapis.com:8443/push',
      'http://fcm.googleapis.com/push',
    ];

    for (const endpoint of invalidEndpoints) {
      const result = await sendPushNotification(subscription(endpoint), { title: 'test' });
      assert.equal(result.status, 'invalid_subscription');
    }
    assert.equal(sentCount, 0, 'web-push must not receive a rejected stored endpoint');

    for (const endpoint of [
      'https://fcm.googleapis.com/fcm/send/example',
      'https://updates.push.services.mozilla.com/wpush/v2/example',
      'https://web.push.apple.com/example',
      'https://db3.notify.windows.com/example',
    ]) {
      const result = await sendPushNotification(subscription(endpoint), { title: 'test' });
      assert.equal(result.status, 'sent_to_push_service');
    }
    assert.equal(sentCount, 4, 'web-push should be called for each allowed provider endpoint');
  } finally {
    webpush.setVapidDetails = originalSetVapidDetails;
    webpush.sendNotification = originalSendNotification;
    if (originalPublicKey === undefined) delete process.env.VAPID_PUBLIC_KEY;
    else process.env.VAPID_PUBLIC_KEY = originalPublicKey;
    if (originalPrivateKey === undefined) delete process.env.VAPID_PRIVATE_KEY;
    else process.env.VAPID_PRIVATE_KEY = originalPrivateKey;
  }
});

test('proxy hop configuration fails closed on malformed values', () => {
  assert.equal(parseTrustProxyHops(undefined), false);
  assert.equal(parseTrustProxyHops('0'), false);
  assert.equal(parseTrustProxyHops('1'), 1);
  assert.throws(() => parseTrustProxyHops('loopback'));
  assert.throws(() => parseTrustProxyHops('6'));
});

test('production startup configuration requires an exact HTTPS frontend origin', () => {
  assert.equal(assertProductionConfig({ NODE_ENV: 'development' }), true);
  assert.throws(() => assertProductionConfig({ NODE_ENV: 'production' }), /CLIENT_URL must be configured/);
  assert.throws(() => assertProductionConfig({ NODE_ENV: 'production', CLIENT_URL: 'http://app.example' }), /HTTPS origin/);
  assert.throws(() => assertProductionConfig({ NODE_ENV: 'production', CLIENT_URL: 'https://app.example/' }), /without a path/);
  assert.equal(assertProductionConfig({ NODE_ENV: 'production', CLIENT_URL: 'https://app.example' }), true);
});

test('server startup aborts instead of serving after a failed database connection', async () => {
  const db = require('../src/config/db');
  const originalConnectDB = db.connectDB;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;
  db.connectDB = async () => false;
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.NODE_ENV = 'test';
  try {
    const { startServer } = require('../server');
    await assert.rejects(startServer(), /Database connection is required/);
  } finally {
    db.connectDB = originalConnectDB;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test('API limiter returns 429 after the configured threshold', async (t) => {
  const app = express();
  app.use('/api', createApiLimiter({ limit: 2, windowMs: 60_000 }));
  app.get('/api/probe', (req, res) => res.json({ success: true }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const url = `http://127.0.0.1:${server.address().port}/api/probe`;
  const first = await fetch(url);
  const second = await fetch(url);
  const third = await fetch(url);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(third.status, 429);
  assert.equal(third.headers.get('ratelimit-limit'), '2');
  assert.equal((await third.json()).success, false);
});

test('parser errors return safe statuses without logging payloads or connection details', () => {
  const originalError = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args.join(' '));
  const run = (error) => {
    let statusCode;
    let body;
    const res = { status(code) { statusCode = code; return this; }, json(value) { body = value; return this; } };
    errorHandler(error, { method: 'POST', path: '/api/test' }, res, () => {});
    return { statusCode, body };
  };
  try {
    const sentinel = randomBytes(16).toString('hex');
    const malformed = run(Object.assign(new SyntaxError(`secret=${sentinel} mongodb://db.example.invalid/app`), { type: 'entity.parse.failed', status: 400 }));
    assert.equal(malformed.statusCode, 400);
    assert.equal(malformed.body.message, 'Malformed JSON request body');
    const oversized = run(Object.assign(new Error('large body'), { type: 'entity.too.large', status: 413 }));
    assert.equal(oversized.statusCode, 413);
    assert.equal(oversized.body.message, 'Request body is too large');
    assert.ok(!logs.join(' ').includes(sentinel));
    assert.ok(!logs.join(' ').includes('mongodb://'));
  } finally {
    console.error = originalError;
  }
});
