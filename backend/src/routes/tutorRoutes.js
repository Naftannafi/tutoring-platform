import express from 'express';
import {
  registerTutor,
  getMyTutorProfile,
  updateTutorProfile,
  getAllTutors,
  getTutorById
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
router.get('/', getAllTutors); // GET /api/tutors - Public search
router.get('/:id', getTutorById); // GET /api/tutors/:id - Public profile

// ======================
// PRIVATE ROUTES (Require authentication)
// ======================
router.use(protect); // All routes below require authentication

// Tutor registration and profile management
router.post('/register', registerTutor); // POST /api/tutors/register
router.get('/profile/me', getMyTutorProfile); // GET /api/tutors/profile/me
router.put('/profile/me', updateTutorProfile); // PUT /api/tutors/profile/me

// ======================
// ADMIN ROUTES (Require admin role)
// ======================
router.use(authorize('admin')); // All routes below require admin role

router.get('/admin/pending', getPendingTutors); // GET /api/tutors/admin/pending
router.get('/admin/all', getAllTutorsAdmin); // GET /api/tutors/admin/all
router.put('/admin/:id/approve', approveTutor); // PUT /api/tutors/admin/:id/approve
router.put('/admin/:id/reject', rejectTutor); // PUT /api/tutors/admin/:id/reject

export default router;