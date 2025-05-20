import express from 'express';
import { body } from 'express-validator';
import { 
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Notification validation
const notificationValidation = [
  body('title')
    .notEmpty().withMessage('Notification title is required'),
  body('message')
    .notEmpty().withMessage('Notification message is required'),
  body('type')
    .optional()
    .isIn(['task', 'calendar', 'goal', 'system', 'other'])
    .withMessage('Invalid notification type'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high']).withMessage('Priority must be low, normal, or high')
];

router.route('/')
  .get(protect, getNotifications)
  .post(protect, notificationValidation, validate, createNotification);

router.put('/read-all', protect, markAllAsRead);

router.route('/:id')
  .delete(protect, deleteNotification);

router.route('/:id/read')
  .put(protect, markAsRead);

export default router;