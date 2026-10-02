const NotificationPreference = require('../models/NotificationPreference');
const NotificationDelivery = require('../models/NotificationDelivery');
const Task = require('../models/Task');
const Event = require('../models/Event');
const { sendPushNotification, clearPushSubscription, isPushConfigured } = require('./notificationService');
const { DEFAULT_TIMEZONE, isValidTimeZone } = require('../utils/timezone');

const REMINDER_WINDOWS = [
  { key: '24h', milliseconds: 24 * 60 * 60 * 1000, label: '24 hours' },
  { key: '1h', milliseconds: 60 * 60 * 1000, label: '1 hour' },
];
const SCAN_INTERVAL_MS = 60 * 1000;
const CLAIM_LEASE_MS = 5 * 60 * 1000;
const DEFAULT_EVENT_TIME = '09:00';

let activeRun = null;
let timer = null;

const getZonedParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour'), minute: value('minute'), second: value('second') };
};

// Convert a local calendar date/time into an instant, including timezone/DST offset.
const zonedLocalDateToUtc = (year, month, day, hour, minute, timeZone) => {
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = desired;
  for (let i = 0; i < 3; i += 1) {
    const parts = getZonedParts(new Date(candidate), timeZone);
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    candidate += desired - represented;
  }
  return new Date(candidate);
};

// Task dueDate and Event date are date-only values stored as UTC midnight.
// Preserve that calendar date, then interpret the associated clock time locally.
const getCalendarDateParts = (date) => ({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth() + 1,
  day: date.getUTCDate(),
});

const parseLocalTime = (value, fallback) => {
  const match = typeof value === 'string' && value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? [Number(match[1]), Number(match[2])] : fallback;
};

const getTaskDueInstant = (task, timeZone) => {
  const parts = getCalendarDateParts(task.dueDate);
  return zonedLocalDateToUtc(parts.year, parts.month, parts.day, 23, 59, timeZone);
};

const getEventInstant = (event, timeZone) => {
  const parts = getCalendarDateParts(event.date);
  const [hour, minute] = parseLocalTime(event.time, [9, 0]);
  return zonedLocalDateToUtc(parts.year, parts.month, parts.day, hour, minute, timeZone);
};

const getReminderTimeZone = (prefs) => {
  if (isValidTimeZone(prefs.timeZone)) return prefs.timeZone;
  if (isValidTimeZone(process.env.APP_TIMEZONE)) return process.env.APP_TIMEZONE;
  return DEFAULT_TIMEZONE;
};

const claimDelivery = async (reminder) => {
  const identity = {
    user: reminder.user,
    sourceType: reminder.sourceType,
    sourceId: reminder.sourceId,
    reminderWindow: reminder.window.key,
  };
  const now = new Date();
  try {
    await NotificationDelivery.create({ ...identity, status: 'processing', claimedAt: now });
    return identity;
  } catch (error) {
    if (error.code !== 11000) throw error;
    // Recover a claim left behind by a process crash. The lease limits normal races.
    const recovered = await NotificationDelivery.findOneAndUpdate(
      { ...identity, status: 'processing', claimedAt: { $lt: new Date(now.getTime() - CLAIM_LEASE_MS) } },
      { $set: { claimedAt: now } },
      { new: true }
    );
    return recovered ? identity : null;
  }
};

const deliverReminder = async (reminder) => {
  const identity = await claimDelivery(reminder);
  if (!identity) {
    console.log(`[reminders] skipped already claimed/delivered: ${reminder.sourceType} ${reminder.sourceId} (${reminder.window.key})`);
    return false;
  }

  const title = reminder.sourceType === 'task' ? 'Task reminder' : `${reminder.source.category || 'Event'} reminder`;
  const payload = {
    title,
    body: `${reminder.source.title} is due in ${reminder.window.label}.`,
    url: reminder.sourceType === 'task' ? '/tasks' : '/events',
    data: { sourceType: reminder.sourceType, sourceId: String(reminder.sourceId) },
  };

  const delivery = await sendPushNotification(reminder.subscription, payload);
  if (delivery.status !== 'sent_to_push_service') {
    await NotificationDelivery.deleteOne(identity);
    if (delivery.status === 'stale_subscription') {
      await clearPushSubscription(reminder.user, reminder.subscription.endpoint);
    }
    console.error(`[reminders] delivery failed (${delivery.status}${delivery.statusCode ? ` ${delivery.statusCode}` : ''}): ${reminder.sourceType} ${reminder.sourceId} user ${reminder.user} (${reminder.window.key})`);
    return false;
  }

  await NotificationDelivery.updateOne(identity, { $set: { status: 'sent', deliveredAt: new Date() } });
  console.log(`[reminders] notification sent: ${reminder.sourceType} ${reminder.sourceId} user ${reminder.user} (${reminder.window.key})`);
  return true;
};

