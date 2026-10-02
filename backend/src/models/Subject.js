const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Subject must belong to a student user'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [100, 'Subject name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
      uppercase: true,
      maxlength: [20, 'Subject code cannot exceed 20 characters'],
    },
    instructor: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Instructor name cannot exceed 100 characters'],
    },
    credits: {
      type: Number,
      min: [0, 'Credits cannot be negative'],
      max: [20, 'Credits cannot exceed 20'],
      default: 3,
    },
    targetAttendance: {
      type: Number,
      min: [0, 'Target attendance cannot be negative'],
      max: [100, 'Target attendance cannot exceed 100%'],
      default: 75,
    },
    color: {
      type: String,
      trim: true,
      default: '#3B82F6', // Tailwind blue-500
    },
  },
  {
    timestamps: true,
  }
);

// Ensure subject code is unique per student user
subjectSchema.index({ user: 1, code: 1 }, { unique: true });

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;
