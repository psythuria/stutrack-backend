import Journal from '../models/journalModel.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// @desc    Create a new journal entry
// @route   POST /api/journals
// @access  Private
export const createJournal = asyncHandler(async (req, res) => {
  const { title, content, mood, tags, isPrivate, attachments } = req.body;

  const journal = await Journal.create({
    user: req.user._id,
    title,
    content,
    mood,
    tags,
    isPrivate,
    attachments
  });

  res.status(201).json(journal);
});

// @desc    Get all journal entries for a user
// @route   GET /api/journals
// @access  Private
export const getJournals = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const mood = req.query.mood;
  const tag = req.query.tag;
  const search = req.query.search;
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
  
  // Build filter object
  const filter = { user: req.user._id };
  if (mood) filter.mood = mood;
  if (tag) filter.tags = tag;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (startDate && endDate) {
    filter.createdAt = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    filter.createdAt = { $gte: startDate };
  } else if (endDate) {
    filter.createdAt = { $lte: endDate };
  }
  
  const journals = await Journal.find(filter)
    .limit(limit)
    .skip(skip)
    .sort({ createdAt: -1 });
  
  const count = await Journal.countDocuments(filter);
  
  res.json({
    journals,
    page,
    pages: Math.ceil(count / limit),
    total: count
  });
});

// @desc    Get journal by ID
// @route   GET /api/journals/:id
// @access  Private
export const getJournalById = asyncHandler(async (req, res, next) => {
  const journal = await Journal.findById(req.params.id);
  
  if (!journal) {
    return next(new AppError('Journal entry not found', 404));
  }
  
  // Make sure the journal belongs to the logged in user
  if (journal.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to access this journal entry', 401));
  }
  
  res.json(journal);
});

// @desc    Update a journal entry
// @route   PUT /api/journals/:id
// @access  Private
export const updateJournal = asyncHandler(async (req, res, next) => {
  const journal = await Journal.findById(req.params.id);
  
  if (!journal) {
    return next(new AppError('Journal entry not found', 404));
  }
  
  // Make sure the journal belongs to the logged in user
  if (journal.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this journal entry', 401));
  }
  
  const updatedJournal = await Journal.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  
  res.json(updatedJournal);
});

// @desc    Delete a journal entry
// @route   DELETE /api/journals/:id
// @access  Private
export const deleteJournal = asyncHandler(async (req, res, next) => {
  const journal = await Journal.findById(req.params.id);
  
  if (!journal) {
    return next(new AppError('Journal entry not found', 404));
  }
  
  // Make sure the journal belongs to the logged in user
  if (journal.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to delete this journal entry', 401));
  }
  
  await journal.deleteOne();
  
  res.json({ message: 'Journal entry removed' });
});

// @desc    Get journal statistics
// @route   GET /api/journals/stats
// @access  Private
export const getJournalStats = asyncHandler(async (req, res) => {
  const moodStats = await Journal.aggregate([
    { $match: { user: req.user._id } },
    { $group: {
        _id: '$mood',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const monthlyCount = await Journal.aggregate([
    { $match: { user: req.user._id } },
    {
      $group: {
        _id: { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 }
  ]);
  
  const tagStats = await Journal.aggregate([
    { $match: { user: req.user._id } },
    { $unwind: '$tags' },
    { $group: {
        _id: '$tags',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  res.json({
    moodStats,
    monthlyCount,
    tagStats,
    totalJournals: await Journal.countDocuments({ user: req.user._id }),
    streakDays: await calculateStreak(req.user._id)
  });
});

// Helper function to calculate writing streak
const calculateStreak = async (userId) => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  
  // Check if user wrote today
  const todayEntry = await Journal.findOne({
    user: userId,
    createdAt: {
      $gte: new Date(now.setHours(0, 0, 0, 0)),
      $lt: new Date(now.setHours(23, 59, 59, 999))
    }
  });
  
  // If no entry today, check yesterday
  if (!todayEntry) {
    const yesterdayEntry = await Journal.findOne({
      user: userId,
      createdAt: {
        $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
        $lt: new Date(yesterday.setHours(23, 59, 59, 999))
      }
    });
    
    if (!yesterdayEntry) {
      // Streak broken, find last entry date
      const lastEntry = await Journal.findOne({
        user: userId
      }).sort({ createdAt: -1 });
      
      return lastEntry ? 0 : 0;
    }
  }
  
  // Calculate streak by checking consecutive days backwards
  let streak = todayEntry ? 1 : 0;
  let currentDate = new Date(now);
  
  if (!todayEntry) {
    currentDate = new Date(yesterday);
  }
  
  let checkDate = new Date(currentDate);
  checkDate.setDate(checkDate.getDate() - 1);
  
  let streakBroken = false;
  
  while (!streakBroken) {
    const entry = await Journal.findOne({
      user: userId,
      createdAt: {
        $gte: new Date(checkDate.setHours(0, 0, 0, 0)),
        $lt: new Date(checkDate.setHours(23, 59, 59, 999))
      }
    });
    
    if (entry) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      streakBroken = true;
    }
    
    // Limit check to 100 days to prevent excessive queries
    if (streak >= 100) break;
  }
  
  return streak;
};