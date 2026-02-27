import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  getPendingTutors,
  approveTutor,
  rejectTutor,
  getAllTutorsAdmin
} from '../controllers/adminController.js'; // adjust path

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, authorize('admin'));

router.get('/tutors/pending', getPendingTutors);
router.put('/tutors/:id/approve', approveTutor);
router.put('/tutors/:id/reject', rejectTutor);
router.get('/tutors', getAllTutorsAdmin);

export default router;