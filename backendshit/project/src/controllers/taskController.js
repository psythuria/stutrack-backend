import Task from '../models/taskModel.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
export const createTask = asyncHandler(async (req, res, next) => {
  const { 
    title, 
    description, 
    dueDate, 
    priority, 
    category,
    course,
    reminderDate
  } = req.body;

  const task = await Task.create({
    user: req.user._id,
    title,
    description,
    dueDate,
    priority,
    category,
    course,
    reminderDate
  });

  res.status(201).json(task);
});

// @desc    Get all tasks for a user
// @route   GET /api/tasks
// @access  Private
export const getTasks = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const status = req.query.status;
  const priority = req.query.priority;
  const category = req.query.category;
  const course = req.query.course;
  const search = req.query.search;
  
  // Build filter object
  const filter = { user: req.user._id };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (course) filter.course = course;
  if (search) filter.title = { $regex: search, $options: 'i' };
  
  const tasks = await Task.find(filter)
    .limit(limit)
    .skip(skip)
    .sort({ dueDate: 1 });
  
  const count = await Task.countDocuments(filter);
  
  res.json({
    tasks,
    page,
    pages: Math.ceil(count / limit),
    total: count
  });
});

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
export const getTaskById = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  
  if (!task) {
    return next(new AppError('Task not found', 404));
  }
  
  // Make sure the task belongs to the logged in user
  if (task.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to access this task', 401));
  }
  
  res.json(task);
});

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  
  if (!task) {
    return next(new AppError('Task not found', 404));
  }
  
  // Make sure the task belongs to the logged in user
  if (task.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this task', 401));
  }
  
  // If task is being marked as completed, set completedAt date
  if (req.body.status === 'completed' && task.status !== 'completed') {
    req.body.completedAt = Date.now();
  }
  
  // If task status is changing from completed, clear completedAt
  if (task.status === 'completed' && req.body.status && req.body.status !== 'completed') {
    req.body.completedAt = null;
  }
  
  const updatedTask = await Task.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  
  res.json(updatedTask);
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  
  if (!task) {
    return next(new AppError('Task not found', 404));
  }
  
  // Make sure the task belongs to the logged in user
  if (task.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to delete this task', 401));
  }
  
  await task.deleteOne();
  
  res.json({ message: 'Task removed' });
});

// @desc    Get task statistics
// @route   GET /api/tasks/stats
// @access  Private
export const getTaskStats = asyncHandler(async (req, res) => {
  const stats = await Task.aggregate([
    { $match: { user: req.user._id } },
    { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const priorityStats = await Task.aggregate([
    { $match: { user: req.user._id } },
    { $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const categoryStats = await Task.aggregate([
    { $match: { user: req.user._id } },
    { $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const upcoming = await Task.find({
    user: req.user._id,
    status: { $nin: ['completed'] },
    dueDate: { $gte: new Date() }
  })
  .sort({ dueDate: 1 })
  .limit(5);
  
  res.json({
    statusStats: stats,
    priorityStats,
    categoryStats,
    upcomingTasks: upcoming,
    totalTasks: await Task.countDocuments({ user: req.user._id }),
    completedTasks: await Task.countDocuments({ 
      user: req.user._id,
      status: 'completed'
    })
  });
});

// @desc    Get overdue tasks
// @route   GET /api/tasks/overdue
// @access  Private
export const getOverdueTasks = asyncHandler(async (req, res) => {
  const now = new Date();
  
  const tasks = await Task.find({
    user: req.user._id,
    status: { $ne: 'completed' },
    dueDate: { $lt: now }
  }).sort({ dueDate: 1 });
  
  // Update tasks to overdue status
  for (let task of tasks) {
    if (task.status !== 'overdue') {
      task.status = 'overdue';
      await task.save();
    }
  }
  
  res.json(tasks);
});