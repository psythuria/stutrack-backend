import express from 'express';
import { 
  getDashboardAnalytics,
  getProductivityAnalytics,
  getAcademicAnalytics
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', protect, getDashboardAnalytics);
router.get('/productivity', protect, getProductivityAnalytics);
router.get('/academic', protect, getAcademicAnalytics);

export default router;