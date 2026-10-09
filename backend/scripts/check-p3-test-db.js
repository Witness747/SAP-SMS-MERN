if (process.env.NODE_ENV !== 'test') {
  throw new Error('Set NODE_ENV=test before running the P3 database preflight.');
}

const {
  connectDB,
  disconnectDB,
  assertTestDatabaseEmpty,
} = require('../src/config/db');

(async () => {
  try {
    await connectDB();
    await assertTestDatabaseEmpty();
    console.log('P3 test database identity verified and database is empty.');
  } finally {
    await disconnectDB();
  }
})().catch(() => {
  console.error('P3 test database preflight failed; no test fixtures were written.');
  process.exitCode = 1;
});
