import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/authMiddleware.js';
import {
  bookSession,
  getMySessions,
  getSessionById,
  confirmSession,
  cancelSession,
  completeSession
} from '../controllers/sessionController.js';
import { bookingLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Student can book a session (rate limited)
router.post('/book', authorize('student'), bookingLimiter, bookSession);

// Get my sessions
router.get('/my-sessions', getMySessions);

// Get a single session by ID
router.get('/:id', getSessionById);

// Tutor actions
router.put('/:id/confirm', authorize('tutor'), confirmSession);
router.put('/:id/complete', authorize('tutor'), completeSession);

// Both student and tutor can cancel
router.put('/:id/cancel', cancelSession);

export default router;