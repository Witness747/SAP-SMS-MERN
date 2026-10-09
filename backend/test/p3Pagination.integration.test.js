const { randomUUID } = require('node:crypto');
const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

if (process.env.NODE_ENV !== 'test') {
  throw new Error('P3 integration tests require NODE_ENV=test.');
}
if (process.env.P3_RUN_DB_INTEGRATION !== '1') {
  throw new Error('Set P3_RUN_DB_INTEGRATION=1 to explicitly opt in to local database integration tests.');
}
if (!/^[a-f0-9]{32}$/.test(process.env.P3_TEST_RUN_ID || '')) {
  throw new Error('P3_TEST_RUN_ID must be a unique 32-character lowercase hexadecimal value.');
}

process.env.JWT_SECRET ||= randomUUID() + randomUUID();

const http = require('node:http');
const mongoose = require('mongoose');
const {
  connectDB,
  disconnectDB,
  assertTestDatabaseIdentity,
  assertTestDatabaseEmpty,
} = require('../src/config/db');
const app = require('../src/app');
const User = require('../src/models/User');
const NotificationPreference = require('../src/models/NotificationPreference');
const Event = require('../src/models/Event');
const Task = require('../src/models/Task');
const Subject = require('../src/models/Subject');
const Attendance = require('../src/models/Attendance');
const Timetable = require('../src/models/Timetable');
let getPageAfterDeletion;

const runId = process.env.P3_TEST_RUN_ID;
const tracked = new Map([
  ['User', new Set()],
  ['Event', new Set()],
  ['Task', new Set()],
  ['Subject', new Set()],
  ['Attendance', new Set()],
  ['Timetable', new Set()],
  ['NotificationPreference', new Set()],
]);
const models = { User, Event, Task, Subject, Attendance, Timetable, NotificationPreference };

let server;
let baseUrl;
let token;
let ownerPassword;
let fixtureSubject;

const remember = (modelName, documentOrId) => {
  const id = typeof documentOrId === 'string' ? documentOrId : documentOrId?._id || documentOrId?.id;
  if (id) tracked.get(modelName).add(String(id));
  return documentOrId;
};

const api = async (path, { method = 'GET', body, authenticated = true, requestToken = token, authorization } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (authenticated && requestToken) headers.Authorization = `Bearer ${requestToken}`;
  if (authorization !== undefined) headers.Authorization = authorization;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
};

const expectSuccess = (result, status) => {
  assert.equal(result.status, status, result.body.message);
  assert.equal(result.body.success, true);
  return result.body;
};

const query = (path, params) => `${path}?${new URLSearchParams(params)}`;

const createSubject = async (index) => {
  const result = expectSuccess(await api('/api/subjects', {
    method: 'POST',
    body: {
      name: `P3 ${runId} Subject ${String(index).padStart(2, '0')}`,
      code: `P3${runId.slice(0, 8)}${String(index).padStart(2, '0')}`,
    },
  }), 201);
  remember('Subject', result.data.subject);
  remember('Attendance', result.data.attendance);
  return result.data.subject;
};

const assertPaginationContract = async (path, filter = {}) => {
  const defaults = expectSuccess(await api(query(path, filter)), 200);
  assert.equal(defaults.meta.pagination.page, 1);
  assert.equal(defaults.meta.pagination.pageSize, 20);

  const maximumSize = expectSuccess(await api(query(path, { ...filter, page: 1, pageSize: 100 })), 200);
  assert.equal(maximumSize.meta.pagination.pageSize, 100);

  const maximumOffset = expectSuccess(await api(query(path, { ...filter, page: 101, pageSize: 100 })), 200);
  assert.equal(maximumOffset.meta.pagination.page, 101);
  assert.equal(maximumOffset.meta.pagination.maxPage, 101);

  for (const invalid of [
    'page=-1',
    'page=1.5',
    'page=9007199254740992',
    'page=102&pageSize=100',
    'pageSize=101',
    'page=1&page=2',
  ]) {
    const response = await api(`${path}?${invalid}`);
    assert.equal(response.status, 400, `${path}?${invalid}`);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Invalid pagination parameters');
    assert.ok(Array.isArray(response.body.errors) && response.body.errors.length > 0);
  }
};

