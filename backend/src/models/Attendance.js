const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Attendance record must belong to a user'],
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required for attendance tracking'],
    },
    attendedClasses: {
      type: Number,
      required: true,
      min: [0, 'Attended classes cannot be negative'],
      default: 0,
    },
    totalClasses: {
      type: Number,
      required: true,
      min: [0, 'Total classes cannot be negative'],
      default: 0,
      validate: {
        validator: function (val) {
          return val >= this.attendedClasses;
        },
        message: 'Total classes ({VALUE}) cannot be less than attended classes',
      },
    },
    targetPercentage: {
      type: Number,
      min: [0, 'Target percentage cannot be negative'],
      max: [100, 'Target percentage cannot exceed 100%'],
      default: 75,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Unique index: one attendance document per subject per student
attendanceSchema.index({ user: 1, subject: 1 }, { unique: true });

// Virtual: Current Attendance Percentage
attendanceSchema.virtual('percentage').get(function () {
  if (!this.totalClasses || this.totalClasses === 0) return 0;
  return Number(((this.attendedClasses / this.totalClasses) * 100).toFixed(2));
});

// Virtual: Number of classes needed to reach target percentage
// Formula: if current % < target %, need X more classes where (attended + X) / (total + X) >= target/100
// X = ceil((target * total - 100 * attended) / (100 - target))
attendanceSchema.virtual('classesNeeded').get(function () {
  const target = this.targetPercentage || 75;
  if (target >= 100) {
    // If target is 100%, can only reach if attended == total (otherwise already missed one class)
    return this.attendedClasses === this.totalClasses ? 0 : -1; // -1 means mathematically impossible if missed any
  }
  const currentPct = this.totalClasses > 0 ? (this.attendedClasses / this.totalClasses) * 100 : 0;
  if (currentPct >= target) return 0;

  const numerator = target * this.totalClasses - 100 * this.attendedClasses;
  const denominator = 100 - target;
  return Math.ceil(numerator / denominator);
});

// Virtual: Number of classes that can be missed ("bunks available") without falling below target
// Formula: (attended) / (total + Y) >= target/100
// Y = floor((100 * attended - target * total) / target)
attendanceSchema.virtual('bunksAvailable').get(function () {
  const target = this.targetPercentage || 75;
  if (target <= 0) return 999;
  const currentPct = this.totalClasses > 0 ? (this.attendedClasses / this.totalClasses) * 100 : 0;
  if (currentPct < target) return 0;

  const numerator = 100 * this.attendedClasses - target * this.totalClasses;
  return Math.floor(numerator / target);
});

// Virtual: Status indicator
attendanceSchema.virtual('status').get(function () {
  const target = this.targetPercentage || 75;
  const pct = this.totalClasses > 0 ? (this.attendedClasses / this.totalClasses) * 100 : 0;
  if (this.totalClasses === 0) return 'neutral';
  if (pct >= target) return 'safe';
  if (pct >= target - 10) return 'warning';
  return 'critical';
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
