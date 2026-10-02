/**
 * Planner timezone strategy
 *
 * Academic "today" is a calendar day, not a UTC instant.
 * 1. Prefer X-Client-Timezone (IANA), so the student's browser local day wins.
 * 2. Else APP_TIMEZONE from env.
 * 3. Else Asia/Kolkata (typical student-planner default for this project).
 *
 * Date-only fields (task due dates, event dates) are stored as UTC midnight
 * of the submitted YYYY-MM-DD calendar date.
 */

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

const isValidTimeZone = (tz) => {
  if (!tz || typeof tz !== 'string' || tz.length > 64) return false;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

const resolveTimeZone = (req) => {
  const header = req && typeof req.get === 'function' ? req.get('X-Client-Timezone') : null;
  if (isValidTimeZone(header)) return header;
  if (isValidTimeZone(process.env.APP_TIMEZONE)) return process.env.APP_TIMEZONE;
  return DEFAULT_TIMEZONE;
};

const zonedDateParts = (date, timeZone) => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = fmt.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: get('weekday'),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
  };
};

const startOfZonedDay = (date, timeZone) => {
  const { year, month, day } = zonedDateParts(date, timeZone);
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const guessParts = zonedDateParts(new Date(utcGuess), timeZone);
  const guessAsUtc = Date.UTC(
    guessParts.year,
    guessParts.month - 1,
    guessParts.day,
    guessParts.hour,
    guessParts.minute,
    guessParts.second
  );
  const desired = Date.UTC(year, month - 1, day, 0, 0, 0);
  return new Date(utcGuess + (desired - guessAsUtc));
};

const startOfZonedMonth = (year, month, timeZone) => {
  const utcGuess = Date.UTC(year, month - 1, 1, 0, 0, 0);
  return startOfZonedDay(new Date(utcGuess), timeZone);
};

const weekdayName = (date, timeZone) => zonedDateParts(date, timeZone).weekday;

module.exports = {
  DEFAULT_TIMEZONE,
  isValidTimeZone,
  resolveTimeZone,
  startOfZonedDay,
  startOfZonedMonth,
  weekdayName,
};
