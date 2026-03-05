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
// PUBLIC ROUTES
// ======================
router.get('/', getAllTutors);                     // GET /api/tutors
router.get('/:id', getTutorById);                  // GET /api/tutors/:id
// Public schedule for a specific tutor
router.get('/:tutorId/schedule', getSchedule);     // GET /api/tutors/:tutorId/schedule

// ======================
// PRIVATE ROUTES (Require authentication)
// ======================
router.use(protect);

// Tutor registration and profile management
router.post('/register', registerTutor);            // POST /api/tutors/register
router.get('/profile/me', getMyTutorProfile);       // GET /api/tutors/profile/me
router.put('/profile/me', updateTutorProfile);      // PUT /api/tutors/profile/me

// ======================
// TUTOR AVAILABILITY MANAGEMENT (Day 13)
// ======================
router.post('/availability/block', authorize('tutor'), blockDate);       // POST /api/tutors/availability/block
router.delete('/availability/block/:date', authorize('tutor'), unblockDate); // DELETE /api/tutors/availability/block/:date
router.get('/availability/schedule', authorize('tutor'), getSchedule);   // GET /api/tutors/availability/schedule (private)

// ======================
// ADMIN ROUTES (Require admin role)
// ======================
router.use(authorize('admin'));

router.get('/admin/pending', getPendingTutors);     // GET /api/tutors/admin/pending
router.get('/admin/all', getAllTutorsAdmin);        // GET /api/tutors/admin/all
router.put('/admin/:id/approve', approveTutor);     // PUT /api/tutors/admin/:id/approve
router.put('/admin/:id/reject', rejectTutor);       // PUT /api/tutors/admin/:id/reject

export default router;