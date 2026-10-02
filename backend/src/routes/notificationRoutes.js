const express = require('express');
const router = express.Router();
const {
  getPreferences,
  updatePreferences,
  subscribePush,
  getSubscriptionStatus,
  unsubscribePush,
  getVapidPublicKey,
  sendTestNotification,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/preferences')
  .get(getPreferences)
  .put(updatePreferences);

router.post('/subscribe', subscribePush);
router.post('/subscription/status', getSubscriptionStatus);
router.delete('/subscription', unsubscribePush);
router.get('/vapid-key', getVapidPublicKey);
router.post('/test', sendTestNotification);

module.exports = router;
