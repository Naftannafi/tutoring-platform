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

const router = express.Router();

// All routes require authentication
router.use(protect);

// Student can book a session
router.post('/book', authorize('student'), bookSession);

// Get my sessions (works for both student and tutor)
router.get('/my-sessions', getMySessions);

// Get a single session by ID
router.get('/:id', getSessionById);                

// Tutor actions
router.put('/:id/confirm', authorize('tutor'), confirmSession);
router.put('/:id/complete', authorize('tutor'), completeSession);

// Both student and tutor can cancel
router.put('/:id/cancel', cancelSession);

export default router;