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
const isObjectBody = (data) => data !== null && typeof data === 'object' && !Array.isArray(data);
const hasValidString = (value, { min = 0, max = Infinity } = {}) =>
  typeof value === 'string' && value.trim().length >= min && value.length <= max;
const isNumericInput = (value) =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));
const hasOnlyKeys = (data, allowedKeys) => Object.keys(data).filter((key) => !allowedKeys.includes(key));

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
  if (!isObjectBody(data)) return ['Request body must be a JSON object'];
  const allowedFields = ['name', 'email', 'password', 'studentId', 'department', 'semester', 'institution'];
  const errors = hasOnlyKeys(data, allowedFields).map((field) => `Unexpected registration field: ${field}`);
  if (!hasValidString(data.name, { min: 1, max: 100 })) {
    errors.push('Full name is required');
  }
  if (!hasValidString(data.email, { min: 1, max: 254 }) || !validateEmail(data.email)) {
    errors.push('A valid email address is required');
  }
  if (!hasValidString(data.password, { min: 6 }) || Buffer.byteLength(data.password, 'utf8') > 72) {
    errors.push('Password must be at least 6 characters and no more than 72 UTF-8 bytes');
  }
  for (const [field, max] of [['studentId', 100], ['department', 100], ['semester', 100], ['institution', 150]]) {
    if (data[field] !== undefined && !hasValidString(data[field], { max })) {
      errors.push(`${field} must be a string no longer than ${max} characters`);
    }
  }
  return errors;
};

const validateLogin = (data) => {
  if (!isObjectBody(data)) return ['Request body must be a JSON object'];
  const errors = hasOnlyKeys(data, ['email', 'password']).map((field) => `Unexpected login field: ${field}`);
  if (!hasValidString(data.email, { min: 1, max: 254 }) || !validateEmail(data.email)) {
    errors.push('A valid email address is required');
  }
  if (typeof data.password !== 'string' || data.password.length === 0 || Buffer.byteLength(data.password, 'utf8') > 1024) {
    errors.push('Password is required');
  }
  return errors;
};

const PROFILE_FIELDS = ['name', 'email', 'studentId', 'department', 'semester', 'institution', 'phone', 'avatar'];
const validateProfileUpdate = (data) => {
  if (!isObjectBody(data)) return ['Request body must be a JSON object'];
  const errors = hasOnlyKeys(data, PROFILE_FIELDS).map((field) => `Unexpected profile field: ${field}`);
  const limits = { name: 100, studentId: 100, department: 100, semester: 100, institution: 150, phone: 40, avatar: 2048 };
  for (const [field, max] of Object.entries(limits)) {
    if (data[field] !== undefined && !hasValidString(data[field], { max })) {
      errors.push(`${field} must be a string no longer than ${max} characters`);
    }
  }
  if (typeof data.name === 'string' && data.name.trim().length === 0) errors.push('Full name cannot be empty');
  // Email remains accepted for compatibility with the profile form but is read-only.
  if (data.email !== undefined && (!hasValidString(data.email, { min: 1, max: 254 }) || !validateEmail(data.email))) {
    errors.push('A valid email address is required');
  }
  return errors;
};

const validatePasswordChange = (data) => {
  if (!isObjectBody(data)) return ['Request body must be a JSON object'];
  const errors = hasOnlyKeys(data, ['currentPassword', 'newPassword']).map((field) => `Unexpected password field: ${field}`);
  if (typeof data.currentPassword !== 'string' || data.currentPassword.length === 0 || Buffer.byteLength(data.currentPassword, 'utf8') > 1024) {
    errors.push('Current password is required');
  }
  if (!hasValidString(data.newPassword, { min: 6 }) || Buffer.byteLength(data.newPassword, 'utf8') > 72) {
    errors.push('New password must be at least 6 characters and no more than 72 UTF-8 bytes');
  }
  return errors;
};

