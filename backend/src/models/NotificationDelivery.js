const mongoose = require('mongoose');

const notificationDeliverySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sourceType: { type: String, enum: ['task', 'event'], required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reminderWindow: { type: String, enum: ['24h', '1h'], required: true },
    status: { type: String, enum: ['processing', 'sent'], default: 'processing', required: true },
    claimedAt: { type: Date, default: Date.now, required: true },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationDeliverySchema.index(
  { user: 1, sourceType: 1, sourceId: 1, reminderWindow: 1 },
  { unique: true }
);

module.exports = mongoose.model('NotificationDelivery', notificationDeliverySchema);
