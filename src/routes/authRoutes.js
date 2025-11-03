// src/routes/authRoutes.js
import express from 'express';
import  {
  register,
  login,
  verifyEmail,
  resendOTP,
  getMe,
  forgotPassword, 
  resetPassword    
} from '../controllers/authController.js';

const router = express.Router();

// ======================
// AUTHENTICATION ROUTES
// ======================

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', register);

// @desc    Login user
// @route   POST /api/auth/login  
// @access  Public
router.post('/login', login);

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', getMe);

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public  
router.post('/verify-email', verifyEmail);

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
router.post('/resend-otp', resendOTP);

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', forgotPassword);

// @desc    Reset password
// @route   POST /api/auth/reset-password  
// @access  Public
router.post('/reset-password', resetPassword);

export default router;