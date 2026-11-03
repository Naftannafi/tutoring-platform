import Earnings from '../models/Earnings.js';
import Tutor from '../models/Tutor.js';
import Session from '../models/Session.js';

// Helper response function (if not already imported)
const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// @desc    Get logged-in tutor's earnings summary
// @route   GET /api/earnings/my-earnings
// @access  Private (Tutor only)
export const getMyEarnings = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor) {
      return sendResponse(res, 404, false, 'Tutor profile not found');
    }

    const earnings = await Earnings.find({ tutorId: tutor._id })
      .populate('sessionId', 'subject gradeLevel date')
      .sort({ createdAt: -1 });

    // Calculate totals
    const totalEarned = earnings.reduce((sum, e) => sum + e.netEarnings, 0);
    const totalCommission = earnings.reduce((sum, e) => sum + e.commissionAmount, 0);
    const pending = earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.netEarnings, 0);
    const paid = earnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.netEarnings, 0);

    sendResponse(res, 200, true, 'Earnings retrieved', {
      summary: {
        totalEarned,
        totalCommission,
        pending,
        paid,
        count: earnings.length
      },
      earnings
    });
  } catch (error) {
    console.error('Get my earnings error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Get detailed earnings report for logged-in tutor
// @route   GET /api/earnings/report
// @access  Private (Tutor only)
export const getTutorEarningsReport = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor) {
      return sendResponse(res, 404, false, 'Tutor profile not found');
    }

    const { startDate, endDate, status, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = { tutorId: tutor._id };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Fetch earnings with session details
    const earnings = await Earnings.find(filter)
      .populate({
        path: 'sessionId',
        select: 'subject gradeLevel date startTime endTime',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Earnings.countDocuments(filter);

    // Calculate totals
    const totals = await Earnings.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$netEarnings' },
          totalCommission: { $sum: '$commissionAmount' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = totals[0] || {
      totalEarned: 0,
      totalCommission: 0,
      totalAmount: 0,
      count: 0,
    };

    sendResponse(res, 200, true, 'Earnings report retrieved', {
      summary,
      earnings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get tutor earnings report error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Get monthly earnings summary for tutor
// @route   GET /api/earnings/monthly
// @access  Private (Tutor only)
export const getMonthlyEarnings = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor) {
      return sendResponse(res, 404, false, 'Tutor profile not found');
    }

    const { year } = req.query;
    const matchYear = year ? parseInt(year) : new Date().getFullYear();

    const monthlyData = await Earnings.aggregate([
      {
        $match: {
          tutorId: tutor._id,
          createdAt: {
            $gte: new Date(`${matchYear}-01-01`),
            $lt: new Date(`${matchYear + 1}-01-01`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          totalEarned: { $sum: '$netEarnings' },
          totalCommission: { $sum: '$commissionAmount' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format as month names
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const result = monthlyData.map((item) => ({
      month: months[item._id - 1],
      monthNumber: item._id,
      ...item,
    }));

    sendResponse(res, 200, true, 'Monthly earnings retrieved', { year: matchYear, data: result });
  } catch (error) {
    console.error('Get monthly earnings error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};
import { Parser } from 'json2csv';

// @desc    Export earnings as CSV
// @route   GET /api/earnings/export
// @access  Private (Tutor only)
export const exportEarningsCSV = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor) {
      return sendResponse(res, 404, false, 'Tutor profile not found');
    }

    const { startDate, endDate } = req.query;
    const filter = { tutorId: tutor._id };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const earnings = await Earnings.find(filter)
      .populate('sessionId', 'subject gradeLevel date startTime endTime')
      .sort({ createdAt: -1 });

    const fields = [
      'sessionId.subject',
      'sessionId.gradeLevel',
      'sessionId.date',
      'sessionId.startTime',
      'sessionId.endTime',
      'amount',
      'commissionRate',
      'commissionAmount',
      'netEarnings',
      'status',
      'createdAt',
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(earnings);

    res.header('Content-Type', 'text/csv');
    res.attachment(`earnings-${new Date().toISOString().slice(0,10)}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).send('Server error');
  }
};