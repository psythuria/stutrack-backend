import express from 'express';
import { body } from 'express-validator';
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile,
  getUsers,
  deleteUser
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Registration validation
const registerValidation = [
  body('firstName')
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName')
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('studentId')
    .notEmpty().withMessage('Student ID is required')
    .isLength({ min: 5 }).withMessage('Student ID must be at least 5 characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('department')
    .notEmpty().withMessage('Department is required'),
  body('course')
    .notEmpty().withMessage('Course is required'),
  body('yearLevel')
    .notEmpty().withMessage('Year level is required')
];

// Login validation
const loginValidation = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

// Update profile validation
const updateProfileValidation = [
  body('email')
    .optional()
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .optional()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

router.route('/')
  .post(registerValidation, validate, registerUser)
  .get(protect, authorize('admin'), getUsers);

router.post('/login', loginValidation, validate, loginUser);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateProfileValidation, validate, updateUserProfile);

router.route('/:id')
  .delete(protect, authorize('admin'), deleteUser);

export default router;