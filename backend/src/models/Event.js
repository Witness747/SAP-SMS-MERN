const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Event must belong to a user'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    time: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      enum: ['exam', 'assignment', 'presentation', 'deadline', 'meeting', 'personal', 'other'],
      default: 'exam',
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ user: 1, date: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
