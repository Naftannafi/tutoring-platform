import User from '../models/User.js';
import Tutor from '../models/Tutor.js';        // <-- ADD THIS
import Session from '../models/Session.js';    // <-- ADD THIS
import Payment from '../models/Payment.js';    // <-- ADD THIS

const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// @desc    Get all users with filtering and pagination
// @route   GET /api/admin/users
// @access  Private (Admin)
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      isVerified,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const users = await User.find(filter)
      .select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpires')
      .skip(skip)
      .limit(limitNum)
      .sort(sort);

    const total = await User.countDocuments(filter);

    sendResponse(res, 200, true, 'Users retrieved', {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Update a user (role, active status, etc.)
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res) => {
  try {
    const { role, isActive, isVerified } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    // Update allowed fields
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (isVerified !== undefined) user.isVerified = isVerified;

    await user.save();

    sendResponse(res, 200, true, 'User updated', { user });
  } catch (error) {
    console.error('Update user error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Delete a user (soft delete by setting isActive = false)
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    // Soft delete – just deactivate
    user.isActive = false;
    await user.save();

    sendResponse(res, 200, true, 'User deactivated');
  } catch (error) {
    console.error('Delete user error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Get user details with related data (sessions, payments, etc.)
// @route   GET /api/admin/users/:id/details
// @access  Private (Admin)
export const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    // Fetch related data
    let tutorProfile = null;
    if (user.role === 'tutor') {
      tutorProfile = await Tutor.findOne({ userId: user._id });
    }

    const sessionsAsStudent = await Session.find({ studentId: user._id })
      .populate({
        path: 'tutorId',
        populate: { path: 'userId', select: 'fullName' }
      })
      .sort({ createdAt: -1 })
      .limit(10);

    const sessionsAsTutor = user.role === 'tutor'
      ? await Session.find({ tutorId: tutorProfile?._id })
          .populate('studentId', 'fullName')
          .sort({ createdAt: -1 })
          .limit(10)
      : [];

    const payments = await Payment.find({ userId: user._id })
      .populate('sessionId', 'subject date')
      .sort({ createdAt: -1 })
      .limit(10);

    sendResponse(res, 200, true, 'User details retrieved', {
      user,
      tutorProfile,
      recentSessions: {
        asStudent: sessionsAsStudent,
        asTutor: sessionsAsTutor
      },
      recentPayments: payments
    });
  } catch (error) {
    console.error('Get user details error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};