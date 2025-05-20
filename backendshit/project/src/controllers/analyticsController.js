import Task from '../models/taskModel.js';
import Journal from '../models/journalModel.js';
import Calendar from '../models/calendarModel.js';
import Goal from '../models/goalModel.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private
export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const endOfDay = new Date(now.setHours(23, 59, 59, 999));
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(now);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  // Task statistics
  const tasksDueToday = await Task.countDocuments({
    user: req.user._id,
    dueDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $ne: 'completed' }
  });
  
  const tasksCompletedToday = await Task.countDocuments({
    user: req.user._id,
    completedAt: { $gte: startOfDay, $lte: endOfDay }
  });
  
  const tasksOverdue = await Task.countDocuments({
    user: req.user._id,
    dueDate: { $lt: startOfDay },
    status: { $ne: 'completed' }
  });
  
  // Journal statistics
  const journalsThisWeek = await Journal.countDocuments({
    user: req.user._id,
    createdAt: { $gte: startOfWeek, $lte: endOfWeek }
  });
  
  // Events statistics
  const eventsToday = await Calendar.countDocuments({
    user: req.user._id,
    startDate: { $gte: startOfDay, $lte: endOfDay }
  });
  
  const eventsThisWeek = await Calendar.countDocuments({
    user: req.user._id,
    startDate: { $gte: startOfWeek, $lte: endOfWeek }
  });
  
  // Goals statistics
  const activeGoals = await Goal.countDocuments({
    user: req.user._id,
    status: 'in-progress'
  });
  
  const completedGoalsThisMonth = await Goal.countDocuments({
    user: req.user._id,
    completedAt: { $gte: startOfMonth, $lte: endOfMonth }
  });
  
  // Task completion rate
  const totalTasksThisWeek = await Task.countDocuments({
    user: req.user._id,
    createdAt: { $gte: startOfWeek, $lte: endOfWeek }
  });
  
  const completedTasksThisWeek = await Task.countDocuments({
    user: req.user._id,
    status: 'completed',
    completedAt: { $gte: startOfWeek, $lte: endOfWeek }
  });
  
  const taskCompletionRate = totalTasksThisWeek > 0 
    ? (completedTasksThisWeek / totalTasksThisWeek) * 100 
    : 0;
  
  // Daily task completion over time (last 7 days)
  const dailyTaskCompletion = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    const dayStart = new Date(day.setHours(0, 0, 0, 0));
    const dayEnd = new Date(day.setHours(23, 59, 59, 999));
    
    const completed = await Task.countDocuments({
      user: req.user._id,
      completedAt: { $gte: dayStart, $lte: dayEnd }
    });
    
    dailyTaskCompletion.push({
      date: dayStart.toISOString().split('T')[0],
      completed
    });
  }
  
  res.json({
    tasksDueToday,
    tasksCompletedToday,
    tasksOverdue,
    journalsThisWeek,
    eventsToday,
    eventsThisWeek,
    activeGoals,
    completedGoalsThisMonth,
    taskCompletionRate,
    dailyTaskCompletion,
    productivityScore: calculateProductivityScore({
      taskCompletionRate,
      journalsThisWeek,
      activeGoals,
      eventsThisWeek
    })
  });
});

