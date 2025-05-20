import express from 'express';
import { body } from 'express-validator';
import { 
  createJournal,
  getJournals,
  getJournalById,
  updateJournal,
  deleteJournal,
  getJournalStats
} from '../controllers/journalController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Journal validation
const journalValidation = [
  body('title')
    .notEmpty().withMessage('Journal title is required'),
  body('content')
    .notEmpty().withMessage('Journal content is required'),
  body('mood')
    .optional()
    .isIn(['happy', 'excited', 'neutral', 'tired', 'stressed', 'sad']).withMessage('Invalid mood'),
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array'),
  body('isPrivate')
    .optional()
    .isBoolean().withMessage('isPrivate must be a boolean')
];

router.route('/')
  .post(protect, journalValidation, validate, createJournal)
  .get(protect, getJournals);

router.route('/stats')
  .get(protect, getJournalStats);

router.route('/:id')
  .get(protect, getJournalById)
  .put(protect, updateJournal)
  .delete(protect, deleteJournal);

export default router;