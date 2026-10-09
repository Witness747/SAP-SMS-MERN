if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}
const http = require('http');
const { assertJwtSecret, assertProductionConfig } = require('./src/config/env');
const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db');
const { startReminderScheduler, stopReminderScheduler } = require('./src/services/reminderService');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  assertJwtSecret();
  assertProductionConfig();
  const connected = await connectDB();
  if (!connected) {
    throw new Error('Database connection is required before the API can start.');
  }

  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log('==================================================');
    if (process.env.NODE_ENV !== 'test') {
      startReminderScheduler();
    }
    console.log(`🚀 SAP-SMS Backend Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API listening on port ${PORT} at /api`);
    console.log('🩺 Health Check: /api/health');
    console.log('==================================================');
  });

  // Graceful shutdown handlers
  let shuttingDown = false;
  const gracefulShutdown = async (signal, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received. Initiating graceful shutdown...`);
    await stopReminderScheduler();
    server.close(async () => {
      console.log('HTTP server closed.');
      await disconnectDB();
      console.log('Process terminated safely.');
      process.exit(exitCode);
    });

    // Force exit if not closed within 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Global uncaught error handling
  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled rejection (${err?.name || 'Error'}); shutting down.`);
    gracefulShutdown('unhandledRejection', 1);
  });

  process.on('uncaughtException', (err) => {
    console.error(`Uncaught exception (${err?.name || 'Error'}); shutting down.`);
    gracefulShutdown('uncaughtException', 1);
  });
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error(`Server startup failed (${error?.name || 'Error'}).`);
    process.exitCode = 1;
  });
}

module.exports = { startServer };
