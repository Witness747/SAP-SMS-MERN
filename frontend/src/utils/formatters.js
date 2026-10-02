/**
 * Formatting helpers for dates, times, and labels
 */

export const toDateInputValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export const localDatePlusDays = (days = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  };
  return date.toLocaleDateString(undefined, defaultOptions);
};

export const formatTime = (timeString) => {
  if (!timeString) return '';
  // Check if string matches HH:MM format
  if (/^([01]\d|2[0-3]):?([0-5]\d)$/.test(timeString)) {
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 || 12;
    return `${formattedH}:${minutes} ${ampm}`;
  }
  return timeString;
};

export const getDaysRemaining = (dueDate) => {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `${diffDays} days left`;
};

export const getInitials = (name) => {
  if (!name) return 'S';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export const getPriorityBadgeVariant = (priority) => {
  switch (priority) {
    case 'urgent':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
    default:
      return 'default';
  }
};

export const getCategoryBadgeVariant = (category) => {
  switch (category) {
    case 'exam':
      return 'danger';
    case 'presentation':
      return 'purple';
    case 'deadline':
      return 'warning';
    case 'assignment':
      return 'info';
    case 'meeting':
      return 'teal';
    default:
      return 'default';
  }
};
