const Subject = require('../models/Subject');
const { isValidObjectId } = require('./sanitize');

/**
 * Ensure a referenced subject exists and belongs to the authenticated user.
 * Returns null when subjectId is empty (optional associations).
 */
const assertOwnedSubject = async (subjectId, userId) => {
  if (subjectId === null || subjectId === undefined || subjectId === '') {
    return null;
  }

  if (!isValidObjectId(subjectId)) {
    const err = new Error('Invalid subject ID');
    err.statusCode = 400;
    throw err;
  }

  const subject = await Subject.findOne({ _id: subjectId, user: userId }).select('_id');
  if (!subject) {
    const err = new Error('Subject not found or does not belong to this account');
    err.statusCode = 403;
    throw err;
  }

  return subject;
};

module.exports = { assertOwnedSubject };
