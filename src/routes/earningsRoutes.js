import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/authMiddleware.js';
import {
  getMyEarnings,
  getTutorEarningsReport,
  getMonthlyEarnings,
  exportEarningsCSV,
} from '../controllers/earningsController.js';

const router = express.Router();

router.use(protect);
router.get('/my-earnings', authorize('tutor'), getMyEarnings);
router.get('/report', authorize('tutor'), getTutorEarningsReport);    
router.get('/monthly', authorize('tutor'), getMonthlyEarnings);  
router.get('/export', authorize('tutor'), exportEarningsCSV);     

export default router;