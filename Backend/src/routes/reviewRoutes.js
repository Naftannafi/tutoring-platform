import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/authMiddleware.js';
import {
  createReview,
  getTutorReviews,
  getReviewBySession
} from '../controllers/reviewController.js';

const router = express.Router();

// Public routes
router.get('/tutor/:tutorId', getTutorReviews);

// Protected routes
router.use(protect);
router.post('/', authorize('student'), createReview);
router.get('/session/:sessionId', getReviewBySession); // both student/tutor can view

export default router;