const verifyDeleteBoundary = async (path, filter, method = 'DELETE') => {
  const pageTwoPath = query(path, { ...filter, page: 2, pageSize: 12 });
  const pageTwo = expectSuccess(await api(pageTwoPath), 200);
  assert.equal(pageTwo.data.length, 2, `${path} needs two rows on page 2 before deletion`);

  const firstId = pageTwo.data[0]._id;
  expectSuccess(await api(`${path}/${firstId}`, { method }), 200);
  const afterOneDelete = expectSuccess(await api(pageTwoPath), 200);
  assert.equal(afterOneDelete.data.length, 1);
  assert.equal(afterOneDelete.meta.pagination.totalPages, 2);
  assert.equal(getPageAfterDeletion(2, afterOneDelete.meta.pagination), 2);

  const lastId = afterOneDelete.data[0]._id;
  expectSuccess(await api(`${path}/${lastId}`, { method }), 200);
  const afterBoundaryDelete = expectSuccess(await api(pageTwoPath), 200);
  assert.equal(afterBoundaryDelete.data.length, 0);
  assert.equal(afterBoundaryDelete.meta.pagination.totalItems, 12);
  assert.equal(afterBoundaryDelete.meta.pagination.totalPages, 1);
  assert.equal(getPageAfterDeletion(2, afterBoundaryDelete.meta.pagination), 1);

  const pageOne = expectSuccess(await api(query(path, { ...filter, page: 1, pageSize: 12 })), 200);
  assert.equal(pageOne.data.length, 12);

  const failedDelete = await api(`${path}/${lastId}`, { method });
  assert.equal(failedDelete.status, 404);
  assert.equal(failedDelete.body.success, false);
  const afterFailure = expectSuccess(await api(query(path, { ...filter, page: 1, pageSize: 12 })), 200);
  assert.equal(afterFailure.meta.pagination.totalItems, 12);
  assert.equal(getPageAfterDeletion(2, undefined), 2);
};

const verifyOnlyRecordCase = async (path, filter, method = 'DELETE') => {
  let page = expectSuccess(await api(query(path, { ...filter, page: 1, pageSize: 100 })), 200);
  assert.ok(page.data.length > 0);

  while (page.data.length > 1) {
    expectSuccess(await api(`${path}/${page.data[0]._id}`, { method }), 200);
    page = expectSuccess(await api(query(path, { ...filter, page: 1, pageSize: 100 })), 200);
  }

  assert.equal(page.meta.pagination.totalItems, 1);
  const lastId = page.data[0]._id;
  expectSuccess(await api(`${path}/${lastId}`, { method }), 200);
  const empty = expectSuccess(await api(query(path, { ...filter, page: 1, pageSize: 100 })), 200);
  assert.equal(empty.data.length, 0);
  assert.equal(empty.meta.pagination.totalItems, 0);
  assert.equal(empty.meta.pagination.totalPages, 0);
  assert.equal(getPageAfterDeletion(1, empty.meta.pagination), 1);
};

before(async () => {
  ({ getPageAfterDeletion } = await import('../../frontend/src/utils/pagination.js'));
  await connectDB();
  assertTestDatabaseIdentity();
  await assertTestDatabaseEmpty();

  server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));

  try {
    if (tracked.get('User').size > 0) {
      // Revalidate identity immediately before deleting only IDs created by this run.
      assertTestDatabaseIdentity();
      for (const [modelName, ids] of tracked.entries()) {
        if (modelName === 'NotificationPreference') {
          const userIds = [...tracked.get('User')];
          if (userIds.length) await models[modelName].deleteMany({ user: { $in: userIds } });
        } else if (ids.size) {
          await models[modelName].deleteMany({ _id: { $in: [...ids] } });
        }
      }
    }
  } finally {
    if (mongoose.connection.readyState !== 0) await disconnectDB();
  }
});

