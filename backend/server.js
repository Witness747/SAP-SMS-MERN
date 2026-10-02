require('dotenv').config();
const http = require('http');
const { assertJwtSecret } = require('./src/config/env');
const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db');
const { startReminderScheduler, stopReminderScheduler } = require('./src/services/reminderService');

assertJwtSecret();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log('==================================================');
    startReminderScheduler();
    console.log(`🚀 SAP-SMS Backend Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Base API URL: http://localhost:${PORT}/api`);
    console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
    console.log('==================================================');
  });

  // Graceful shutdown handlers
  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Initiating graceful shutdown...`);
    await stopReminderScheduler();
    server.close(async () => {
      console.log('HTTP server closed.');
      await disconnectDB();
      console.log('Process terminated safely.');
      process.exit(0);
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
    console.error(`💥 Unhandled Rejection: ${err.message}`);
    // In production we would log and potentially restart
  });

  process.on('uncaughtException', (err) => {
    console.error(`💥 Uncaught Exception: ${err.message}`);
    process.exit(1);
  });
};

startServer();
