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
import {
  getDashboardStats,
  getRecentActivities,
  getTrends
} from '../controllers/adminDashboardController.js';
import {
  getAllUsers,
  updateUser,
  deleteUser,
  getUserDetails
} from '../controllers/adminUserController.js';
import {
  getUserAnalytics,
  getSessionAnalytics,
  getRevenueAnalytics,
  getTutorAnalytics,
  getPlatformHealth
} from '../controllers/analyticsController.js';


const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, authorize('admin'));

// ======================
// Tutor Management
// ======================
router.get('/tutors/pending', getPendingTutors);
router.put('/tutors/:id/approve', approveTutor);
router.put('/tutors/:id/reject', rejectTutor);
router.get('/tutors', getAllTutorsAdmin);

// ======================
// Revenue & Payment Reporting
// ======================
router.get('/revenue/summary', getRevenueSummary);
router.get('/payments', getAllPaymentsAdmin);
router.get('/revenue/monthly', getMonthlyRevenue);

// ======================
// Dashboard & Analytics
// ======================
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/recent-activities', getRecentActivities);
router.get('/dashboard/trends', getTrends);

// ======================
// User Management
// ======================
router.get('/users', getAllUsers);
router.get('/users/:id/details', getUserDetails);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Analytics
router.get('/analytics/users', getUserAnalytics);
router.get('/analytics/sessions', getSessionAnalytics);
router.get('/analytics/revenue', getRevenueAnalytics);
router.get('/analytics/tutors', getTutorAnalytics);
router.get('/analytics/health', getPlatformHealth);

export default router;