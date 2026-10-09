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

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE_OFFSET = 10_000;

const parsePositiveInteger = (value, fallback, maximum) => {
  if (value === undefined) return { value: fallback };
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return { error: 'must be a positive integer' };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    return { error: `must be between 1 and ${maximum}` };
  }
  return { value: parsed };
};

const parsePagination = (query = {}) => {
  const page = parsePositiveInteger(query.page, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = parsePositiveInteger(query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const errors = [];
  if (page.error) errors.push(`page ${page.error}`);
  if (pageSize.error) errors.push(`pageSize ${pageSize.error}`);
  if (errors.length) return { errors };

  const skip = (page.value - 1) * pageSize.value;
  if (!Number.isSafeInteger(skip) || skip > MAX_PAGE_OFFSET) {
    return { errors: [`page must result in an offset no greater than ${MAX_PAGE_OFFSET}`] };
  }

  return { page: page.value, pageSize: pageSize.value, skip };
};

const createPaginationMeta = (totalItems, page, pageSize) => ({
  page,
  pageSize,
  totalItems,
  totalPages: Math.ceil(totalItems / pageSize),
  maxPage: Math.floor(MAX_PAGE_OFFSET / pageSize) + 1,
  hasNextPage: page * pageSize < totalItems && page * pageSize <= MAX_PAGE_OFFSET,
  hasPreviousPage: page > 1,
});

module.exports = {
  asString,
  asBooleanString,
  escapeRegex,
  isValidObjectId,
  asObjectIdString,
  asEnum,
  asSortField,
  asSortDirection,
  parsePagination,
  createPaginationMeta,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_PAGE_OFFSET,
};
