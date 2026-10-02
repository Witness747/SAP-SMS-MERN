const webpush = require('web-push');

/**
 * Web Push Notification Service
 * Integrates Web Push with graceful fallback if VAPID keys are absent
 */

let isPushConfigured = false;

const initWebPush = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@sap-sms.local';

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      isPushConfigured = true;
      console.log('✅ Web Push initialized with VAPID credentials.');
    } catch (err) {
      console.warn(`⚠️ Failed to initialize VAPID credentials: ${err.message}`);
      isPushConfigured = false;
    }
  } else {
    // Graceful fallback - web push is optional for local development
    console.log('ℹ️ Web Push not configured: VAPID keys are not present in .env (app runs normally).');
    isPushConfigured = false;
  }
};

/**
 * Send push notification to a client subscription
 * @param {object} subscription - Web push subscription object
 * @param {object} payload - Notification data { title, body, icon, url, data }
 * @returns {Promise<{status: string, statusCode?: number}>} Delivery outcome
 */
const sendPushNotification = async (subscription, payload) => {
  if (!isPushConfigured) return { status: 'vapid_unavailable' };
  if (!subscription || !subscription.endpoint) return { status: 'no_subscription' };

  try {
    const stringifiedPayload = JSON.stringify({
      title: payload.title || 'SAP-SMS Notification',
      body: payload.body || '',
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-192x192.png',
      data: {
        url: payload.url || '/',
        ...payload.data,
      },
    });

    await webpush.sendNotification(subscription, stringifiedPayload);
    return { status: 'sent_to_push_service' };
  } catch (error) {
    const statusCode = Number(error.statusCode) || undefined;
    let status = 'delivery_failed';
    if (statusCode === 404 || statusCode === 410) status = 'stale_subscription';
    else if (statusCode === 401 || statusCode === 403) status = 'push_service_auth_failed';
    else if (!statusCode || statusCode === 408 || statusCode === 429 || statusCode >= 500) status = 'transient_failure';
    console.error(`Failed to send web push notification (${statusCode || error.code || error.name || 'unknown'}).`);
    return { status, statusCode, code: error.code || undefined };
  }
};

const clearPushSubscription = async (userId, endpoint) => {
  const NotificationPreference = require('../models/NotificationPreference');
  return NotificationPreference.updateOne(
    { user: userId, 'pushSubscription.endpoint': endpoint },
    {
      $set: {
        'pushSubscription.endpoint': null,
        'pushSubscription.expirationTime': null,
        'pushSubscription.keys.p256dh': null,
        'pushSubscription.keys.auth': null,
      },
    }
  );
};

module.exports = {
  initWebPush,
  sendPushNotification,
  clearPushSubscription,
  isPushConfigured: () => isPushConfigured,
};
