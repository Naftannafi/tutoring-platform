import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  getPendingTutors,
  approveTutor,
  rejectTutor,
  getAllTutorsAdmin,
  getRevenueSummary,
  getAllPaymentsAdmin,
  getMonthlyRevenue
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, authorize('admin'));

// Tutor management
router.get('/tutors/pending', getPendingTutors);
router.put('/tutors/:id/approve', approveTutor);
router.put('/tutors/:id/reject', rejectTutor);
router.get('/tutors', getAllTutorsAdmin);

// Revenue and payment reporting
router.get('/revenue/summary', getRevenueSummary);
router.get('/payments', getAllPaymentsAdmin);
router.get('/revenue/monthly', getMonthlyRevenue);

export default router;