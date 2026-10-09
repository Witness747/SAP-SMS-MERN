const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Timetable = require('../models/Timetable');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { validateSubject } = require('../validators');
const { parsePagination, createPaginationMeta } = require('../utils/sanitize');

/**
 * @desc    Get all subjects for the logged-in student
 * @route   GET /api/subjects
 * @access  Private
 */
const getSubjects = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    if (pagination.errors) return errorResponse(res, 400, 'Invalid pagination parameters', pagination.errors);
    const userQuery = { user: req.user._id };
    const [subjects, totalItems] = await Promise.all([
      Subject.find(userQuery)
        .sort({ name: 1, _id: 1 })
        .skip(pagination.skip)
        .limit(pagination.pageSize),
      Subject.countDocuments(userQuery),
    ]);
    const attendanceRecords = await Attendance.find({
      ...userQuery,
      subject: { $in: subjects.map((subject) => subject._id) },
    });

    // Fetch corresponding attendance records for quick summary display
    const attendanceMap = {};
    attendanceRecords.forEach((att) => {
      attendanceMap[att.subject.toString()] = {
        attendedClasses: att.attendedClasses,
        totalClasses: att.totalClasses,
        percentage: att.percentage,
        status: att.status,
      };
    });

    const subjectsWithAttendance = subjects.map((subj) => ({
      ...subj.toObject(),
      attendance: attendanceMap[subj._id.toString()] || {
        attendedClasses: 0,
        totalClasses: 0,
        percentage: 0,
        status: 'neutral',
      },
    }));

    return successResponse(res, 200, 'Subjects fetched successfully', subjectsWithAttendance, {
      count: subjects.length,
      pagination: createPaginationMeta(totalItems, pagination.page, pagination.pageSize),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single subject by ID
 * @route   GET /api/subjects/:id
 * @access  Private
 */
const getSubjectById = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, user: req.user._id });
    if (!subject) {
      return errorResponse(res, 404, 'Subject not found');
    }

    const attendance = await Attendance.findOne({ subject: subject._id, user: req.user._id });

    return successResponse(res, 200, 'Subject retrieved', {
      subject,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new subject
 * @route   POST /api/subjects
 * @access  Private
 */
const createSubject = async (req, res, next) => {
  try {
    const validationErrors = validateSubject(req.body);
    if (validationErrors.length > 0) {
      return errorResponse(res, 400, 'Validation failed', validationErrors);
    }

    const { name, code, instructor, credits, targetAttendance, color } = req.body;

    // Check for duplicate subject code for this user
    const existing = await Subject.findOne({
      user: req.user._id,
      code: code.trim().toUpperCase(),
    });

    if (existing) {
      return errorResponse(res, 409, `Subject code '${code.toUpperCase()}' is already used in your account.`);
    }

    const subject = await Subject.create({
      user: req.user._id,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      instructor: instructor ? instructor.trim() : '',
      credits: credits !== undefined ? Number(credits) : 3,
      targetAttendance: targetAttendance !== undefined ? Number(targetAttendance) : 75,
      color: color || '#3B82F6',
    });

    // Automatically create corresponding attendance record
    const attendance = await Attendance.create({
      user: req.user._id,
      subject: subject._id,
      attendedClasses: 0,
      totalClasses: 0,
      targetPercentage: subject.targetAttendance,
    });

    return successResponse(res, 201, 'Subject created successfully', {
      subject,
      attendance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing subject
 * @route   PUT /api/subjects/:id
 * @access  Private
 */
const updateSubject = async (req, res, next) => {
  try {
    const validationErrors = validateSubject(req.body, { isUpdate: true });
    if (validationErrors.length > 0) {
      return errorResponse(res, 400, 'Validation failed', validationErrors);
    }

    const subject = await Subject.findOne({ _id: req.params.id, user: req.user._id });
    if (!subject) {
      return errorResponse(res, 404, 'Subject not found');
    }

    const { name, code, instructor, credits, targetAttendance, color } = req.body;

    if (code && code.trim().toUpperCase() !== subject.code) {
      const existing = await Subject.findOne({
        user: req.user._id,
        code: code.trim().toUpperCase(),
        _id: { $ne: subject._id },
      });
      if (existing) {
        return errorResponse(res, 409, `Subject code '${code.toUpperCase()}' is already in use.`);
      }
      subject.code = code.trim().toUpperCase();
    }

    if (name) subject.name = name.trim();
    if (instructor !== undefined) subject.instructor = instructor.trim();
    if (credits !== undefined) subject.credits = Number(credits);
    if (color) subject.color = color;

    if (targetAttendance !== undefined) {
      subject.targetAttendance = Number(targetAttendance);
      // Synchronize attendance target if subject target changes
      await Attendance.findOneAndUpdate(
        { user: req.user._id, subject: subject._id },
        { targetPercentage: Number(targetAttendance) }
      );
    }

    await subject.save();

    return successResponse(res, 200, 'Subject updated successfully', subject);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete subject and associated attendance/timetable/task references
 * @route   DELETE /api/subjects/:id
 * @access  Private
 */
const deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, user: req.user._id });
    if (!subject) {
      return errorResponse(res, 404, 'Subject not found');
    }

    // Cascade deletions/cleanups
    await Attendance.deleteMany({ subject: subject._id, user: req.user._id });
    await Timetable.deleteMany({ subject: subject._id, user: req.user._id });
    await Task.updateMany({ subject: subject._id, user: req.user._id }, { $set: { subject: null } });

    await subject.deleteOne();

    return successResponse(res, 200, 'Subject and associated records deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
};