const NOTIFICATION_PREFERENCE_FIELDS = ['taskReminders', 'eventReminders', 'attendanceWarnings', 'timetableReminders'];
const validateNotificationPreferences = (data) => {
  if (!isObjectBody(data)) return ['Request body must be a JSON object'];
  const errors = hasOnlyKeys(data, NOTIFICATION_PREFERENCE_FIELDS).map((field) => `Unexpected notification preference field: ${field}`);
  for (const field of NOTIFICATION_PREFERENCE_FIELDS) {
    if (data[field] !== undefined && typeof data[field] !== 'boolean') errors.push(`${field} must be a boolean`);
  }
  return errors;
};

const validateSubject = (data, { isUpdate = false } = {}) => {
  if (!isObjectBody(data)) return ['Request body must be a JSON object'];
  const errors = [];

  if (!isUpdate || data.name !== undefined) {
    if (!hasValidString(data.name, { min: 1, max: 100 })) {
      errors.push('Subject name is required');
    }
  }
  if (!isUpdate || data.code !== undefined) {
    if (!hasValidString(data.code, { min: 1, max: 20 })) {
      errors.push('Subject code is required');
    }
  }
  if (data.targetAttendance !== undefined && (!isNumericInput(data.targetAttendance) || Number(data.targetAttendance) < 0 || Number(data.targetAttendance) > 100)) {
    errors.push('Target attendance must be between 0 and 100');
  }
  if (data.credits !== undefined && (!isNumericInput(data.credits) || Number(data.credits) < 0 || Number(data.credits) > 20)) {
    errors.push('Credits must be between 0 and 20');
  }
  for (const [field, max] of [['instructor', 100], ['color', 100]]) {
    if (data[field] !== undefined && !hasValidString(data[field], { max })) errors.push(`${field} must be a string no longer than ${max} characters`);
  }
  return errors;
};

const validateTask = (data, { isUpdate = false } = {}) => {
  if (!isObjectBody(data)) return ['Request body must be a JSON object'];
  const errors = [];

  if (!isUpdate || data.title !== undefined) {
    if (!hasValidString(data.title, { min: 1, max: 200 })) {
      errors.push('Task title is required');
    }
  }
  if (!isUpdate || data.dueDate !== undefined) {
    if (!data.dueDate) {
      errors.push('Due date is required');
    } else if ((typeof data.dueDate !== 'string' && typeof data.dueDate !== 'number') || isNaN(new Date(data.dueDate).getTime())) {
      errors.push('Invalid due date format');
    }
  }
  if (data.description !== undefined && !hasValidString(data.description, { max: 2000 })) errors.push('Task description must be a string no longer than 2000 characters');
  if (data.priority !== undefined && data.priority !== '' && (typeof data.priority !== 'string' || !TASK_PRIORITIES.includes(data.priority))) {
    errors.push('Priority must be low, medium, high, or urgent');
  }
  if (data.status !== undefined && data.status !== '' && (typeof data.status !== 'string' || !TASK_STATUSES.includes(data.status))) {
    errors.push('Status must be pending, in-progress, or completed');
  }
  if (data.subject !== undefined && data.subject !== null && data.subject !== '' && !isValidObjectId(data.subject)) {
    errors.push('Invalid subject ID');
  }
  return errors;
};

const validateEvent = (data, { isUpdate = false } = {}) => {
  if (!isObjectBody(data)) return ['Request body must be a JSON object'];
  const errors = [];

  if (!isUpdate || data.title !== undefined) {
    if (!hasValidString(data.title, { min: 1, max: 200 })) {
      errors.push('Event title is required');
    }
  }
  if (!isUpdate || data.date !== undefined) {
    if (!data.date) {
      errors.push('Event date is required');
    } else if ((typeof data.date !== 'string' && typeof data.date !== 'number') || isNaN(new Date(data.date).getTime())) {
      errors.push('Invalid event date format');
    }
  }
  for (const [field, max] of [['description', 2000], ['time', 20], ['location', 200]]) {
    if (data[field] !== undefined && !hasValidString(data[field], { max })) errors.push(`Event ${field} must be a string no longer than ${max} characters`);
  }
  if (data.category !== undefined && data.category !== '' && (typeof data.category !== 'string' || !EVENT_CATEGORIES.includes(data.category))) {
    errors.push(`Category must be one of: ${EVENT_CATEGORIES.join(', ')}`);
  }
  if (data.time !== undefined && data.time !== '' && typeof data.time === 'string' && data.time.length > 20) {
    errors.push('Event time is too long');
  }
  return errors;
};

