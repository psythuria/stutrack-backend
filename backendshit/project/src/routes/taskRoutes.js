import express from 'express';
import { body } from 'express-validator';
import { 
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
  getOverdueTasks
} from '../controllers/taskController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Task validation
const taskValidation = [
  body('title')
    .notEmpty().withMessage('Task title is required'),
  body('dueDate')
    .notEmpty().withMessage('Due date is required')
    .isISO8601().withMessage('Please provide a valid date'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
  body('category')
    .optional()
    .isIn(['academic', 'personal', 'extracurricular', 'other']).withMessage('Invalid category')
];

router.route('/')
  .post(protect, taskValidation, validate, createTask)
  .get(protect, getTasks);

router.route('/stats')
  .get(protect, getTaskStats);

router.route('/overdue')
  .get(protect, getOverdueTasks);

router.route('/:id')
  .get(protect, getTaskById)
  .put(protect, updateTask)
  .delete(protect, deleteTask);

export default router;