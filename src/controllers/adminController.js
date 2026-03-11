import Tutor from '../models/Tutor.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Earnings from '../models/Earnings.js';
import Session from '../models/Session.js';
import { createNotification } from '../services/notificationService.js';   

// @desc    Get all pending tutors
// @route   GET /api/admin/tutors/pending
// @access  Private (Admin only)
export const getPendingTutors = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const tutors = await Tutor.find({ status: 'pending' })
      .populate('userId', 'firstName lastName email createdAt')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Tutor.countDocuments({ status: 'pending' });

    res.status(200).json({
      success: true,
      count: tutors.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: tutors
    });

  } catch (error) {
    console.error('Get pending tutors error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending tutors',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Approve a tutor
// @route   PUT /api/admin/tutors/:id/approve
// @access  Private (Admin only)
export const approveTutor = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor not found'
      });
    }

    if (tutor.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Tutor is already approved'
      });
    }

    tutor.status = 'approved';
    tutor.approvedBy = req.user.id;
    tutor.approvedAt = new Date();
    
    if (req.body.notes) {
      tutor.adminNotes = req.body.notes;
    }

    await tutor.save();

    // --- NOTIFICATION: Notify tutor of approval ---
    await createNotification(
      tutor.userId,
      'tutor_approved',
      'Tutor Application Approved',
      'Congratulations! Your tutor application has been approved. You can now receive session requests.',
      { tutorId: tutor._id }
    );

    res.status(200).json({
      success: true,
      message: 'Tutor approved successfully',
      data: tutor
    });

  } catch (error) {
    console.error('Approve tutor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving tutor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Reject a tutor
// @route   PUT /api/admin/tutors/:id/reject
// @access  Private (Admin only)
export const rejectTutor = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a rejection reason'
      });
    }

    const tutor = await Tutor.findById(req.params.id);

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor not found'
      });
    }

    tutor.status = 'rejected';
    tutor.rejectionReason = reason;
    tutor.rejectedAt = new Date();
    tutor.rejectedBy = req.user.id;

    await tutor.save();

    // Revert user role to student
    await User.findByIdAndUpdate(tutor.userId, { role: 'student' });

    // --- NOTIFICATION: Notify tutor of rejection ---
    await createNotification(
      tutor.userId,
      'tutor_rejected',
      'Tutor Application Rejected',
      `Your tutor application was rejected. Reason: ${reason}`,
      { tutorId: tutor._id }
    );

    res.status(200).json({
      success: true,
      message: 'Tutor rejected successfully',
      data: tutor
    });

  } catch (error) {
    console.error('Reject tutor error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting tutor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// @desc    Get all tutors with admin filters
// @route   GET /api/admin/tutors
// @access  Private (Admin only)
export const getAllTutorsAdmin = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      subject, 
      search 
    } = req.query;

    const filter = {};
    
    if (status) filter.status = status;
    if (subject) filter['subjects.name'] = subject;
    
    if (search) {
      filter.$or = [
        { bio: { $regex: search, $options: 'i' } },
        { 'education.institution': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const tutors = await Tutor.find(filter)
      .populate('userId', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Tutor.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: tutors.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: tutors
    });

  } catch (error) {
    console.error('Get all tutors admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tutors',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

// ======================
// NEW REVENUE REPORTING FUNCTIONS
// ======================

// @desc    Get platform revenue summary
// @route   GET /api/admin/revenue/summary
// @access  Private (Admin)
export const getRevenueSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Overall totals from completed payments
    const totals = await Payment.aggregate([
      { $match: { status: 'completed', ...filter } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalCommission: { $sum: '$commissionAmount' },
          totalTutorEarnings: { $sum: '$tutorEarnings' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Pending payouts (earnings with status pending)
    const pendingPayouts = await Earnings.aggregate([
      { $match: { status: 'pending', ...filter } },
      {
        $group: {
          _id: null,
          total: { $sum: '$netEarnings' },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = {
      totalRevenue: totals[0]?.totalCommission || 0,
      totalPaidToTutors: totals[0]?.totalTutorEarnings || 0,
      totalTransactionAmount: totals[0]?.totalAmount || 0,
      transactionCount: totals[0]?.count || 0,
      pendingPayouts: pendingPayouts[0]?.total || 0,
      pendingCount: pendingPayouts[0]?.count || 0,
    };

    res.status(200).json({
      success: true,
      message: 'Revenue summary retrieved',
      data: summary,
    });
  } catch (error) {
    console.error('Revenue summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue summary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
    });
  }
};

// @desc    Get detailed payment list for admin
// @route   GET /api/admin/payments
// @access  Private (Admin)
export const getAllPaymentsAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
      tutorId,
      studentId,
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (studentId) filter.userId = studentId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    // Note: tutorId filter would require joining with session, not implemented here for simplicity

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const payments = await Payment.find(filter)
      .populate({
        path: 'sessionId',
        populate: [
          { path: 'tutorId', populate: { path: 'userId', select: 'fullName email' } },
          { path: 'studentId', select: 'fullName email' },
        ],
      })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Payment.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: payments.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      data: payments,
    });
  } catch (error) {
    console.error('Get all payments admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
    });
  }
};

// @desc    Get monthly revenue report (admin)
// @route   GET /api/admin/revenue/monthly
// @access  Private (Admin)
export const getMonthlyRevenue = async (req, res) => {
  try {
    const { year } = req.query;
    const matchYear = year ? parseInt(year) : new Date().getFullYear();

    const monthlyData = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: {
            $gte: new Date(`${matchYear}-01-01`),
            $lt: new Date(`${matchYear + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          totalAmount: { $sum: '$amount' },
          totalCommission: { $sum: '$commissionAmount' },
          totalTutorEarnings: { $sum: '$tutorEarnings' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const result = monthlyData.map((item) => ({
      month: months[item._id - 1],
      monthNumber: item._id,
      ...item,
    }));

    res.status(200).json({
      success: true,
      message: 'Monthly revenue retrieved',
      data: { year: matchYear, report: result },
    });
  } catch (error) {
    console.error('Monthly revenue error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly revenue',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
    });
  }
};