const validatePushEndpoint = (value) => {
  if (typeof value !== 'string' || value.length > 2048) {
    return ['Subscription endpoint must be a valid HTTPS URL'];
  }

  try {
    const endpoint = new URL(value);
    const host = endpoint.hostname.toLowerCase();
    const trustedPushHosts = [
      'fcm.googleapis.com',
      'push.services.mozilla.com',
      'push.apple.com',
      'notify.windows.com',
      'wns.windows.com',
    ];
    const isTrustedPushHost = trustedPushHosts.some((domain) => host === domain || host.endsWith(`.${domain}`));
    if (endpoint.protocol !== 'https:' || !endpoint.hostname || (endpoint.port && endpoint.port !== '443') || endpoint.username || endpoint.password || !isTrustedPushHost) {
      return ['Subscription endpoint must be a valid HTTPS URL'];
    }
  } catch {
    return ['Subscription endpoint must be a valid HTTPS URL'];
  }

  return [];
};

const validatePushSubscription = (subscription) => {
  const errors = [];
  if (!subscription || typeof subscription !== 'object' || Array.isArray(subscription)) {
    return ['Subscription must be an object'];
  }

  errors.push(...validatePushEndpoint(subscription.endpoint));

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
  if (!isObjectBody(data)) return ['Request body must be a JSON object'];
  const errors = [];

  if (!isUpdate && !data.subject) {
    errors.push('Subject ID is required');
  }
  if (data.subject !== undefined && data.subject !== '' && !isValidObjectId(data.subject)) {
    errors.push('Invalid subject ID');
  }
  if (data.attendedClasses !== undefined && (!isNumericInput(data.attendedClasses) || Number(data.attendedClasses) < 0)) {
    errors.push('Attended classes must be a non-negative number');
  }
  if (data.totalClasses !== undefined && (!isNumericInput(data.totalClasses) || Number(data.totalClasses) < 0)) {
    errors.push('Total classes must be a non-negative number');
  }
  if (
    data.attendedClasses !== undefined &&
    data.totalClasses !== undefined &&
    Number(data.attendedClasses) > Number(data.totalClasses)
  ) {
    errors.push('Attended classes cannot be greater than total classes');
  }
  if (data.targetPercentage !== undefined && (!isNumericInput(data.targetPercentage) || Number(data.targetPercentage) < 0 || Number(data.targetPercentage) > 100)) {
    errors.push('Target percentage must be between 0 and 100');
  }
  return errors;
};

const validateTimetable = (data, { isUpdate = false } = {}) => {
  if (!isObjectBody(data)) return ['Request body must be a JSON object'];
  const errors = [];

  if (!isUpdate || data.subject !== undefined) {
    if (!data.subject) {
      errors.push('Subject ID is required');
    } else if (typeof data.subject !== 'string' || !isValidObjectId(data.subject)) {
      errors.push('Invalid subject ID');
    }
  }
  if (!isUpdate || data.day !== undefined) {
    if (typeof data.day !== 'string' || !VALID_DAYS.includes(data.day)) {
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
  for (const [field, max] of [['startTime', 5], ['endTime', 5], ['room', 50]]) {
    if (data[field] !== undefined && !hasValidString(data[field], { max })) errors.push(`${field} must be a string no longer than ${max} characters`);
  }
  if (data.type !== undefined && data.type !== '' && (typeof data.type !== 'string' || !TIMETABLE_TYPES.includes(data.type))) {
    errors.push(`Type must be one of: ${TIMETABLE_TYPES.join(', ')}`);
  }

  return [...new Set(errors)];
};

module.exports = {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateNotificationPreferences,
  validateSubject,
  validateTask,
  validateEvent,
  validatePushSubscription,
  validatePushEndpoint,
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
