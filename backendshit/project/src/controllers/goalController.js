import Goal from '../models/goalModel.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// @desc    Create a new goal
// @route   POST /api/goals
// @access  Private
export const createGoal = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    priority,
    startDate,
    targetDate,
    milestones
  } = req.body;

  const goal = await Goal.create({
    user: req.user._id,
    title,
    description,
    category,
    priority,
    startDate: startDate || Date.now(),
    targetDate,
    milestones: milestones || []
  });

  res.status(201).json(goal);
});

// @desc    Get all goals for a user
// @route   GET /api/goals
// @access  Private
export const getGoals = asyncHandler(async (req, res) => {
  const status = req.query.status;
  const category = req.query.category;
  const priority = req.query.priority;
  const search = req.query.search;
  
  // Build filter object
  const filter = { user: req.user._id };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (search) filter.title = { $regex: search, $options: 'i' };
  
  const goals = await Goal.find(filter).sort({ targetDate: 1 });
  
  res.json(goals);
});

// @desc    Get goal by ID
// @route   GET /api/goals/:id
// @access  Private
export const getGoalById = asyncHandler(async (req, res, next) => {
  const goal = await Goal.findById(req.params.id);
  
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  
  // Make sure the goal belongs to the logged in user
  if (goal.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to access this goal', 401));
  }
  
  res.json(goal);
});

// @desc    Update a goal
// @route   PUT /api/goals/:id
// @access  Private
export const updateGoal = asyncHandler(async (req, res, next) => {
  const goal = await Goal.findById(req.params.id);
  
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  
  // Make sure the goal belongs to the logged in user
  if (goal.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this goal', 401));
  }
  
  // If goal is being marked as completed, set completedAt date
  if (req.body.status === 'completed' && goal.status !== 'completed') {
    req.body.completedAt = Date.now();
    req.body.progress = 100;
  }
  
  // If goal status is changing from completed, clear completedAt
  if (goal.status === 'completed' && req.body.status && req.body.status !== 'completed') {
    req.body.completedAt = null;
  }
  
  const updatedGoal = await Goal.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  
  res.json(updatedGoal);
});

// @desc    Delete a goal
// @route   DELETE /api/goals/:id
// @access  Private
export const deleteGoal = asyncHandler(async (req, res, next) => {
  const goal = await Goal.findById(req.params.id);
  
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  
  // Make sure the goal belongs to the logged in user
  if (goal.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to delete this goal', 401));
  }
  
  await goal.deleteOne();
  
  res.json({ message: 'Goal removed' });
});

// @desc    Add milestone to goal
// @route   POST /api/goals/:id/milestones
// @access  Private
export const addMilestone = asyncHandler(async (req, res, next) => {
  const { title, description, dueDate } = req.body;
  
  const goal = await Goal.findById(req.params.id);
  
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  
  // Make sure the goal belongs to the logged in user
  if (goal.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this goal', 401));
  }
  
  goal.milestones.push({
    title,
    description,
    dueDate,
    isCompleted: false
  });
  
  await goal.save();
  
  res.status(201).json(goal);
});

// @desc    Update milestone
// @route   PUT /api/goals/:id/milestones/:milestoneId
// @access  Private
export const updateMilestone = asyncHandler(async (req, res, next) => {
  const goal = await Goal.findById(req.params.id);
  
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  
  // Make sure the goal belongs to the logged in user
  if (goal.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this goal', 401));
  }
  
  // Find milestone
  const milestone = goal.milestones.id(req.params.milestoneId);
  
  if (!milestone) {
    return next(new AppError('Milestone not found', 404));
  }
  
  // Update milestone fields
  milestone.title = req.body.title || milestone.title;
  milestone.description = req.body.description || milestone.description;
  milestone.dueDate = req.body.dueDate || milestone.dueDate;
  
  // If milestone is being completed, set completedAt
  if (req.body.isCompleted === true && !milestone.isCompleted) {
    milestone.isCompleted = true;
    milestone.completedAt = Date.now();
    
    // Update goal progress
    const totalMilestones = goal.milestones.length;
    const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
    goal.progress = Math.floor((completedMilestones / totalMilestones) * 100);
  }
  
  // If milestone is being uncompleted, clear completedAt
  if (req.body.isCompleted === false && milestone.isCompleted) {
    milestone.isCompleted = false;
    milestone.completedAt = undefined;
    
    // Update goal progress
    const totalMilestones = goal.milestones.length;
    const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
    goal.progress = Math.floor((completedMilestones / totalMilestones) * 100);
  }
  
  await goal.save();
  
  res.json(goal);
});

// @desc    Delete milestone
// @route   DELETE /api/goals/:id/milestones/:milestoneId
// @access  Private
export const deleteMilestone = asyncHandler(async (req, res, next) => {
  const goal = await Goal.findById(req.params.id);
  
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  
  // Make sure the goal belongs to the logged in user
  if (goal.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this goal', 401));
  }
  
  // Find milestone
  const milestone = goal.milestones.id(req.params.milestoneId);
  
  if (!milestone) {
    return next(new AppError('Milestone not found', 404));
  }
  
  // Remove milestone
  goal.milestones.pull(req.params.milestoneId);
  
  // Update goal progress
  const totalMilestones = goal.milestones.length;
  if (totalMilestones > 0) {
    const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
    goal.progress = Math.floor((completedMilestones / totalMilestones) * 100);
  } else {
    goal.progress = 0;
  }
  
  await goal.save();
  
  res.json(goal);
});

// @desc    Add reflection to goal
// @route   POST /api/goals/:id/reflections
// @access  Private
export const addReflection = asyncHandler(async (req, res, next) => {
  const { content } = req.body;
  
  const goal = await Goal.findById(req.params.id);
  
  if (!goal) {
    return next(new AppError('Goal not found', 404));
  }
  
  // Make sure the goal belongs to the logged in user
  if (goal.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this goal', 401));
  }
  
  goal.reflections.push({
    content,
    date: Date.now()
  });
  
  await goal.save();
  
  res.status(201).json(goal);
});

// @desc    Get goal statistics
// @route   GET /api/goals/stats
// @access  Private
export const getGoalStats = asyncHandler(async (req, res) => {
  const statusStats = await Goal.aggregate([
    { $match: { user: req.user._id } },
    { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const categoryStats = await Goal.aggregate([
    { $match: { user: req.user._id } },
    { $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const priorityStats = await Goal.aggregate([
    { $match: { user: req.user._id } },
    { $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const avgProgress = await Goal.aggregate([
    { $match: { user: req.user._id, status: { $ne: 'completed' } } },
    { $group: {
        _id: null,
        avgProgress: { $avg: '$progress' }
      }
    }
  ]);
  
  res.json({
    statusStats,
    categoryStats,
    priorityStats,
    avgProgress: avgProgress.length > 0 ? avgProgress[0].avgProgress : 0,
    totalGoals: await Goal.countDocuments({ user: req.user._id }),
    completedGoals: await Goal.countDocuments({ 
      user: req.user._id,
      status: 'completed'
    })
  });
});