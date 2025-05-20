import Calendar from '../models/calendarModel.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// @desc    Create a new calendar event
// @route   POST /api/calendar
// @access  Private
export const createEvent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    startDate,
    endDate,
    allDay,
    location,
    category,
    color,
    recurrence,
    reminderTime
  } = req.body;

  const event = await Calendar.create({
    user: req.user._id,
    title,
    description,
    startDate,
    endDate,
    allDay,
    location,
    category,
    color,
    recurrence,
    reminderTime
  });

  res.status(201).json(event);
});

// @desc    Get all calendar events for a user
// @route   GET /api/calendar
// @access  Private
export const getEvents = asyncHandler(async (req, res) => {
  const start = req.query.start ? new Date(req.query.start) : null;
  const end = req.query.end ? new Date(req.query.end) : null;
  const category = req.query.category;
  
  // Build filter object
  const filter = { user: req.user._id };
  
  if (start && end) {
    filter.$or = [
      // Events that start within the range
      { startDate: { $gte: start, $lte: end } },
      // Events that end within the range
      { endDate: { $gte: start, $lte: end } },
      // Events that span the entire range
      { $and: [{ startDate: { $lte: start } }, { endDate: { $gte: end } }] }
    ];
  }
  
  if (category) {
    filter.category = category;
  }
  
  const events = await Calendar.find(filter).sort({ startDate: 1 });
  
  res.json(events);
});

// @desc    Get calendar event by ID
// @route   GET /api/calendar/:id
// @access  Private
export const getEventById = asyncHandler(async (req, res, next) => {
  const event = await Calendar.findById(req.params.id);
  
  if (!event) {
    return next(new AppError('Calendar event not found', 404));
  }
  
  // Make sure the event belongs to the logged in user
  if (event.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to access this event', 401));
  }
  
  res.json(event);
});

// @desc    Update a calendar event
// @route   PUT /api/calendar/:id
// @access  Private
export const updateEvent = asyncHandler(async (req, res, next) => {
  const event = await Calendar.findById(req.params.id);
  
  if (!event) {
    return next(new AppError('Calendar event not found', 404));
  }
  
  // Make sure the event belongs to the logged in user
  if (event.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this event', 401));
  }
  
  const updatedEvent = await Calendar.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  
  res.json(updatedEvent);
});

// @desc    Delete a calendar event
// @route   DELETE /api/calendar/:id
// @access  Private
export const deleteEvent = asyncHandler(async (req, res, next) => {
  const event = await Calendar.findById(req.params.id);
  
  if (!event) {
    return next(new AppError('Calendar event not found', 404));
  }
  
  // Make sure the event belongs to the logged in user
  if (event.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to delete this event', 401));
  }
  
  await event.deleteOne();
  
  res.json({ message: 'Calendar event removed' });
});

// @desc    Get upcoming events
// @route   GET /api/calendar/upcoming
// @access  Private
export const getUpcomingEvents = asyncHandler(async (req, res) => {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(now.getDate() + 7); // Get events for the next 7 days
  
  const events = await Calendar.find({
    user: req.user._id,
    startDate: { $gte: now, $lte: endDate }
  }).sort({ startDate: 1 });
  
  res.json(events);
});

// @desc    Get calendar statistics
// @route   GET /api/calendar/stats
// @access  Private
export const getCalendarStats = asyncHandler(async (req, res) => {
  const categoryStats = await Calendar.aggregate([
    { $match: { user: req.user._id } },
    { $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const monthlyEvents = await Calendar.countDocuments({
    user: req.user._id,
    startDate: { $gte: startOfMonth, $lte: endOfMonth }
  });
  
  // Get busy days (days with most events)
  const busyDays = await Calendar.aggregate([
    { $match: { user: req.user._id } },
    {
      $group: {
        _id: { 
          date: { 
            $dateToString: { format: "%Y-%m-%d", date: "$startDate" } 
          } 
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  
  res.json({
    categoryStats,
    monthlyEvents,
    busyDays,
    totalEvents: await Calendar.countDocuments({ user: req.user._id }),
    upcomingEvents: await Calendar.countDocuments({
      user: req.user._id,
      startDate: { $gte: now }
    })
  });
});