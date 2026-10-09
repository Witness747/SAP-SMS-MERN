const Event = require('../models/Event');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { validateEvent, EVENT_CATEGORIES } = require('../validators');
const { asEnum, asBooleanString, parsePagination, createPaginationMeta } = require('../utils/sanitize');
const { resolveTimeZone, startOfZonedDay, startOfZonedMonth } = require('../utils/timezone');

const getEvents = async (req, res, next) => {
  try {
    const category = asEnum(req.query.category, EVENT_CATEGORIES);
    const upcoming = asBooleanString(req.query.upcoming);
    const timeZone = resolveTimeZone(req);
    const pagination = parsePagination(req.query);
    if (pagination.errors) return errorResponse(res, 400, 'Invalid pagination parameters', pagination.errors);

    const query = { user: req.user._id };

    if (category) query.category = category;

    if (upcoming === 'true') {
      query.date = { $gte: startOfZonedDay(new Date(), timeZone) };
    }

    if (req.query.month !== undefined || req.query.year !== undefined) {
      const month = Number(req.query.month);
      const year = Number(req.query.year);
      if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1970 || year > 2100) {
        return errorResponse(res, 400, 'month must be 1-12 and year must be a valid number');
      }
      const startOfMonth = startOfZonedMonth(year, month, timeZone);
      const startOfNext = startOfZonedMonth(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, timeZone);
      query.date = { $gte: startOfMonth, $lt: startOfNext };
    }

    const [events, totalItems] = await Promise.all([
      Event.find(query)
        .sort({ date: 1, time: 1, _id: 1 })
        .skip(pagination.skip)
        .limit(pagination.pageSize),
      Event.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Events retrieved successfully', events, {
      count: events.length,
      pagination: createPaginationMeta(totalItems, pagination.page, pagination.pageSize),
    });
  } catch (error) {
    next(error);
  }
};

const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, user: req.user._id });
    if (!event) {
      return errorResponse(res, 404, 'Event not found');
    }

    return successResponse(res, 200, 'Event retrieved', event);
  } catch (error) {
    next(error);
  }
};

const createEvent = async (req, res, next) => {
  try {
    const validationErrors = validateEvent(req.body);
    if (validationErrors.length > 0) {
      return errorResponse(res, 400, 'Validation failed', validationErrors);
    }

    const { title, description, date, time, location, category } = req.body;

    const event = await Event.create({
      user: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      date: new Date(date),
      time: time ? time.trim() : '',
      location: location ? location.trim() : '',
      category: category || 'exam',
    });

    return successResponse(res, 201, 'Event created successfully', event);
  } catch (error) {
    next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const validationErrors = validateEvent(req.body, { isUpdate: true });
    if (validationErrors.length > 0) {
      return errorResponse(res, 400, 'Validation failed', validationErrors);
    }

    const event = await Event.findOne({ _id: req.params.id, user: req.user._id });
    if (!event) {
      return errorResponse(res, 404, 'Event not found');
    }

    const { title, description, date, time, location, category } = req.body;

    if (title) event.title = title.trim();
    if (description !== undefined) event.description = description.trim();
    if (date) event.date = new Date(date);
    if (time !== undefined) event.time = time.trim();
    if (location !== undefined) event.location = location.trim();
    if (category) event.category = category;

    await event.save();

    return successResponse(res, 200, 'Event updated successfully', event);
  } catch (error) {
    next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!event) {
      return errorResponse(res, 404, 'Event not found');
    }

    return successResponse(res, 200, 'Event deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};
