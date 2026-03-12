import User from '../models/User.js';
import Tutor from '../models/Tutor.js';
import Session from '../models/Session.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import Notification from '../models/Notification.js';

const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// @desc    Get overall platform statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
export const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // User counts
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTutors = await User.countDocuments({ role: 'tutor' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const verifiedUsers = await User.countDocuments({ isVerified: true });

    // Tutor specific
    const approvedTutors = await Tutor.countDocuments({ status: 'approved' });
    const pendingTutors = await Tutor.countDocuments({ status: 'pending' });
    const rejectedTutors = await Tutor.countDocuments({ status: 'rejected' });

    // Session stats
    const totalSessions = await Session.countDocuments(dateFilter);
    const sessionsByStatus = await Session.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Payment stats (completed only)
    const paymentFilter = { ...dateFilter, status: 'completed' };
    const totalRevenue = await Payment.aggregate([
      { $match: paymentFilter },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
    ]);
    const totalPaidToTutors = await Payment.aggregate([
      { $match: paymentFilter },
      { $group: { _id: null, total: { $sum: '$tutorEarnings' } } }
    ]);
    const paymentCount = await Payment.countDocuments(paymentFilter);

    // Review stats
    const totalReviews = await Review.countDocuments();
    const averageRating = await Review.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);

    // Recent signups (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const newUsersLastWeek = await User.countDocuments({ createdAt: { $gte: lastWeek } });

    const stats = {
      users: {
        total: totalUsers,
        students: totalStudents,
        tutors: totalTutors,
        admins: totalAdmins,
        verified: verifiedUsers,
        newLastWeek: newUsersLastWeek
      },
      tutors: {
        approved: approvedTutors,
        pending: pendingTutors,
        rejected: rejectedTutors
      },
      sessions: {
        total: totalSessions,
        byStatus: sessionsByStatus.reduce((acc, cur) => ({ ...acc, [cur._id]: cur.count }), {})
      },
      payments: {
        totalCompleted: paymentCount,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalPaidToTutors: totalPaidToTutors[0]?.total || 0
      },
      reviews: {
        total: totalReviews,
        averageRating: averageRating[0]?.avg || 0
      }
    };

    sendResponse(res, 200, true, 'Dashboard stats retrieved', stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Get recent platform activities (latest signups, sessions, payments)
// @route   GET /api/admin/dashboard/recent-activities
// @access  Private (Admin)
export const getRecentActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Recent user registrations
    const recentUsers = await User.find()
      .select('fullName email role createdAt')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Recent sessions
    const recentSessions = await Session.find()
      .populate('studentId', 'fullName')
      .populate({
        path: 'tutorId',
        populate: { path: 'userId', select: 'fullName' }
      })
      .sort({ createdAt: -1 })
      .limit(limit);

    // Recent payments
    const recentPayments = await Payment.find()
      .populate('userId', 'fullName')
      .populate('sessionId', 'subject')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Format activities as unified feed
    const activities = [
      ...recentUsers.map(u => ({
        type: 'user_registered',
        user: u.fullName,
        email: u.email,
        role: u.role,
        timestamp: u.createdAt
      })),
      ...recentSessions.map(s => ({
        type: 'session_created',
        student: s.studentId?.fullName || 'Unknown',
        tutor: s.tutorId?.userId?.fullName || 'Unknown',
        subject: s.subject,
        status: s.status,
        timestamp: s.createdAt
      })),
      ...recentPayments.map(p => ({
        type: 'payment_received',
        user: p.userId?.fullName || 'Unknown',
        amount: p.amount,
        status: p.status,
        timestamp: p.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

    sendResponse(res, 200, true, 'Recent activities retrieved', activities);
  } catch (error) {
    console.error('Recent activities error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Get weekly/monthly trends for charts
// @route   GET /api/admin/dashboard/trends
// @access  Private (Admin)
export const getTrends = async (req, res) => {
  try {
    const { period = 'month', year = new Date().getFullYear() } = req.query;

    let groupBy;
    let startDate, endDate;

    if (period === 'week') {
      // Last 7 days
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date();
      groupBy = { $dayOfWeek: '$createdAt' }; // 1 (Sunday) to 7 (Saturday)
    } else {
      // Month by default
      startDate = new Date(`${year}-01-01`);
      endDate = new Date(`${year}-12-31`);
      groupBy = { $month: '$createdAt' };
    }

    const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

    // User registrations trend
    const userTrend = await User.aggregate([
      { $match: dateFilter },
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Sessions trend
    const sessionTrend = await Session.aggregate([
      { $match: dateFilter },
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Payments trend (completed only)
    const paymentTrend = await Payment.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      { $group: { _id: groupBy, total: { $sum: '$amount' }, commission: { $sum: '$commissionAmount' } } },
      { $sort: { _id: 1 } }
    ]);

    sendResponse(res, 200, true, 'Trends retrieved', {
      period,
      year: period === 'month' ? year : undefined,
      users: userTrend,
      sessions: sessionTrend,
      payments: paymentTrend
    });
  } catch (error) {
    console.error('Trends error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};