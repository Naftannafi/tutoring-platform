import User from '../models/User.js';
import Tutor from '../models/Tutor.js';
import Session from '../models/Session.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import Earnings from '../models/Earnings.js';

const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Helper to get date ranges
const getDateRange = (period, startDate, endDate) => {
  let start, end;
  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  } else {
    end = new Date();
    switch (period) {
      case 'week':
        start = new Date();
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start = new Date();
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start = new Date();
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start = new Date();
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start = new Date(0); // beginning of time
    }
  }
  return { start, end };
};

// @desc    User analytics (registrations, retention, conversion)
// @route   GET /api/admin/analytics/users
// @access  Private (Admin)
export const getUserAnalytics = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate, groupBy = 'day' } = req.query;
    const { start, end } = getDateRange(period, startDate, endDate);

    // Registrations over time
    let groupId;
    if (groupBy === 'day') groupId = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    else if (groupBy === 'week') groupId = { $week: '$createdAt' };
    else if (groupBy === 'month') groupId = { $month: '$createdAt' };
    else if (groupBy === 'year') groupId = { $year: '$createdAt' };

    const registrations = await User.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: groupId, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Total users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Verified vs unverified
    const verifiedStatus = await User.aggregate([
      { $group: { _id: '$isVerified', count: { $sum: 1 } } }
    ]);

    // Conversion rate: students who became tutors
    const studentCount = await User.countDocuments({ role: 'student' });
    const tutorCount = await User.countDocuments({ role: 'tutor' });
    const conversionRate = studentCount ? (tutorCount / studentCount) * 100 : 0;

    // Daily/Monthly active users (sessions in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = await Session.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$studentId' } },
      { $count: 'count' }
    ]);

    sendResponse(res, 200, true, 'User analytics retrieved', {
      registrations,
      usersByRole,
      verifiedStatus,
      conversionRate: conversionRate.toFixed(2),
      activeUsersLast30Days: activeUsers[0]?.count || 0
    });
  } catch (error) {
    console.error('User analytics error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Session analytics (trends, popular subjects, completion rates)
// @route   GET /api/admin/analytics/sessions
// @access  Private (Admin)
export const getSessionAnalytics = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate, groupBy = 'day' } = req.query;
    const { start, end } = getDateRange(period, startDate, endDate);

    // Sessions over time
    let groupId;
    if (groupBy === 'day') groupId = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    else if (groupBy === 'week') groupId = { $week: '$date' };
    else if (groupBy === 'month') groupId = { $month: '$date' };
    else if (groupBy === 'year') groupId = { $year: '$date' };

    const sessionsOverTime = await Session.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: groupId, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Sessions by status
    const sessionsByStatus = await Session.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Popular subjects
    const popularSubjects = await Session.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: '$subject', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Completion rate
    const totalSessions = sessionsByStatus.reduce((acc, cur) => acc + cur.count, 0);
    const completedSessions = sessionsByStatus.find(s => s._id === 'completed')?.count || 0;
    const completionRate = totalSessions ? (completedSessions / totalSessions) * 100 : 0;

    // Average session duration
    const avgDuration = await Session.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: null, avg: { $avg: '$duration' } } }
    ]);

    sendResponse(res, 200, true, 'Session analytics retrieved', {
      sessionsOverTime,
      sessionsByStatus,
      popularSubjects,
      completionRate: completionRate.toFixed(2),
      averageDurationHours: avgDuration[0]?.avg || 0
    });
  } catch (error) {
    console.error('Session analytics error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Revenue analytics (earnings, commissions, projections)
// @route   GET /api/admin/analytics/revenue
// @access  Private (Admin)
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate, groupBy = 'month' } = req.query;
    const { start, end } = getDateRange(period, startDate, endDate);

    // Revenue over time (commission)
    let groupId;
    if (groupBy === 'day') groupId = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    else if (groupBy === 'week') groupId = { $week: '$createdAt' };
    else if (groupBy === 'month') groupId = { $month: '$createdAt' };
    else if (groupBy === 'year') groupId = { $year: '$createdAt' };

    const revenueOverTime = await Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: groupId, commission: { $sum: '$commissionAmount' }, total: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);

    // Total revenue in period
    const totals = await Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, commission: { $sum: '$commissionAmount' }, total: { $sum: '$amount' } } }
    ]);

    // Average revenue per session
    const sessionCount = await Session.countDocuments({ date: { $gte: start, $lte: end } });
    const avgRevenuePerSession = sessionCount ? (totals[0]?.commission || 0) / sessionCount : 0;

    // Projected revenue (simple linear projection based on last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentRevenue = await Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: threeMonthsAgo } } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
    ]);
    const monthlyAvg = (recentRevenue[0]?.total || 0) / 3;
    const projectedNextMonth = monthlyAvg;

    sendResponse(res, 200, true, 'Revenue analytics retrieved', {
      revenueOverTime,
      periodTotals: {
        commission: totals[0]?.commission || 0,
        total: totals[0]?.total || 0
      },
      avgRevenuePerSession: avgRevenuePerSession.toFixed(2),
      projectedNextMonth: projectedNextMonth.toFixed(2)
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Tutor performance analytics (top tutors, earnings, ratings)
// @route   GET /api/admin/analytics/tutors
// @access  Private (Admin)
export const getTutorAnalytics = async (req, res) => {
  try {
    const { limit = 10, sortBy = 'sessions', period = 'month' } = req.query;
    const { start, end } = getDateRange(period);

    // Top tutors by number of sessions
    let topTutors;
    if (sortBy === 'sessions') {
      topTutors = await Session.aggregate([
        { $match: { date: { $gte: start, $lte: end }, status: 'completed' } },
        { $group: { _id: '$tutorId', sessionCount: { $sum: 1 } } },
        { $sort: { sessionCount: -1 } },
        { $limit: Number(limit) },
        { $lookup: { from: 'tutors', localField: '_id', foreignField: '_id', as: 'tutor' } },
        { $unwind: '$tutor' },
        { $lookup: { from: 'users', localField: 'tutor.userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { 'user.fullName': 1, 'user.email': 1, sessionCount: 1 } }
      ]);
    } else if (sortBy === 'earnings') {
      topTutors = await Earnings.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: 'paid' } },
        { $group: { _id: '$tutorId', totalEarnings: { $sum: '$netEarnings' } } },
        { $sort: { totalEarnings: -1 } },
        { $limit: Number(limit) },
        { $lookup: { from: 'tutors', localField: '_id', foreignField: '_id', as: 'tutor' } },
        { $unwind: '$tutor' },
        { $lookup: { from: 'users', localField: 'tutor.userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { 'user.fullName': 1, 'user.email': 1, totalEarnings: 1 } }
      ]);
    } else if (sortBy === 'rating') {
      topTutors = await Tutor.find({ 'rating.average': { $gt: 0 } })
        .sort({ 'rating.average': -1, 'rating.totalReviews': -1 })
        .limit(Number(limit))
        .populate('userId', 'fullName email');
    }

    sendResponse(res, 200, true, 'Tutor analytics retrieved', { topTutors });
  } catch (error) {
    console.error('Tutor analytics error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Platform health metrics (active users, session completion, etc.)
// @route   GET /api/admin/analytics/health
// @access  Private (Admin)
export const getPlatformHealth = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Daily active users (who logged in or had a session today)
    const dailyActiveUsers = await Session.distinct('studentId', { date: { $gte: startOfToday } });
    const dailyActiveCount = dailyActiveUsers.length;

    // Weekly active users
    const weeklyActiveUsers = await Session.distinct('studentId', { date: { $gte: startOfWeek } });
    const weeklyActiveCount = weeklyActiveUsers.length;

    // Monthly active users
    const monthlyActiveUsers = await Session.distinct('studentId', { date: { $gte: startOfMonth } });
    const monthlyActiveCount = monthlyActiveUsers.length;

    // Session completion rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sessionsLast30 = await Session.find({ date: { $gte: thirtyDaysAgo } });
    const totalLast30 = sessionsLast30.length;
    const completedLast30 = sessionsLast30.filter(s => s.status === 'completed').length;
    const completionRate30 = totalLast30 ? (completedLast30 / totalLast30) * 100 : 0;

    // Average response time (time between booking and confirmation) – optional, requires more data
    // For simplicity, we can skip or compute later.

    sendResponse(res, 200, true, 'Platform health metrics', {
      dailyActiveUsers: dailyActiveCount,
      weeklyActiveUsers: weeklyActiveCount,
      monthlyActiveUsers: monthlyActiveCount,
      sessionCompletionRate30Days: completionRate30.toFixed(2)
    });
  } catch (error) {
    console.error('Platform health error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};