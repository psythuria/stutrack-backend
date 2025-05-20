import mongoose from 'mongoose';

const calendarSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  allDay: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['class', 'exam', 'assignment', 'meeting', 'study', 'personal', 'other'],
    default: 'class'
  },
  color: {
    type: String,
    default: '#3788d8'
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none'
    },
    endDate: {
      type: Date
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }]
  },
  reminderTime: {
    type: Number, // minutes before event
    default: 30
  },
  notificationSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
calendarSchema.index({ user: 1, startDate: 1 });
calendarSchema.index({ user: 1, category: 1 });

const Calendar = mongoose.model('Calendar', calendarSchema);

export default Calendar;