const processDueReminders = async ({ now = new Date() } = {}) => {
  if (activeRun) return activeRun;
  activeRun = (async () => {
    console.log('[reminders] scan started');
    if (!isPushConfigured()) {
      console.log('[reminders] delivery skipped: VAPID push is not configured');
      return { sent: 0, skipped: 0 };
    }

    const lowerBound = now.getTime() - SCAN_INTERVAL_MS;
    const preferences = await NotificationPreference.find({
      pushSubscription: { $exists: true },
      'pushSubscription.endpoint': { $type: 'string', $ne: '' },
    }).lean();
    const prefsByUser = new Map(preferences.map((prefs) => [String(prefs.user), prefs]));
    let sent = 0;
    let skipped = 0;
    const candidates = [];

    for (const prefs of preferences) {
      if (prefs.taskReminders !== false) {
        const tasks = await Task.find({ user: prefs.user, status: { $ne: 'completed' } }).lean();
        for (const task of tasks) candidates.push({ sourceType: 'task', sourceId: task._id, user: prefs.user, source: task, dueAt: getTaskDueInstant(task, getReminderTimeZone(prefs)), subscription: prefs.pushSubscription });
      } else {
        console.log(`[reminders] task reminders disabled for user ${prefs.user}`);
      }
      if (prefs.eventReminders !== false) {
        const events = await Event.find({ user: prefs.user }).lean();
        for (const event of events) candidates.push({ sourceType: 'event', sourceId: event._id, user: prefs.user, source: event, dueAt: getEventInstant(event, getReminderTimeZone(prefs)), subscription: prefs.pushSubscription });
      } else {
        console.log(`[reminders] event reminders disabled for user ${prefs.user}`);
      }
    }

    const dueReminders = [];
    for (const candidate of candidates) {
      if (candidate.dueAt <= now) continue;
      for (const window of REMINDER_WINDOWS) {
        const reminderAt = candidate.dueAt.getTime() - window.milliseconds;
        if (reminderAt > lowerBound && reminderAt <= now.getTime()) {
          dueReminders.push({ ...candidate, window });
        }
      }
    }
    console.log(`[reminders] ${dueReminders.length} reminder(s) in scan window`);

    for (const reminder of dueReminders) {
      const prefs = prefsByUser.get(String(reminder.user));
      if (!prefs || (reminder.sourceType === 'task' && prefs.taskReminders === false) || (reminder.sourceType === 'event' && prefs.eventReminders === false)) {
        skipped += 1;
        continue;
      }
      try {
        if (await deliverReminder(reminder)) sent += 1;
        else skipped += 1;
      } catch (error) {
        skipped += 1;
        console.error(`[reminders] delivery failed: ${reminder.sourceType} ${reminder.sourceId} user ${reminder.user}: ${error.message}`);
      }
    }
    return { sent, skipped };
  })();
  try {
    return await activeRun;
  } finally {
    activeRun = null;
  }
};

const startReminderScheduler = () => {
  if (timer) return;
  console.log('[reminders] scheduler started (every 60 seconds)');
  // Run immediately, then on the configured periodic interval.
  processDueReminders().catch((error) => console.error(`[reminders] scan failed: ${error.message}`));
  timer = setInterval(() => {
    processDueReminders().catch((error) => console.error(`[reminders] scan failed: ${error.message}`));
  }, SCAN_INTERVAL_MS);
  timer.unref?.();
};

const stopReminderScheduler = async () => {
  if (timer) clearInterval(timer);
  timer = null;
  if (activeRun) {
    try {
      await activeRun;
    } catch (error) {
      console.error(`[reminders] scan failed during shutdown: ${error.message}`);
    }
  }
  console.log('[reminders] scheduler stopped');
};

module.exports = { processDueReminders, startReminderScheduler, stopReminderScheduler, REMINDER_WINDOWS, SCAN_INTERVAL_MS };
