import express from 'express';
import { body } from 'express-validator';
import { 
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  addReflection,
  getGoalStats
} from '../controllers/goalController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Goal validation
const goalValidation = [
  body('title')
    .notEmpty().withMessage('Goal title is required'),
  body('targetDate')
    .notEmpty().withMessage('Target date is required')
    .isISO8601().withMessage('Please provide a valid date'),
  body('category')
    .optional()
    .isIn(['academic', 'career', 'personal', 'health', 'financial', 'other'])
    .withMessage('Invalid category'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high')
];

// Milestone validation
const milestoneValidation = [
  body('title')
    .notEmpty().withMessage('Milestone title is required'),
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Please provide a valid date')
];

// Reflection validation
const reflectionValidation = [
  body('content')
    .notEmpty().withMessage('Reflection content is required')
];

router.route('/')
  .post(protect, goalValidation, validate, createGoal)
  .get(protect, getGoals);

router.route('/stats')
  .get(protect, getGoalStats);

router.route('/:id')
  .get(protect, getGoalById)
  .put(protect, updateGoal)
  .delete(protect, deleteGoal);

router.route('/:id/milestones')
  .post(protect, milestoneValidation, validate, addMilestone);

router.route('/:id/milestones/:milestoneId')
  .put(protect, updateMilestone)
  .delete(protect, deleteMilestone);

router.route('/:id/reflections')
  .post(protect, reflectionValidation, validate, addReflection);

export default router;