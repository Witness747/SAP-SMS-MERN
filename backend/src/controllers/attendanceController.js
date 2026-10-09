const Attendance = require('../models/Attendance');
const { calculateMetrics } = require('../services/attendanceService');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { validateAttendance, ATTENDANCE_ACTIONS } = require('../validators');
const { parsePagination, createPaginationMeta } = require('../utils/sanitize');

/**
 * @desc    Get all attendance records for logged in student with calculated metrics
 * @route   GET /api/attendance
 * @access  Private
 */
const getAllAttendance = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    if (pagination.errors) return errorResponse(res, 400, 'Invalid pagination parameters', pagination.errors);

    const userQuery = { user: req.user._id };
    const [records, summaryRecords, totalItems] = await Promise.all([
      Attendance.find(userQuery)
        .populate('subject', 'name code instructor credits color targetAttendance')
        .sort({ createdAt: 1, _id: 1 })
        .skip(pagination.skip)
        .limit(pagination.pageSize),
      Attendance.find(userQuery).select('attendedClasses totalClasses targetPercentage').lean(),
      Attendance.countDocuments(userQuery),
    ]);

    // Calculate aggregated overall attendance across all subjects
    let totalAttendedAll = 0;
    let totalHeldAll = 0;
    let lowAttendanceCount = 0;

    summaryRecords.forEach((record) => {
      const metrics = calculateMetrics(record.attendedClasses, record.totalClasses, record.targetPercentage);
      totalAttendedAll += record.attendedClasses;
      totalHeldAll += record.totalClasses;
      if (metrics.needsAttention) lowAttendanceCount++;
    });

    const formattedRecords = records.map((record) => {
      const recObj = record.toObject();
      const metrics = calculateMetrics(record.attendedClasses, record.totalClasses, record.targetPercentage);
      return {
        ...recObj,
        ...metrics,
      };
    });

    const overallPercentage = totalHeldAll > 0 ? Number(((totalAttendedAll / totalHeldAll) * 100).toFixed(2)) : 0;

    return successResponse(res, 200, 'Attendance records retrieved', formattedRecords, {
      totalSubjects: totalItems,
      totalAttendedAll,
      totalHeldAll,
      overallPercentage,
      lowAttendanceCount,
      pagination: createPaginationMeta(totalItems, pagination.page, pagination.pageSize),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single attendance record by ID
 * @route   GET /api/attendance/:id
 * @access  Private
 */
const getAttendanceById = async (req, res, next) => {
  try {
    const record = await Attendance.findOne({ _id: req.params.id, user: req.user._id })
      .populate('subject', 'name code instructor credits color');

    if (!record) {
      return errorResponse(res, 404, 'Attendance record not found');
    }

    const metrics = calculateMetrics(record.attendedClasses, record.totalClasses, record.targetPercentage);

    return successResponse(res, 200, 'Attendance record retrieved', {
      ...record.toObject(),
      ...metrics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Manual update of attendance figures
 * @route   PUT /api/attendance/:id
 * @access  Private
 */
const updateAttendance = async (req, res, next) => {
  try {
    const validationErrors = validateAttendance(req.body, { isUpdate: true });
    if (validationErrors.length > 0) {
      return errorResponse(res, 400, 'Validation failed', validationErrors);
    }

    const record = await Attendance.findOne({ _id: req.params.id, user: req.user._id });
    if (!record) {
      return errorResponse(res, 404, 'Attendance record not found');
    }

    const { attendedClasses, totalClasses, targetPercentage } = req.body;

    if (attendedClasses !== undefined) {
      const att = Number(attendedClasses);
      if (isNaN(att) || att < 0) {
        return errorResponse(res, 400, 'Attended classes must be a non-negative number');
      }
      record.attendedClasses = att;
    }

    if (totalClasses !== undefined) {
      const tot = Number(totalClasses);
      if (isNaN(tot) || tot < 0) {
        return errorResponse(res, 400, 'Total classes must be a non-negative number');
      }
      record.totalClasses = tot;
    }

    if (record.attendedClasses > record.totalClasses) {
      return errorResponse(res, 400, 'Attended classes cannot exceed total classes');
    }

    if (targetPercentage !== undefined) {
      const target = Number(targetPercentage);
      if (isNaN(target) || target < 0 || target > 100) {
        return errorResponse(res, 400, 'Target percentage must be between 0 and 100');
      }
      record.targetPercentage = target;
    }

    await record.save();

    const populatedRecord = await Attendance.findById(record._id).populate('subject', 'name code color');
    const metrics = calculateMetrics(record.attendedClasses, record.totalClasses, record.targetPercentage);

    return successResponse(res, 200, 'Attendance updated successfully', {
      ...populatedRecord.toObject(),
      ...metrics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Quick log attendance action (present, absent, undo)
 * @route   POST /api/attendance/:id/log
 * @access  Private
 */
const logAttendance = async (req, res, next) => {
  try {
    const { action } = req.body;

    if (!ATTENDANCE_ACTIONS.includes(action)) {
      return errorResponse(res, 400, 'Invalid action. Supported: present, absent, undo_present, undo_absent');
    }

    const record = await Attendance.findOne({ _id: req.params.id, user: req.user._id });
    if (!record) {
      return errorResponse(res, 404, 'Attendance record not found');
    }

    if (action === 'present') {
      record.attendedClasses += 1;
      record.totalClasses += 1;
    } else if (action === 'absent') {
      record.totalClasses += 1;
    } else if (action === 'undo_present') {
      if (record.attendedClasses > 0 && record.totalClasses > 0) {
        record.attendedClasses -= 1;
        record.totalClasses -= 1;
      }
    } else if (action === 'undo_absent') {
      if (record.totalClasses > record.attendedClasses) {
        record.totalClasses -= 1;
      }
    }

    await record.save();

    const populatedRecord = await Attendance.findById(record._id).populate('subject', 'name code color');
    const metrics = calculateMetrics(record.attendedClasses, record.totalClasses, record.targetPercentage);

    return successResponse(res, 200, `Attendance logged (${action})`, {
      ...populatedRecord.toObject(),
      ...metrics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset attendance record to 0
 * @route   POST /api/attendance/:id/reset
 * @access  Private
 */
const resetAttendance = async (req, res, next) => {
  try {
    const record = await Attendance.findOne({ _id: req.params.id, user: req.user._id });
    if (!record) {
      return errorResponse(res, 404, 'Attendance record not found');
    }

    record.attendedClasses = 0;
    record.totalClasses = 0;
    await record.save();

    const metrics = calculateMetrics(0, 0, record.targetPercentage);

    return successResponse(res, 200, 'Attendance reset to 0', {
      ...record.toObject(),
      ...metrics,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAttendance,
  getAttendanceById,
  updateAttendance,
  logAttendance,
  resetAttendance,
};
