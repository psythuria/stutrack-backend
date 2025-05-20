import Notification from '../models/notificationModel.js';
import Task from '../models/taskModel.js';
import Calendar from '../models/calendarModel.js';
import Goal from '../models/goalModel.js';
import cron from 'node-cron';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// @desc    Get all notifications for a user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const unreadOnly = req.query.unread === 'true';
  
  // Build filter object
  const filter = { user: req.user._id };
  if (unreadOnly) filter.isRead = false;
  
  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
  
  const count = await Notification.countDocuments(filter);
  
  res.json({
    notifications,
    page,
    pages: Math.ceil(count / limit),
    total: count,
    unreadCount: await Notification.countDocuments({ 
      user: req.user._id, 
      isRead: false 
    })
  });
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);
  
  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }
  
  // Make sure the notification belongs to the logged in user
  if (notification.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this notification', 401));
  }
  
  notification.isRead = true;
  await notification.save();
  
  res.json(notification);
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { isRead: true }
  );
  
  res.json({ message: 'All notifications marked as read' });
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);
  
  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }
  
  // Make sure the notification belongs to the logged in user
  if (notification.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to delete this notification', 401));
  }
  
  await notification.deleteOne();
  
  res.json({ message: 'Notification removed' });
});

// @desc    Create a notification manually
// @route   POST /api/notifications
// @access  Private
export const createNotification = asyncHandler(async (req, res) => {
  const { title, message, type, priority, relatedId, refModel } = req.body;
  
  const notification = await Notification.create({
    user: req.user._id,
    title,
    message,
    type,
    priority,
    relatedId,
    refModel,
    deliveryDate: new Date()
  });
  
  res.status(201).json(notification);
});

// Helper function to schedule task reminders
const scheduleTaskReminders = async () => {
  console.log('Scheduling task reminders...');
  
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    try {
      // Find tasks due within the next hour that haven't had notifications sent
      const tasks = await Task.find({
        status: { $nin: ['completed'] },
        dueDate: { $gte: now, $lte: oneHourLater },
        notificationSent: false
      }).populate('user', '_id');
      
      for (const task of tasks) {
        // Create notification
        await Notification.create({
          user: task.user._id,
          title: 'Task Due Soon',
          message: `"${task.title}" is due in less than an hour.`,
          type: 'task',
          relatedId: task._id,
          refModel: 'Task',
          priority: task.priority === 'high' ? 'high' : 'normal'
        });
        
        // Mark notification as sent
        task.notificationSent = true;
        await task.save();
      }
      
      // Find tasks that are overdue and haven't had notifications sent
      const overdueTasks = await Task.find({
        status: { $nin: ['completed', 'overdue'] },
        dueDate: { $lt: now },
        notificationSent: false
      }).populate('user', '_id');
      
      for (const task of overdueTasks) {
        // Update task status to overdue
        task.status = 'overdue';
        
        // Create notification
        await Notification.create({
          user: task.user._id,
          title: 'Task Overdue',
          message: `"${task.title}" is now overdue.`,
          type: 'task',
          relatedId: task._id,
          refModel: 'Task',
          priority: 'high'
        });
        
        // Mark notification as sent
        task.notificationSent = true;
        await task.save();
      }
    } catch (error) {
      console.error('Error scheduling task reminders:', error);
    }
  });
};

// Helper function to schedule calendar event reminders
const scheduleEventReminders = async () => {
  console.log('Scheduling event reminders...');
  
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    const now = new Date();
    
    try {
      // Find all calendar events that are upcoming
      const events = await Calendar.find({
        startDate: { $gt: now },
        notificationSent: false
      }).populate('user', '_id');
      
      for (const event of events) {
        const reminderTime = event.reminderTime || 30; // Default 30 minutes
        const reminderDate = new Date(event.startDate.getTime() - (reminderTime * 60 * 1000));
        
        // Check if it's time to send the reminder
        if (reminderDate <= now) {
          // Create notification
          await Notification.create({
            user: event.user._id,
            title: 'Event Reminder',
            message: `"${event.title}" is starting in ${reminderTime} minutes.`,
            type: 'calendar',
            relatedId: event._id,
            refModel: 'Calendar',
            priority: 'normal'
          });
          
          // Mark notification as sent
          event.notificationSent = true;
          await event.save();
        }
      }
    } catch (error) {
      console.error('Error scheduling event reminders:', error);
    }
  });
};

// Helper function to schedule goal deadline reminders
const scheduleGoalReminders = async () => {
  console.log('Scheduling goal reminders...');
  
  // Run once daily at midnight
  cron.schedule('0 0 * * *', async () => {
    const now = new Date();
    const oneWeekLater = new Date(now);
    oneWeekLater.setDate(now.getDate() + 7);
    
    try {
      // Find goals with target dates approaching in the next week
      const goals = await Goal.find({
        status: { $nin: ['completed', 'abandoned'] },
        targetDate: { $gte: now, $lte: oneWeekLater }
      }).populate('user', '_id');
      
      for (const goal of goals) {
        // Calculate days remaining
        const daysRemaining = Math.ceil((goal.targetDate - now) / (1000 * 60 * 60 * 24));
        
        // Create notification
        await Notification.create({
          user: goal.user._id,
          title: 'Goal Deadline Approaching',
          message: `"${goal.title}" has ${daysRemaining} days remaining to complete.`,
          type: 'goal',
          relatedId: goal._id,
          refModel: 'Goal',
          priority: goal.priority === 'high' ? 'high' : 'normal'
        });
      }
      
      // Find goals with missed target dates
      const overdueGoals = await Goal.find({
        status: { $nin: ['completed', 'abandoned'] },
        targetDate: { $lt: now }
      }).populate('user', '_id');
      
      for (const goal of overdueGoals) {
        // Create notification
        await Notification.create({
          user: goal.user._id,
          title: 'Goal Deadline Missed',
          message: `"${goal.title}" has passed its target date. Consider updating the goal or target date.`,
          type: 'goal',
          relatedId: goal._id,
          refModel: 'Goal',
          priority: 'high'
        });
      }
    } catch (error) {
      console.error('Error scheduling goal reminders:', error);
    }
  });
};

// Initialize notification schedulers
export const initNotificationSchedulers = () => {
  scheduleTaskReminders();
  scheduleEventReminders();
  scheduleGoalReminders();
};