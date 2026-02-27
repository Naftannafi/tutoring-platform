// src/controllers/authController.js
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';

// ======================
// HELPER FUNCTIONS
// ======================

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// Send JSON response
const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// ======================
// AUTHENTICATION CONTROLLERS
// ======================

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { email, password, phone, fullName, role, location } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone }] 
    });

    if (existingUser) {
      return sendResponse(res, 400, false, 'User with this email or phone already exists');
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      phone,
      fullName,
      role: role || 'student',
      location
    });

    // Generate OTP for email verification
    const otp = user.generateEmailOTP();
    await user.save();

    sendResponse(res, 201, true, 'User registered successfully! Please check your email for verification code.', {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.getFormattedPhone(),
        location: user.location,
        isVerified: user.isVerified
      },
      otp: otp, // Remove this in production - for testing only!
      note: 'In production, OTP will be sent via email. For testing, use this OTP to verify.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendResponse(res, 400, false, 'Validation failed', { errors });
    }

    if (error.code === 11000) {
      return sendResponse(res, 400, false, 'User with this email or phone already exists');
    }

    sendResponse(res, 500, false, 'Server error during registration');
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendResponse(res, 400, false, 'Please provide email and password');
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return sendResponse(res, 401, false, 'Invalid email or password');
    }

    if (!user.isActive) {
      return sendResponse(res, 401, false, 'Account is deactivated. Please contact support.');
    }

    if (!user.isVerified) {
      return sendResponse(res, 401, false, 'Please verify your email before logging in. Check your email for the verification code.');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return sendResponse(res, 401, false, 'Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken(user._id);

    sendResponse(res, 200, true, 'Login successful!', {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.getFormattedPhone(),
        location: user.location,
        isVerified: user.isVerified
      },
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    sendResponse(res, 500, false, 'Server error during login');
  }
};

// @desc    Forgot password - request reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendResponse(res, 400, false, 'Email is required');
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists for security
      return sendResponse(res, 200, true, 'If your email is registered, you will receive a password reset link.');
    }

    if (!user.isActive) {
      return sendResponse(res, 400, false, 'Account is deactivated. Please contact support.');
    }

    // Generate password reset token
    const resetToken = user.generatePasswordReset();
    await user.save();

    // In production, we would send email with reset link
    // For now, return token for testing
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;

    sendResponse(res, 200, true, 'Password reset instructions sent to your email.', {
      resetToken: resetToken, // Remove in production - for testing only
      resetUrl: resetUrl,     // Remove in production - for testing only
      note: 'In production, this would be sent via email. For testing, use this token to reset password.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    sendResponse(res, 500, false, 'Server error processing password reset request');
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return sendResponse(res, 400, false, 'Token and new password are required');
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return sendResponse(res, 400, false, 'Invalid or expired reset token. Please request a new password reset.');
    }

    // Validate new password
    if (newPassword.length < 8) {
      return sendResponse(res, 400, false, 'Password must be at least 8 characters');
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    sendResponse(res, 200, true, 'Password reset successfully! You can now login with your new password.');

  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendResponse(res, 400, false, 'Password validation failed', { errors });
    }

    sendResponse(res, 500, false, 'Server error resetting password');
  }
};

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // DEBUG: Log the verification attempt
    console.log('🔍 Verify Email - Received:', { email, otp });

    if (!email || !otp) {
      return sendResponse(res, 400, false, 'Email and OTP are required');
    }

    // Find user and INCLUDE OTP fields (use + to include select:false fields)
    const user = await User.findOne({ email })
      .select('+otp +otpExpires +otpAttempts');

    // DEBUG: Log user findings
    console.log('🔍 Verify Email - User found:', user ? 'Yes' : 'No');
    if (user) {
      console.log('🔍 User OTP fields:', {
        storedOTP: user.otp,
        otpExpires: user.otpExpires,
        attempts: user.otpAttempts,
        isVerified: user.isVerified
      });
    }

    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    if (user.isVerified) {
      return sendResponse(res, 400, false, 'Email is already verified');
    }

    // Verify OTP using our User model method
    try {
      const isValid = await user.verifyOTP(otp);
      await user.save();

      console.log('✅ OTP verified successfully!');
      
      // Generate JWT token after verification
      const token = generateToken(user._id);

      sendResponse(res, 200, true, 'Email verified successfully!', {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.getFormattedPhone(),
          location: user.location,
          isVerified: user.isVerified
        },
        token
      });

    } catch (otpError) {
      console.log('❌ OTP Error:', otpError.message);
      await user.save(); // Save attempt count
      return sendResponse(res, 400, false, otpError.message);
    }

  } catch (error) {
    console.error('Email verification error:', error);
    sendResponse(res, 500, false, 'Server error during email verification');
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendResponse(res, 400, false, 'Email is required');
    }

    // Find user and include OTP fields
    const user = await User.findOne({ email })
      .select('+otp +otpExpires +otpAttempts +lastOtpSent +isVerified');

    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    if (user.isVerified) {
      return sendResponse(res, 400, false, 'Email is already verified');
    }

    // Check if we can resend OTP (rate limiting)
    if (!user.canResendOTP()) {
      return sendResponse(res, 429, false, 'Please wait 1 minute before requesting a new OTP');
    }

    // Generate new OTP
    const otp = user.generateEmailOTP();
    await user.save();

    sendResponse(res, 200, true, 'New verification code sent', {
      otp: otp, // Remove in production
      note: process.env.NODE_ENV === 'development' ? `New OTP: ${otp}` : 'Check your email'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    sendResponse(res, 500, false, 'Server error resending OTP');
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // req.user will be set by our auth middleware (we'll build this next)
    const user = await User.findById(req.user.id);

    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    sendResponse(res, 200, true, 'User profile retrieved successfully', {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.getFormattedPhone(),
        location: user.location,
        isVerified: user.isVerified,
        profileImage: user.profileImage
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    sendResponse(res, 500, false, 'Server error retrieving profile');
  }
};

// Export all controllers
export {
  register,
  login,
  verifyEmail,
  resendOTP,
  getMe,
  forgotPassword, 
  resetPassword    
};