const Timetable = require('../models/Timetable');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { validateTimetable, validateTimeRange, VALID_DAYS } = require('../validators');
const { asEnum, parsePagination, createPaginationMeta } = require('../utils/sanitize');
const { assertOwnedSubject } = require('../utils/subjectOwnership');
const { resolveTimeZone, weekdayName } = require('../utils/timezone');

const DAY_ORDER = VALID_DAYS;

const getTimetable = async (req, res, next) => {
  try {
    const day = asEnum(req.query.day, DAY_ORDER);
    const pagination = parsePagination(req.query);
    if (pagination.errors) return errorResponse(res, 400, 'Invalid pagination parameters', pagination.errors);

    const query = { user: req.user._id };
    if (day) query.day = day;

    const [entries, totalItems] = await Promise.all([
      Timetable.aggregate([
        { $match: query },
        { $addFields: { __dayOrder: { $indexOfArray: [DAY_ORDER, '$day'] } } },
        { $sort: { __dayOrder: 1, startTime: 1, _id: 1 } },
        { $skip: pagination.skip },
        { $limit: pagination.pageSize },
        {
          $lookup: {
            from: 'subjects',
            let: { subjectId: '$subject', ownerId: '$user' },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ['$_id', '$$subjectId'] }, { $eq: ['$user', '$$ownerId'] }] } } },
              { $project: { name: 1, code: 1, instructor: 1, color: 1 } },
            ],
            as: 'subject',
          },
        },
        { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
        { $project: { __dayOrder: 0, 'subject.__v': 0 } },
      ]),
      Timetable.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Timetable retrieved successfully', entries, {
      count: entries.length,
      pagination: createPaginationMeta(totalItems, pagination.page, pagination.pageSize),
    });
  } catch (error) {
    next(error);
  }
};

const getTodayClasses = async (req, res, next) => {
  try {
    const timeZone = resolveTimeZone(req);
    const todayName = weekdayName(new Date(), timeZone);

    const todayClasses = await Timetable.find({
      user: req.user._id,
      day: todayName,
    })
      .populate('subject', 'name code instructor color')
      .sort({ startTime: 1 });

    return successResponse(res, 200, `Today's classes (${todayName})`, todayClasses, {
      day: todayName,
      timeZone,
      totalClassesToday: todayClasses.length,
    });
  } catch (error) {
    next(error);
  }
};

const createEntry = async (req, res, next) => {
  try {
    const validationErrors = validateTimetable(req.body);
    if (validationErrors.length > 0) {
      return errorResponse(res, 400, 'Validation failed', validationErrors);
    }

    const { subject, day, startTime, endTime, room, type } = req.body;

    await assertOwnedSubject(subject, req.user._id);

    const entry = await Timetable.create({
      user: req.user._id,
      subject,
      day,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      room: room ? room.trim() : '',
      type: type || 'lecture',
    });

    const populatedEntry = await Timetable.findById(entry._id).populate('subject', 'name code instructor color');

    return successResponse(res, 201, 'Timetable entry created', populatedEntry);
  } catch (error) {
    next(error);
  }
};

const updateEntry = async (req, res, next) => {
  try {
    const validationErrors = validateTimetable(req.body, { isUpdate: true });
    if (validationErrors.length > 0) {
      return errorResponse(res, 400, 'Validation failed', validationErrors);
    }

    const entry = await Timetable.findOne({ _id: req.params.id, user: req.user._id });
    if (!entry) {
      return errorResponse(res, 404, 'Timetable entry not found');
    }

    const { subject, day, startTime, endTime, room, type } = req.body;

    if (subject !== undefined) {
      await assertOwnedSubject(subject, req.user._id);
      entry.subject = subject;
    }
    if (day) entry.day = day;
    if (startTime) entry.startTime = startTime.trim();
    if (endTime) entry.endTime = endTime.trim();
    if (room !== undefined) entry.room = room.trim();
    if (type) entry.type = type;

    const rangeErrors = validateTimeRange(entry.startTime, entry.endTime);
    if (rangeErrors.length > 0) {
      return errorResponse(res, 400, 'Validation failed', rangeErrors);
    }

    await entry.save();

    const populatedEntry = await Timetable.findById(entry._id).populate('subject', 'name code instructor color');

    return successResponse(res, 200, 'Timetable entry updated', populatedEntry);
  } catch (error) {
    next(error);
  }
};

const deleteEntry = async (req, res, next) => {
  try {
    const entry = await Timetable.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!entry) {
      return errorResponse(res, 404, 'Timetable entry not found');
    }

    return successResponse(res, 200, 'Timetable entry deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTimetable,
  getTodayClasses,
  createEntry,
  updateEntry,
  deleteEntry,
};
