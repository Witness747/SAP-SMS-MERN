const mongoose = require('mongoose');

const asString = (value) => (typeof value === 'string' ? value : null);

const asBooleanString = (value) => {
  const str = asString(value);
  if (str === 'true' || str === 'false') return str;
  return null;
};

const escapeRegex = (value) => {
  const str = asString(value);
  if (!str) return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
};

const isValidObjectId = (id) => {
  if (typeof id !== 'string' && typeof id !== 'object') return false;
  const str = String(id);
  return mongoose.Types.ObjectId.isValid(str) && String(new mongoose.Types.ObjectId(str)) === str;
};

const asObjectIdString = (value) => {
  const str = asString(value);
  if (!str || !isValidObjectId(str)) return null;
  return str;
};

const asEnum = (value, allowed) => {
  const str = asString(value);
  if (!str || !allowed.includes(str)) return null;
  return str;
};

const asSortField = (value, allowedFields, fallback) => {
  const str = asString(value);
  if (str && allowedFields.includes(str)) return str;
  return fallback;
};

const asSortDirection = (value) => (asString(value) === 'desc' ? -1 : 1);

module.exports = {
  asString,
  asBooleanString,
  escapeRegex,
  isValidObjectId,
  asObjectIdString,
  asEnum,
  asSortField,
  asSortDirection,
};
