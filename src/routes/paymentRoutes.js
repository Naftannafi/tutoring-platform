import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/authMiddleware.js';
import {
  initiatePayment,
  chapaWebhook,
  verifyPaymentStatus
} from '../controllers/paymentController.js';

const router = express.Router();

// Public webhook (no auth)
router.post('/webhook', chapaWebhook);

// Protected routes
router.use(protect);
router.post('/initiate', authorize('student'), initiatePayment);
router.get('/verify/:tx_ref', verifyPaymentStatus);

export default router;