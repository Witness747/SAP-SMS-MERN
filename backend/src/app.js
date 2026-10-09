const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { apiLimiter } = require('./middleware/rateLimiters');
const { parseTrustProxyHops } = require('./config/env');
const { initWebPush } = require('./services/notificationService');
const { getDatabaseStatus } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const eventRoutes = require('./routes/eventRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.set('trust proxy', parseTrustProxyHops(process.env.TRUST_PROXY_HOPS));

initWebPush();

app.use(helmet());

const allowedOrigins = new Set();
if (process.env.NODE_ENV === 'production') {
  if (process.env.CLIENT_URL) allowedOrigins.add(process.env.CLIENT_URL);
} else {
  allowedOrigins.add(process.env.CLIENT_URL || 'http://localhost:5173');
  allowedOrigins.add('http://localhost:5173');
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('CORS: origin not permitted'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Timezone'],
  })
);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', async (req, res) => {
  const db = await getDatabaseStatus();
  const dbConnected = db.status === 'connected';

  return res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    status: dbConnected ? 'healthy' : 'degraded',
    application: 'alive',
    database: db.status,
    timestamp: new Date().toISOString(),
    service: 'SAP-SMS Backend API (MERN)',
    uptime: process.uptime(),
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'SAP-SMS REST API',
    description: 'Student Academic Planner and Student Management System (MERN Stack)',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      subjects: '/api/subjects',
      tasks: '/api/tasks',
      events: '/api/events',
      attendance: '/api/attendance',
      timetable: '/api/timetable',
      dashboard: '/api/dashboard',
      notifications: '/api/notifications',
      health: '/api/health',
    },
  });
});

// Keep health probes outside the general API limit while bounding API abuse.
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
