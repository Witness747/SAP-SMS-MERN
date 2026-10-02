/**
 * Request validation helpers for create and update operations
 */

const mongoose = require('mongoose');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const TASK_STATUSES = ['pending', 'in-progress', 'completed'];
const EVENT_CATEGORIES = ['exam', 'assignment', 'presentation', 'deadline', 'meeting', 'personal', 'other'];
const TIMETABLE_TYPES = ['lecture', 'lab', 'tutorial', 'seminar'];
const ATTENDANCE_ACTIONS = ['present', 'absent', 'undo_present', 'undo_absent'];

const isValidObjectId = (id) => {
  if (id === null || id === undefined || id === '') return false;
  const str = String(id);
  return mongoose.Types.ObjectId.isValid(str) && String(new mongoose.Types.ObjectId(str)) === str;
};

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const validateTimeRange = (startTime, endTime) => {
  const errors = [];
  if (startTime && !TIME_RE.test(startTime)) {
    errors.push('Start time must use HH:MM 24-hour format');
  }
  if (endTime && !TIME_RE.test(endTime)) {
    errors.push('End time must use HH:MM 24-hour format');
  }
  if (startTime && endTime && TIME_RE.test(startTime) && TIME_RE.test(endTime) && timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    errors.push('Start time must be before end time');
  }
  return errors;
};

const validateEmail = (email) => EMAIL_RE.test(email);

const validateRegister = (data) => {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Full name is required');
  }
  if (!data.email || !validateEmail(data.email)) {
    errors.push('A valid email address is required');
  }
  if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  return errors;
};

const validateLogin = (data) => {
  const errors = [];
  if (!data.email || !validateEmail(data.email)) {
    errors.push('A valid email address is required');
  }
  if (!data.password) {
    errors.push('Password is required');
  }
  return errors;
};

const validateSubject = (data, { isUpdate = false } = {}) => {
  const errors = [];

  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Subject name is required');
    }
  }
  if (!isUpdate || data.code !== undefined) {
    if (!data.code || typeof data.code !== 'string' || data.code.trim().length === 0) {
      errors.push('Subject code is required');
    }
  }
  if (data.targetAttendance !== undefined && (isNaN(Number(data.targetAttendance)) || Number(data.targetAttendance) < 0 || Number(data.targetAttendance) > 100)) {
    errors.push('Target attendance must be between 0 and 100');
  }
  if (data.credits !== undefined && (isNaN(Number(data.credits)) || Number(data.credits) < 0 || Number(data.credits) > 20)) {
    errors.push('Credits must be between 0 and 20');
  }
  return errors;
};

const validateTask = (data, { isUpdate = false } = {}) => {
  const errors = [];

  if (!isUpdate || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Task title is required');
    }
  }
  if (!isUpdate || data.dueDate !== undefined) {
    if (!data.dueDate) {
      errors.push('Due date is required');
    } else if (isNaN(new Date(data.dueDate).getTime())) {
      errors.push('Invalid due date format');
    }
  }
  if (data.priority !== undefined && data.priority !== '' && !TASK_PRIORITIES.includes(data.priority)) {
    errors.push('Priority must be low, medium, high, or urgent');
  }
  if (data.status !== undefined && data.status !== '' && !TASK_STATUSES.includes(data.status)) {
    errors.push('Status must be pending, in-progress, or completed');
  }
  if (data.subject !== undefined && data.subject !== null && data.subject !== '' && !isValidObjectId(data.subject)) {
    errors.push('Invalid subject ID');
  }
  return errors;
};

const validateEvent = (data, { isUpdate = false } = {}) => {
  const errors = [];

  if (!isUpdate || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Event title is required');
    }
  }
  if (!isUpdate || data.date !== undefined) {
    if (!data.date) {
      errors.push('Event date is required');
    } else if (isNaN(new Date(data.date).getTime())) {
      errors.push('Invalid event date format');
    }
  }
  if (data.category !== undefined && data.category !== '' && !EVENT_CATEGORIES.includes(data.category)) {
    errors.push(`Category must be one of: ${EVENT_CATEGORIES.join(', ')}`);
  }
  if (data.time !== undefined && data.time !== '' && typeof data.time === 'string' && data.time.length > 20) {
    errors.push('Event time is too long');
  }
  return errors;
};

