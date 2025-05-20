import express from 'express';
import { body } from 'express-validator';
import { 
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getUpcomingEvents,
  getCalendarStats
} from '../controllers/calendarController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Calendar event validation
const eventValidation = [
  body('title')
    .notEmpty().withMessage('Event title is required'),
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Please provide a valid date'),
  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('Please provide a valid date'),
  body('category')
    .optional()
    .isIn(['class', 'exam', 'assignment', 'meeting', 'study', 'personal', 'other'])
    .withMessage('Invalid category')
];

router.route('/')
  .post(protect, eventValidation, validate, createEvent)
  .get(protect, getEvents);

router.route('/upcoming')
  .get(protect, getUpcomingEvents);

router.route('/stats')
  .get(protect, getCalendarStats);

router.route('/:id')
  .get(protect, getEventById)
  .put(protect, updateEvent)
  .delete(protect, deleteEvent);

export default router;