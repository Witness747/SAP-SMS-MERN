const NotificationPreference = require('../models/NotificationPreference');
const { sendPushNotification, isPushConfigured } = require('../services/notificationService');
const { successResponse, errorResponse } = require('../utils/responseHandler');

/**
 * @desc    Get user's notification preferences
 * @route   GET /api/notifications/preferences
 * @access  Private
 */
const getPreferences = async (req, res, next) => {
  try {
    let prefs = await NotificationPreference.findOne({ user: req.user._id });
    if (!prefs) {
      prefs = await NotificationPreference.create({ user: req.user._id });
    }

    return successResponse(res, 200, 'Notification preferences retrieved', {
      preferences: {
        taskReminders: prefs.taskReminders,
        eventReminders: prefs.eventReminders,
        attendanceWarnings: prefs.attendanceWarnings,
        timetableReminders: prefs.timetableReminders,
        isPushSubscribed: Boolean(prefs.pushSubscription && prefs.pushSubscription.endpoint),
      },
      pushConfiguredOnServer: isPushConfigured(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update notification preferences
 * @route   PUT /api/notifications/preferences
 * @access  Private
 */
const updatePreferences = async (req, res, next) => {
  try {
    const { taskReminders, eventReminders, attendanceWarnings, timetableReminders } = req.body;

    let prefs = await NotificationPreference.findOne({ user: req.user._id });
    if (!prefs) {
      prefs = new NotificationPreference({ user: req.user._id });
    }

    if (taskReminders !== undefined) prefs.taskReminders = Boolean(taskReminders);
    if (eventReminders !== undefined) prefs.eventReminders = Boolean(eventReminders);
    if (attendanceWarnings !== undefined) prefs.attendanceWarnings = Boolean(attendanceWarnings);
    if (timetableReminders !== undefined) prefs.timetableReminders = Boolean(timetableReminders);

    await prefs.save();

    return successResponse(res, 200, 'Notification preferences updated', {
      preferences: {
        taskReminders: prefs.taskReminders,
        eventReminders: prefs.eventReminders,
        attendanceWarnings: prefs.attendanceWarnings,
        timetableReminders: prefs.timetableReminders,
        isPushSubscribed: Boolean(prefs.pushSubscription && prefs.pushSubscription.endpoint),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Save Web Push Subscription from client browser
 * @route   POST /api/notifications/subscribe
 * @access  Private
 */
const subscribePush = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return errorResponse(res, 400, 'Invalid subscription object');
    }

    let prefs = await NotificationPreference.findOne({ user: req.user._id });
    if (!prefs) {
      prefs = new NotificationPreference({ user: req.user._id });
    }

    prefs.pushSubscription = subscription;
    await prefs.save();

    return successResponse(res, 200, 'Web push subscription saved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get VAPID Public Key for client subscription setup
 * @route   GET /api/notifications/vapid-key
 * @access  Private
 */
const getVapidPublicKey = async (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  return successResponse(res, 200, 'VAPID Public Key', {
    publicKey,
    configured: Boolean(publicKey),
  });
};

/**
 * @desc    Send a test notification to verified subscription
 * @route   POST /api/notifications/test
 * @access  Private
 */
const sendTestNotification = async (req, res, next) => {
  try {
    const prefs = await NotificationPreference.findOne({ user: req.user._id });

    if (!prefs || !prefs.pushSubscription || !prefs.pushSubscription.endpoint) {
      return successResponse(res, 200, 'In-app notification simulated (Browser push subscription is not active).', {
        type: 'simulated',
        title: 'SAP-SMS Test Alert',
        body: 'This is a test notification. Enable browser push permission to receive system notifications.',
      });
    }

    const payload = {
      title: 'SAP-SMS Test Notification',
      body: 'Your notification system is operating smoothly! 🚀',
      url: '/dashboard',
    };

    const sent = await sendPushNotification(prefs.pushSubscription, payload);

    if (sent) {
      return successResponse(res, 200, 'Test push notification sent successfully!', { type: 'push' });
    } else {
      return successResponse(res, 200, 'Push server not configured with active VAPID keys; client in-app notification test succeeded.', {
        type: 'simulated',
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPreferences,
  updatePreferences,
  subscribePush,
  getVapidPublicKey,
  sendTestNotification,
};
