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
 * @returns {Promise<boolean>} Success status
 */
const sendPushNotification = async (subscription, payload) => {
  if (!isPushConfigured || !subscription || !subscription.endpoint) {
    return false;
  }

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
    return true;
  } catch (error) {
    console.error(`Failed to send web push notification: ${error.message}`);
    return false;
  }
};

module.exports = {
  initWebPush,
  sendPushNotification,
  isPushConfigured: () => isPushConfigured,
};
