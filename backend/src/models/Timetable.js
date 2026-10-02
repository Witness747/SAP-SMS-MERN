const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Timetable entry must belong to a user'],
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required for timetable entry'],
    },
    day: {
      type: String,
      required: [true, 'Day of week is required'],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required (e.g., 09:00)'],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, 'End time is required (e.g., 10:00)'],
      trim: true,
    },
    room: {
      type: String,
      trim: true,
      default: '',
      maxlength: [50, 'Room name cannot exceed 50 characters'],
    },
    type: {
      type: String,
      enum: ['lecture', 'lab', 'tutorial', 'seminar'],
      default: 'lecture',
    },
  },
  {
    timestamps: true,
  }
);

timetableSchema.index({ user: 1, day: 1, startTime: 1 });

const Timetable = mongoose.model('Timetable', timetableSchema);

module.exports = Timetable;
