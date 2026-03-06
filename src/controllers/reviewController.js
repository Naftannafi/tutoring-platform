import Review from '../models/Review.js';
import Session from '../models/Session.js';
import Tutor from '../models/Tutor.js';

const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// @desc    Create a review for a completed session
// @route   POST /api/reviews
// @access  Private (Student only)
export const createReview = async (req, res) => {
  try {
    const { sessionId, rating, comment } = req.body;

    // Validate required fields
    if (!sessionId || !rating) {
      return sendResponse(res, 400, false, 'Session ID and rating are required');
    }

    // Find the session
    const session = await Session.findById(sessionId)
      .populate('tutorId')
      .populate('studentId');

    if (!session) {
      return sendResponse(res, 404, false, 'Session not found');
    }

    // Check if the logged-in user is the student who attended this session
    if (session.studentId._id.toString() !== req.user._id.toString()) {
      return sendResponse(res, 403, false, 'Only the student who attended the session can review');
    }

    // Ensure session is completed
    if (session.status !== 'completed') {
      return sendResponse(res, 400, false, 'Only completed sessions can be reviewed');
    }

    // Check if review already exists for this session
    const existingReview = await Review.findOne({ sessionId });
    if (existingReview) {
      return sendResponse(res, 400, false, 'A review for this session already exists');
    }

    // Create review
    const review = await Review.create({
      sessionId,
      tutorId: session.tutorId._id,
      studentId: req.user._id,
      rating,
      comment
    });

    // Update tutor's average rating
    const tutor = await Tutor.findById(session.tutorId._id);
    const newTotalReviews = tutor.rating.totalReviews + 1;
    const newAverage = (tutor.rating.average * tutor.rating.totalReviews + rating) / newTotalReviews;
    
    tutor.rating.average = newAverage;
    tutor.rating.totalReviews = newTotalReviews;
    await tutor.save();

    // Optionally update session with review flag (optional)
    // session.reviewed = true;
    // await session.save();

    sendResponse(res, 201, true, 'Review submitted successfully', { review });
  } catch (error) {
    console.error('Create review error:', error);
    if (error.code === 11000) {
      return sendResponse(res, 400, false, 'A review for this session already exists');
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendResponse(res, 400, false, 'Validation failed', { errors });
    }
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Get all reviews for a tutor (public)
// @route   GET /api/reviews/tutor/:tutorId
// @access  Public
export const getTutorReviews = async (req, res) => {
  try {
    const { tutorId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const reviews = await Review.find({ tutorId })
      .populate('studentId', 'fullName')
      .populate('sessionId', 'subject gradeLevel date')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Review.countDocuments({ tutorId });

    sendResponse(res, 200, true, 'Reviews retrieved', {
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get tutor reviews error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Get a review by session ID (for checking if already reviewed)
// @route   GET /api/reviews/session/:sessionId
// @access  Private (student or tutor)
export const getReviewBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const review = await Review.findOne({ sessionId })
      .populate('studentId', 'fullName')
      .populate('tutorId', 'userId');

    if (!review) {
      return sendResponse(res, 404, false, 'No review found for this session');
    }

    // Check authorization: only student, tutor, or admin can view
    const session = await Session.findById(sessionId);
    if (!session) {
      return sendResponse(res, 404, false, 'Session not found');
    }

    const isStudent = session.studentId.toString() === req.user._id.toString();
    const isTutor = session.tutorId.userId._id.toString() === req.user._id.toString();
    if (!isStudent && !isTutor && req.user.role !== 'admin') {
      return sendResponse(res, 403, false, 'Not authorized');
    }

    sendResponse(res, 200, true, 'Review retrieved', { review });
  } catch (error) {
    console.error('Get review by session error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};