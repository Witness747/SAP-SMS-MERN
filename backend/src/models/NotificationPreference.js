const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification preferences must belong to a user'],
      unique: true,
      index: true,
    },
    taskReminders: {
      type: Boolean,
      default: true,
    },
    eventReminders: {
      type: Boolean,
      default: true,
    },
    attendanceWarnings: {
      type: Boolean,
      default: true,
    },
    timetableReminders: {
      type: Boolean,
      default: true,
    },
    timeZone: {
      type: String,
      default: null,
    },
    pushSubscription: {
      endpoint: { type: String, default: null },
      expirationTime: { type: Date, default: null },
      keys: {
        p256dh: { type: String, default: null },
        auth: { type: String, default: null },
      },
    },
  },
  {
    timestamps: true,
  }
);

const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);

module.exports = NotificationPreference;
