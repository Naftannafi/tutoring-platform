import express from 'express';
import {
  registerTutor,
  getMyTutorProfile,
  updateTutorProfile,
  getAllTutors,
  getTutorById,
  blockDate,
  unblockDate,
  getSchedule
} from '../controllers/tutorController.js';

import {
  getPendingTutors,
  approveTutor,
  rejectTutor,
  getAllTutorsAdmin
} from '../controllers/adminController.js';

import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// ======================
// PUBLIC ROUTES (no authentication)
// ======================
router.get('/', getAllTutors);                     // GET /api/tutors

// ======================
// PRIVATE ROUTES (require authentication)
// Place these before public parameterized routes to avoid conflicts
// ======================

// Tutor registration and profile management
router.post('/register', protect, registerTutor);          // POST /api/tutors/register
router.get('/profile/me', protect, getMyTutorProfile);     // GET /api/tutors/profile/me
router.put('/profile/me', protect, updateTutorProfile);    // PUT /api/tutors/profile/me

// Availability management (tutor only)
router.post('/availability/block', protect, authorize('tutor'), blockDate);       // POST /api/tutors/availability/block
router.delete('/availability/block/:date', protect, authorize('tutor'), unblockDate); // DELETE /api/tutors/availability/block/:date
router.get('/availability/schedule', protect, authorize('tutor'), getSchedule);   // GET /api/tutors/availability/schedule (private)

// Admin routes (require admin role)
router.get('/admin/pending', protect, authorize('admin'), getPendingTutors);     // GET /api/tutors/admin/pending
router.get('/admin/all', protect, authorize('admin'), getAllTutorsAdmin);        // GET /api/tutors/admin/all
router.put('/admin/:id/approve', protect, authorize('admin'), approveTutor);     // PUT /api/tutors/admin/:id/approve
router.put('/admin/:id/reject', protect, authorize('admin'), rejectTutor);       // PUT /api/tutors/admin/:id/reject

// ======================
// PUBLIC PARAMETERIZED ROUTES (must come last, after all specific routes)
// ======================
router.get('/:id', getTutorById);                  // GET /api/tutors/:id (public profile)
router.get('/:tutorId/schedule', getSchedule);     // GET /api/tutors/:tutorId/schedule (public schedule)

export default router;