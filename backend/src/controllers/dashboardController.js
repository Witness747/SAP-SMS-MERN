const Task = require('../models/Task');
const Event = require('../models/Event');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Timetable = require('../models/Timetable');
const { calculateMetrics } = require('../services/attendanceService');
const { successResponse } = require('../utils/responseHandler');
const { resolveTimeZone, startOfZonedDay, weekdayName } = require('../utils/timezone');

/**
 * @desc    Get aggregated real-time dashboard data for logged in student
 * @route   GET /api/dashboard
 * @access  Private
 */
const getDashboardData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const timeZone = resolveTimeZone(req);
    const todayName = weekdayName(now, timeZone);

    // 2. Fetch today's classes
    const todayClasses = await Timetable.find({ user: userId, day: todayName })
      .populate('subject', 'name code instructor color')
      .sort({ startTime: 1 });

    // 3. Fetch Tasks summary
    const pendingTasks = await Task.find({
      user: userId,
      status: { $in: ['pending', 'in-progress'] },
    })
      .populate('subject', 'name code color')
      .sort({ dueDate: 1 })
      .limit(6);

    const pendingCount = await Task.countDocuments({
      user: userId,
      status: { $in: ['pending', 'in-progress'] },
    });

    const overdueCount = await Task.countDocuments({
      user: userId,
      status: { $ne: 'completed' },
      dueDate: { $lt: now },
    });

    const completedCount = await Task.countDocuments({
      user: userId,
      status: 'completed',
    });

    // 4. Fetch Upcoming Events (next 30 days)
    const startOfToday = startOfZonedDay(now, timeZone);

    const upcomingEvents = await Event.find({
      user: userId,
      date: { $gte: startOfToday },
    })
      .sort({ date: 1, time: 1 })
      .limit(5);

    // 5. Attendance Summary
    const attendanceRecords = await Attendance.find({ user: userId })
      .populate('subject', 'name code color targetAttendance');

    let totalAttended = 0;
    let totalHeld = 0;
    const lowAttendanceSubjects = [];

    attendanceRecords.forEach((rec) => {
      totalAttended += rec.attendedClasses;
      totalHeld += rec.totalClasses;

      const metrics = calculateMetrics(rec.attendedClasses, rec.totalClasses, rec.targetPercentage);
      if (metrics.needsAttention && rec.totalClasses > 0) {
        lowAttendanceSubjects.push({
          id: rec._id,
          subject: rec.subject ? rec.subject.name : 'Unknown',
          code: rec.subject ? rec.subject.code : '',
          color: rec.subject ? rec.subject.color : '#3B82F6',
          percentage: metrics.percentage,
          targetPercentage: metrics.targetPercentage,
          classesNeeded: metrics.classesNeeded,
        });
      }
    });

    const overallAttendance = totalHeld > 0 ? Number(((totalAttended / totalHeld) * 100).toFixed(1)) : 0;

    // 6. Subject count
    const totalSubjects = await Subject.countDocuments({ user: userId });

    return successResponse(res, 200, 'Dashboard data retrieved successfully', {
      greeting: `Welcome back, ${req.user.name.split(' ')[0]}!`,
      date: now.toISOString(),
      timeZone,
      todayName,
      stats: {
        totalSubjects,
        overallAttendance,
        pendingTasks: pendingCount,
        overdueTasks: overdueCount,
        completedTasks: completedCount,
        todayClassesCount: todayClasses.length,
        upcomingEventsCount: upcomingEvents.length,
        lowAttendanceCount: lowAttendanceSubjects.length,
      },
      todayClasses,
      pendingTasks,
      upcomingEvents,
      lowAttendanceSubjects,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData,
};
