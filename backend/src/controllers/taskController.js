const Task = require('../models/Task');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { validateTask } = require('../validators');
const { assertOwnedSubject } = require('../utils/subjectOwnership');
const {
  asEnum,
  asBooleanString,
  asObjectIdString,
  escapeRegex,
  asSortField,
  asSortDirection,
} = require('../utils/sanitize');
const { TASK_PRIORITIES, TASK_STATUSES } = require('../validators');

const TASK_SORT_FIELDS = ['dueDate', 'createdAt', 'updatedAt', 'priority', 'title', 'status'];

const getTasks = async (req, res, next) => {
  try {
    const status = asEnum(req.query.status, TASK_STATUSES);
    const priority = asEnum(req.query.priority, TASK_PRIORITIES);
    const subject = asObjectIdString(req.query.subject);
    const overdue = asBooleanString(req.query.overdue);
    const search = escapeRegex(req.query.search);
    const sortBy = asSortField(req.query.sortBy, TASK_SORT_FIELDS, 'dueDate');
    const sortDir = asSortDirection(req.query.sortOrder);

    const query = { user: req.user._id };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (subject) query.subject = subject;

    if (overdue === 'true') {
      query.status = { $ne: 'completed' };
      query.dueDate = { $lt: new Date() };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const tasks = await Task.find(query)
      .populate('subject', 'name code color')
      .sort({ [sortBy]: sortDir });

    return successResponse(res, 200, 'Tasks retrieved successfully', tasks, { count: tasks.length });
  } catch (error) {
    next(error);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id }).populate('subject', 'name code color');
    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    return successResponse(res, 200, 'Task retrieved', task);
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const validationErrors = validateTask(req.body);
    if (validationErrors.length > 0) {
      return errorResponse(res, 400, 'Validation failed', validationErrors);
    }

    const { title, description, subject, dueDate, priority, status } = req.body;

    await assertOwnedSubject(subject, req.user._id);

    const task = await Task.create({
      user: req.user._id,
      subject: subject || null,
      title: title.trim(),
      description: description ? description.trim() : '',
      dueDate: new Date(dueDate),
      priority: priority || 'medium',
      status: status || 'pending',
      completionDate: status === 'completed' ? new Date() : null,
    });

    const populatedTask = await Task.findById(task._id).populate('subject', 'name code color');

    return successResponse(res, 201, 'Task created successfully', populatedTask);
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const validationErrors = validateTask(req.body, { isUpdate: true });
    if (validationErrors.length > 0) {
      return errorResponse(res, 400, 'Validation failed', validationErrors);
    }

    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    const { title, description, subject, dueDate, priority, status } = req.body;

    if (subject !== undefined) {
      await assertOwnedSubject(subject, req.user._id);
      task.subject = subject || null;
    }
    if (title) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (dueDate) task.dueDate = new Date(dueDate);
    if (priority) task.priority = priority;

    if (status) {
      task.status = status;
      if (status === 'completed' && !task.completionDate) {
        task.completionDate = new Date();
      } else if (status !== 'completed') {
        task.completionDate = null;
      }
    }

    await task.save();

    const populatedTask = await Task.findById(task._id).populate('subject', 'name code color');

    return successResponse(res, 200, 'Task updated successfully', populatedTask);
  } catch (error) {
    next(error);
  }
};

const toggleTaskStatus = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    if (task.status === 'completed') {
      task.status = 'pending';
      task.completionDate = null;
    } else {
      task.status = 'completed';
      task.completionDate = new Date();
    }

    await task.save();

    const populatedTask = await Task.findById(task._id).populate('subject', 'name code color');

    return successResponse(res, 200, `Task marked as ${task.status}`, populatedTask);
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return errorResponse(res, 404, 'Task not found');
    }

    return successResponse(res, 200, 'Task deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  toggleTaskStatus,
  deleteTask,
};