// @desc    Get productivity analytics
// @route   GET /api/analytics/productivity
// @access  Private
export const getProductivityAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  
  // Get monthly task completion rates for the last 6 months
  const monthlyTaskCompletion = [];
  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
    
    const totalTasks = await Task.countDocuments({
      user: req.user._id,
      dueDate: { $gte: monthStart, $lte: monthEnd }
    });
    
    const completedTasks = await Task.countDocuments({
      user: req.user._id,
      status: 'completed',
      completedAt: { $gte: monthStart, $lte: monthEnd }
    });
    
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    monthlyTaskCompletion.push({
      month: monthStart.toISOString().slice(0, 7),
      completionRate: Math.round(completionRate)
    });
  }
  
  // Get task completion by category
  const taskCompletionByCategory = await Task.aggregate([
    { $match: { 
      user: req.user._id,
      status: 'completed'
    }},
    { $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  // Get average task completion time by priority
  const avgCompletionByPriority = await Task.aggregate([
    { $match: { 
      user: req.user._id,
      status: 'completed',
      completedAt: { $exists: true }
    }},
    { $project: {
        priority: 1,
        completionTime: { 
          $subtract: ['$completedAt', '$createdAt'] 
        }
      }
    },
    { $group: {
        _id: '$priority',
        avgTime: { $avg: '$completionTime' }
      }
    }
  ]);
  
  // Convert milliseconds to hours for average completion time
  const avgCompletionTimeByPriority = avgCompletionByPriority.map(item => ({
    priority: item._id,
    avgHours: Math.round((item.avgTime / (1000 * 60 * 60)) * 10) / 10
  }));
  
  // Get busiest days of the week
  const busiestDays = await Calendar.aggregate([
    { $match: { user: req.user._id } },
    { $project: {
        dayOfWeek: { $dayOfWeek: '$startDate' }
      }
    },
    { $group: {
        _id: '$dayOfWeek',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  // Convert day numbers to names
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const busiestDaysByName = busiestDays.map(day => ({
    day: dayNames[day._id - 1],
    count: day.count
  }));
  
  res.json({
    monthlyTaskCompletion,
    taskCompletionByCategory,
    avgCompletionTimeByPriority,
    busiestDaysByName,
    productivityTrend: calculateProductivityTrend(monthlyTaskCompletion)
  });
});

// @desc    Get academic performance analytics
// @route   GET /api/analytics/academic
// @access  Private
export const getAcademicAnalytics = asyncHandler(async (req, res) => {
  // Get course-specific task completion rates
  const courseTaskCompletion = await Task.aggregate([
    { $match: { 
      user: req.user._id,
      course: { $exists: true, $ne: '' },
      category: 'academic'
    }},
    { $group: {
        _id: '$course',
        total: { $sum: 1 },
        completed: { 
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } 
        }
      }
    },
    { $project: {
        course: '$_id',
        total: 1,
        completed: 1,
        completionRate: { 
          $multiply: [
            { $divide: ['$completed', '$total'] }, 
            100
          ] 
        }
      }
    },
    { $sort: { completionRate: -1 } }
  ]);
  
  // Study time allocation (based on calendar events)
  const studyTimeAllocation = await Calendar.aggregate([
    { $match: { 
      user: req.user._id,
      category: 'study'
    }},
    { $project: {
        course: '$title',
        durationMs: { $subtract: ['$endDate', '$startDate'] }
      }
    },
    { $group: {
        _id: '$course',
        totalHours: { 
          $sum: { $divide: ['$durationMs', (1000 * 60 * 60)] } 
        }
      }
    },
    { $sort: { totalHours: -1 } }
  ]);
  
  // Task distribution by priority for academic tasks
  const academicTasksByPriority = await Task.aggregate([
    { $match: { 
      user: req.user._id,
      category: 'academic'
    }},
    { $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  // Academic goal progress
  const academicGoals = await Goal.find({
    user: req.user._id,
    category: 'academic',
    status: { $ne: 'completed' }
  }).select('title progress targetDate');
  
  res.json({
    courseTaskCompletion,
    studyTimeAllocation,
    academicTasksByPriority,
    academicGoals,
    academicProductivityScore: calculateAcademicProductivityScore({
      courseTaskCompletion,
      studyTimeAllocation
    })
  });
});

// Helper function to calculate productivity score
const calculateProductivityScore = ({ taskCompletionRate, journalsThisWeek, activeGoals, eventsThisWeek }) => {
  // This is a simple productivity score formula that can be adjusted
  // Weights: tasks (50%), journals (20%), goals (20%), events (10%)
  const taskScore = Math.min(taskCompletionRate, 100) * 0.5;
  const journalScore = Math.min(journalsThisWeek * 15, 100) * 0.2; // Max of 7 journals (one per day)
  const goalScore = Math.min(activeGoals * 25, 100) * 0.2; // Max of 4 active goals
  const eventScore = Math.min(eventsThisWeek * 5, 100) * 0.1; // Max of 20 events per week
  
  return Math.round(taskScore + journalScore + goalScore + eventScore);
};

// Helper function to calculate productivity trend
const calculateProductivityTrend = (monthlyData) => {
  if (monthlyData.length < 2) return 'stable';
  
  const currentMonth = monthlyData[monthlyData.length - 1].completionRate;
  const previousMonth = monthlyData[monthlyData.length - 2].completionRate;
  
  const difference = currentMonth - previousMonth;
  
  if (difference > 10) return 'increasing';
  if (difference < -10) return 'decreasing';
  return 'stable';
};

// Helper function to calculate academic productivity score
const calculateAcademicProductivityScore = ({ courseTaskCompletion, studyTimeAllocation }) => {
  // Calculate average completion rate across courses
  let totalCompletionRate = 0;
  courseTaskCompletion.forEach(course => {
    totalCompletionRate += course.completionRate || 0;
  });
  
  const avgCompletionRate = courseTaskCompletion.length > 0 
    ? totalCompletionRate / courseTaskCompletion.length 
    : 0;
  
  // Calculate total study hours
  let totalStudyHours = 0;
  studyTimeAllocation.forEach(course => {
    totalStudyHours += course.totalHours || 0;
  });
  
  // Recommended minimum study hours per week: 15
  const studyHoursScore = Math.min(totalStudyHours / 15 * 100, 100);
  
  // Weight: completion rate (70%), study hours (30%)
  return Math.round((avgCompletionRate * 0.7) + (studyHoursScore * 0.3));
};