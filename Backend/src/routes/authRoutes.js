// src/routes/authRoutes.js
import express from 'express';
import {
  register,
  login,
  verifyEmail,
  resendOTP,
  getMe,
  forgotPassword, 
  resetPassword    
} from '../controllers/authController.js';
import User from '../models/User.js';
import { protect } from '../middlewares/authMiddleware.js';
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
router.get('/me',protect, getMe);

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

// ======================
// DEBUG ROUTES (TEMPORARY)
// ======================

// @desc    Debug - Check users in database
// @route   GET /api/auth/debug-users
// @access  Public
router.get('/debug-users', async (req, res) => {
  try {
    const users = await User.find().limit(3);
    
    res.json({
      success: true,
      totalUsers: await User.countDocuments(),
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        location: user.location,
        isVerified: user.isVerified,
        role: user.role,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// @desc    Debug - Test token reception
// @route   GET /api/auth/test-token
// @access  Public
router.get('/test-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    res.json({
      success: true,
      tokenReceived: !!token,
      tokenLength: token ? token.length : 0,
      authorizationHeader: req.headers.authorization
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;