const validatePushSubscription = (subscription) => {
  const errors = [];
  if (!subscription || typeof subscription !== 'object' || Array.isArray(subscription)) {
    return ['Subscription must be an object'];
  }

  if (typeof subscription.endpoint !== 'string' || subscription.endpoint.length > 2048) {
    errors.push('Subscription endpoint must be a valid HTTPS URL');
  } else {
    try {
      const endpoint = new URL(subscription.endpoint);
      if (endpoint.protocol !== 'https:' || !endpoint.hostname || endpoint.username || endpoint.password) {
        errors.push('Subscription endpoint must be a valid HTTPS URL');
      }
    } catch {
      errors.push('Subscription endpoint must be a valid HTTPS URL');
    }
  }

  const keys = subscription.keys;
  if (!keys || typeof keys !== 'object' || Array.isArray(keys)) {
    errors.push('Subscription keys are required');
    return errors;
  }

  const isBase64Url = (value) => typeof value === 'string' && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);
  if (!isBase64Url(keys.p256dh) || Buffer.from(keys.p256dh, 'base64url').length !== 65) {
    errors.push('Subscription keys.p256dh must be a valid 65-byte base64url key');
  }
  if (!isBase64Url(keys.auth) || Buffer.from(keys.auth, 'base64url').length !== 16) {
    errors.push('Subscription keys.auth must be a valid 16-byte base64url key');
  }
  if (subscription.expirationTime !== undefined && subscription.expirationTime !== null &&
      (typeof subscription.expirationTime !== 'number' || !Number.isFinite(subscription.expirationTime) || subscription.expirationTime < 0 || subscription.expirationTime > 8640000000000000)) {
    errors.push('Subscription expirationTime must be a non-negative number or null');
  }
  return errors;
};

const validateAttendance = (data, { isUpdate = false } = {}) => {
  const errors = [];

  if (!isUpdate && !data.subject) {
    errors.push('Subject ID is required');
  }
  if (data.subject !== undefined && data.subject !== '' && !isValidObjectId(data.subject)) {
    errors.push('Invalid subject ID');
  }
  if (data.attendedClasses !== undefined && (isNaN(Number(data.attendedClasses)) || Number(data.attendedClasses) < 0)) {
    errors.push('Attended classes must be a non-negative number');
  }
  if (data.totalClasses !== undefined && (isNaN(Number(data.totalClasses)) || Number(data.totalClasses) < 0)) {
    errors.push('Total classes must be a non-negative number');
  }
  if (
    data.attendedClasses !== undefined &&
    data.totalClasses !== undefined &&
    Number(data.attendedClasses) > Number(data.totalClasses)
  ) {
    errors.push('Attended classes cannot be greater than total classes');
  }
  if (data.targetPercentage !== undefined && (isNaN(Number(data.targetPercentage)) || Number(data.targetPercentage) < 0 || Number(data.targetPercentage) > 100)) {
    errors.push('Target percentage must be between 0 and 100');
  }
  return errors;
};

const validateTimetable = (data, { isUpdate = false } = {}) => {
  const errors = [];

  if (!isUpdate || data.subject !== undefined) {
    if (!data.subject) {
      errors.push('Subject ID is required');
    } else if (!isValidObjectId(data.subject)) {
      errors.push('Invalid subject ID');
    }
  }
  if (!isUpdate || data.day !== undefined) {
    if (!data.day || !VALID_DAYS.includes(data.day)) {
      errors.push(`Day must be one of: ${VALID_DAYS.join(', ')}`);
    }
  }
  if (!isUpdate) {
    if (!data.startTime) errors.push('Start time is required (e.g. 09:00)');
    if (!data.endTime) errors.push('End time is required (e.g. 10:00)');
  }
  if (data.startTime || data.endTime) {
    errors.push(...validateTimeRange(data.startTime, data.endTime));
  }
  if (data.type !== undefined && data.type !== '' && !TIMETABLE_TYPES.includes(data.type)) {
    errors.push(`Type must be one of: ${TIMETABLE_TYPES.join(', ')}`);
  }

  return [...new Set(errors)];
};

module.exports = {
  validateRegister,
  validateLogin,
  validateSubject,
  validateTask,
  validateEvent,
  validatePushSubscription,
  validateAttendance,
  validateTimetable,
  validateTimeRange,
  TIME_RE,
  VALID_DAYS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  EVENT_CATEGORIES,
  TIMETABLE_TYPES,
  ATTENDANCE_ACTIONS,
  isValidObjectId,
};
