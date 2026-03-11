import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/authMiddleware.js';
import { paymentLimiter } from '../middlewares/rateLimiter.js';
import {
  initiatePayment,
  chapaWebhook,
  verifyPaymentStatus,
  refundPaymentController
} from '../controllers/paymentController.js';

const router = express.Router();

// Public webhook (with rate limiting)
router.post('/webhook', paymentLimiter, chapaWebhook);

// Protected routes
router.use(protect);
router.post('/initiate', authorize('student'), paymentLimiter, initiatePayment);
router.get('/verify/:tx_ref', verifyPaymentStatus);

// Admin only – refund
router.put('/:paymentId/refund', authorize('admin'), refundPaymentController);

export default router;