test('real API pagination and deletion boundaries for events, tasks, subjects, and timetable', async () => {
  const privilegedRegistration = await api('/api/auth/register', {
    method: 'POST',
    authenticated: false,
    body: {
      name: `P3 Privilege ${runId}`,
      email: `p3-privilege-${runId}@example.invalid`,
      password: randomUUID() + randomUUID(),
      role: 'admin',
    },
  });
  assert.equal(privilegedRegistration.status, 400);

  const registered = expectSuccess(await api('/api/auth/register', {
    method: 'POST',
    authenticated: false,
    body: {
      name: `P3 Integration ${runId}`,
      email: `p3-${runId}@example.invalid`,
      password: (ownerPassword = randomUUID() + randomUUID()),
    },
  }), 201);
  token = registered.data.token;
  remember('User', registered.data.user.id);

  const preference = await NotificationPreference.findOne({ user: registered.data.user.id }).select('_id').lean();
  if (preference) remember('NotificationPreference', preference._id);
  assert.equal((await api('/api/subjects', { authenticated: false })).status, 401);
  assert.equal((await api('/api/subjects', { authorization: 'BearerXYZ invalid' })).status, 401);
  assert.equal((await api('/api/events/not-a-valid-id')).status, 400);
  assert.equal((await api('/api/auth/profile', { method: 'PUT', body: { role: 'admin' } })).status, 400);
  assert.equal((await api('/api/auth/change-password', {
    method: 'PUT',
    body: { currentPassword: { $ne: '' }, newPassword: 'password123' },
  })).status, 400);
  assert.equal((await api('/api/notifications/preferences', {
    method: 'PUT',
    body: { taskReminders: 'false' },
  })).status, 400);

  const subjects = [];
  for (let index = 0; index < 14; index += 1) subjects.push(await createSubject(index));
  fixtureSubject = subjects[0];

  for (let index = 0; index < 14; index += 1) {
    const event = expectSuccess(await api('/api/events', {
      method: 'POST',
      body: {
        title: `P3 ${runId} Event ${String(index).padStart(2, '0')}`,
        date: `2035-05-${String(index + 1).padStart(2, '0')}`,
        category: 'meeting',
      },
    }), 201);
    remember('Event', event.data);

    const task = expectSuccess(await api('/api/tasks', {
      method: 'POST',
      body: {
        title: `P3 ${runId} Task ${String(index).padStart(2, '0')}`,
        dueDate: `2035-06-${String(index + 1).padStart(2, '0')}`,
        priority: 'high',
        status: 'pending',
        subject: fixtureSubject._id,
      },
    }), 201);
    remember('Task', task.data);

    const startMinutes = index * 90;
    const startTime = `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`;
    const endMinutes = startMinutes + 60;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
    const slot = expectSuccess(await api('/api/timetable', {
      method: 'POST',
      body: { subject: fixtureSubject._id, day: 'Monday', startTime, endTime, room: `P3 ${runId}` },
    }), 201);
    remember('Timetable', slot.data);
  }

  const otherRegistration = expectSuccess(await api('/api/auth/register', {
    method: 'POST',
    authenticated: false,
    body: {
      name: `P3 Other ${runId}`,
      email: `p3-other-${runId}@example.invalid`,
      password: randomUUID() + randomUUID(),
    },
  }), 201);
  remember('User', otherRegistration.data.user.id);
  const otherPreference = await NotificationPreference.findOne({ user: otherRegistration.data.user.id }).select('_id').lean();
  if (otherPreference) remember('NotificationPreference', otherPreference._id);

  const ownerEvent = expectSuccess(await api(query('/api/events', { page: 1, pageSize: 1 })), 200).data[0];
  assert.equal((await api(`/api/events/${ownerEvent._id}`, { requestToken: otherRegistration.data.token })).status, 404);
  assert.equal((await api(`/api/events/${ownerEvent._id}`, {
    method: 'PUT',
    body: { title: 'Unauthorized update attempt' },
    requestToken: otherRegistration.data.token,
  })).status, 404);
  assert.equal((await api(`/api/events/${ownerEvent._id}`, {
    method: 'DELETE',
    requestToken: otherRegistration.data.token,
  })).status, 404);
  const ownerEventAfter = expectSuccess(await api(`/api/events/${ownerEvent._id}`), 200);
  assert.notEqual(ownerEventAfter.data.title, 'Unauthorized update attempt');
  assert.equal((await api('/api/tasks', {
    method: 'POST',
    requestToken: otherRegistration.data.token,
    body: {
      title: 'Foreign subject attempt',
      dueDate: '2035-06-01',
      subject: fixtureSubject._id,
    },
  })).status, 403);

  const eventFilter = { category: 'meeting', upcoming: 'true' };
  const taskFilter = { status: 'pending', priority: 'high' };
  const subjectFilter = {};
  const timetableFilter = { day: 'Monday' };
  for (const [path, filter] of [
    ['/api/events', eventFilter],
    ['/api/tasks', taskFilter],
    ['/api/subjects', subjectFilter],
    ['/api/timetable', timetableFilter],
    ['/api/attendance', {}],
  ]) {
    await assertPaginationContract(path, filter);
  }

  const [eventPage, taskPage, subjectPage, timetablePage] = await Promise.all([
    api(query('/api/events', { ...eventFilter, page: 1, pageSize: 12 })),
    api(query('/api/tasks', { ...taskFilter, page: 1, pageSize: 12 })),
    api(query('/api/subjects', { page: 1, pageSize: 12 })),
    api(query('/api/timetable', { ...timetableFilter, page: 1, pageSize: 12 })),
  ]);
  const crudCases = [
    { path: '/api/events', item: expectSuccess(eventPage, 200).data[0], update: { location: 'P3 verified' }, verify: (item) => item.location === 'P3 verified' },
    { path: '/api/tasks', item: expectSuccess(taskPage, 200).data[0], update: { description: 'P3 verified' }, verify: (item) => item.description === 'P3 verified' },
    { path: '/api/subjects', item: expectSuccess(subjectPage, 200).data[0], update: { instructor: 'P3 verified' }, verify: (item) => item.instructor === 'P3 verified' },
    { path: '/api/timetable', item: expectSuccess(timetablePage, 200).data[0], update: { room: 'P3 verified' }, verify: (item) => item.room === 'P3 verified' },
  ];
  for (const item of crudCases) {
    const update = expectSuccess(await api(`${item.path}/${item.item._id}`, { method: 'PUT', body: item.update }), 200);
    assert.equal(item.verify(update.data), true);
    const read = item.path === '/api/timetable'
      ? expectSuccess(await api(query(item.path, { day: 'Monday', page: 1, pageSize: 100 })), 200)
      : expectSuccess(await api(`${item.path}/${item.item._id}`), 200);
    const readRecord = item.path === '/api/subjects'
      ? read.data.subject
      : item.path === '/api/timetable'
        ? read.data.find((entry) => entry._id === item.item._id)
        : read.data;
    assert.equal(item.verify(readRecord), true);
  }

  await verifyDeleteBoundary('/api/events', eventFilter);
  await verifyDeleteBoundary('/api/tasks', taskFilter);
  await verifyDeleteBoundary('/api/subjects', subjectFilter);
  await verifyDeleteBoundary('/api/timetable', timetableFilter);

  await verifyOnlyRecordCase('/api/events', eventFilter);
  await verifyOnlyRecordCase('/api/tasks', taskFilter);
  await verifyOnlyRecordCase('/api/timetable', timetableFilter);
  await verifyOnlyRecordCase('/api/subjects', subjectFilter);

  const oldToken = token;
  const changedPassword = randomUUID() + randomUUID();
  const passwordResponse = expectSuccess(await api('/api/auth/change-password', {
    method: 'PUT',
    body: { currentPassword: ownerPassword, newPassword: changedPassword },
  }), 200);
  assert.ok(passwordResponse.data.token);
  assert.equal((await api('/api/auth/me', { requestToken: oldToken })).status, 401);
  token = passwordResponse.data.token;
  assert.equal(expectSuccess(await api('/api/auth/me'), 200).data.user.email, `p3-${runId}@example.invalid`);
});
