const NotificationPreference = require('../models/NotificationPreference');
const { sendPushNotification, clearPushSubscription, isPushConfigured } = require('../services/notificationService');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { isValidTimeZone } = require('../utils/timezone');
const { validatePushSubscription } = require('../validators');

const updatePreferenceTimeZone = (prefs, req) => {
  const timeZone = req.get('X-Client-Timezone');
  if (isValidTimeZone(timeZone)) prefs.timeZone = timeZone;
};

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
    updatePreferenceTimeZone(prefs, req);
    if (prefs.isModified('timeZone')) await prefs.save();

    return successResponse(res, 200, 'Notification preferences retrieved', {
      preferences: {
        taskReminders: prefs.taskReminders,
        eventReminders: prefs.eventReminders,
        attendanceWarnings: prefs.attendanceWarnings,
        timetableReminders: prefs.timetableReminders,
        hasStoredPushSubscription: Boolean(prefs.pushSubscription && prefs.pushSubscription.endpoint),
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
    updatePreferenceTimeZone(prefs, req);

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
        hasStoredPushSubscription: Boolean(prefs.pushSubscription && prefs.pushSubscription.endpoint),
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
    const subscription = req.body?.subscription;
    const validationErrors = validatePushSubscription(subscription);
    if (validationErrors.length) {
      return errorResponse(res, 400, 'Invalid push subscription', validationErrors);
    }

    const endpointOwner = await NotificationPreference.findOne({
      user: { $ne: req.user._id },
      'pushSubscription.endpoint': subscription.endpoint,
    }).select('user');
    if (endpointOwner) {
      return errorResponse(res, 409, 'This browser subscription is already registered to another account. Unsubscribe from that account first.');
    }

    let prefs = await NotificationPreference.findOne({ user: req.user._id });
    if (!prefs) {
      prefs = new NotificationPreference({ user: req.user._id });
    }

    prefs.pushSubscription = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime == null ? null : new Date(subscription.expirationTime),
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    };
    await prefs.save();

    return successResponse(res, 200, 'Web push subscription saved successfully', { registered: true });
  } catch (error) {
    next(error);
  }
};

/** Report whether the current browser endpoint is registered to this account. */
const getSubscriptionStatus = async (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint;
    if (endpoint !== undefined && endpoint !== null && endpoint !== '') {
      let parsed;
      try { parsed = new URL(endpoint); } catch { parsed = null; }
      if (typeof endpoint !== 'string' || !parsed || parsed.protocol !== 'https:' || !parsed.hostname) {
        return errorResponse(res, 400, 'Browser subscription endpoint must be a valid HTTPS URL');
      }
    }
    const prefs = await NotificationPreference.findOne({ user: req.user._id }).select('pushSubscription.endpoint');
    const storedEndpoint = prefs?.pushSubscription?.endpoint || null;
    return successResponse(res, 200, 'Push subscription status retrieved', {
      browserSubscribed: Boolean(endpoint),
      serverHasSubscription: Boolean(storedEndpoint),
      serverRegisteredForBrowser: Boolean(endpoint && storedEndpoint === endpoint),
      pushConfigured: isPushConfigured(),
    });
  } catch (error) {
    next(error);
  }
};

/** Remove only the authenticated user's server-side subscription. */
const unsubscribePush = async (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint;
    if (endpoint !== undefined && endpoint !== null && endpoint !== '') {
      let parsed;
      try { parsed = new URL(endpoint); } catch { parsed = null; }
      if (typeof endpoint !== 'string' || !parsed || parsed.protocol !== 'https:' || !parsed.hostname) {
        return errorResponse(res, 400, 'Browser subscription endpoint must be a valid HTTPS URL');
      }
    }
    const query = { user: req.user._id };
    if (endpoint) query['pushSubscription.endpoint'] = endpoint;
    const prefs = await NotificationPreference.findOne(query);
    const browserWasRegistered = Boolean(endpoint && prefs?.pushSubscription?.endpoint === endpoint);
    if (prefs) {
      prefs.pushSubscription = {
        endpoint: null,
        expirationTime: null,
        keys: { p256dh: null, auth: null },
      };
      await prefs.save();
    }
    return successResponse(res, 200, 'Push subscription removed from this account', {
      removed: Boolean(prefs),
      browserWasRegistered,
    });
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
  const publicKey = isPushConfigured() ? process.env.VAPID_PUBLIC_KEY : '';
  return successResponse(res, 200, 'VAPID Public Key', {
    publicKey: publicKey || '',
    configured: isPushConfigured(),
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
      return successResponse(res, 200, 'No push subscription is registered for this account.', {
        status: 'no_subscription',
      });
    }

    if (!isPushConfigured()) {
      return successResponse(res, 200, 'Web Push is unavailable because VAPID keys are not configured.', {
        status: 'vapid_unavailable',
      });
    }

    const payload = {
      title: 'SAP-SMS Test Notification',
      body: 'Your notification system is operating smoothly! 🚀',
      url: '/dashboard',
    };

    const delivery = await sendPushNotification(prefs.pushSubscription, payload);
    if (delivery.status === 'stale_subscription') {
      await clearPushSubscription(req.user._id, prefs.pushSubscription.endpoint);
    } else {
      if (delivery.status === 'sent_to_push_service') {
        return successResponse(res, 200, 'Push service accepted the test notification. Browser display is not confirmed.', {
          status: 'sent_to_push_service',
        });
      }
    }
    const message = delivery.status === 'stale_subscription'
      ? 'The push service confirmed this subscription is gone; it was removed from this account.'
      : 'Push delivery failed. The subscription was retained.';
    return successResponse(res, 200, message, {
      status: delivery.status,
      statusCode: delivery.statusCode,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPreferences,
  updatePreferences,
  subscribePush,
  getSubscriptionStatus,
  unsubscribePush,
  getVapidPublicKey,
  sendTestNotification,
};
