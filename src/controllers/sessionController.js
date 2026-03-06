import Session from '../models/Session.js';
import Tutor from '../models/Tutor.js';
import User from '../models/User.js';

const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// @desc    Book a session
// @route   POST /api/sessions/book
// @access  Private (Student only)
export const bookSession = async (req, res) => {
  try {
    const { 
      tutorId, 
      subject, 
      gradeLevel, 
      date, 
      startTime, 
      endTime, 
      paymentMethod,
      location,
      notes 
    } = req.body;
    
    const studentId = req.user._id;

    // Validate required fields
    if (!tutorId || !subject || !gradeLevel || !date || !startTime || !endTime || !paymentMethod || !location) {
      return sendResponse(res, 400, false, 'Missing required fields');
    }

    // Find tutor and verify they are approved
    const tutor = await Tutor.findById(tutorId).populate('userId');
    if (!tutor || tutor.status !== 'approved') {
      return sendResponse(res, 404, false, 'Tutor not found or not approved');
    }

    // Check if the subject is offered by tutor
    const subjectData = tutor.subjects.find(s => s.name === subject && s.gradeLevels.includes(gradeLevel));
    if (!subjectData) {
      return sendResponse(res, 400, false, 'Tutor does not offer this subject for the selected grade level');
    }

    // Calculate duration and total amount
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    const duration = (end - start) / (1000 * 60 * 60); // hours
    if (duration <= 0) {
      return sendResponse(res, 400, false, 'End time must be after start time');
    }

    const hourlyRate = subjectData.hourlyRate;
    const totalAmount = duration * hourlyRate;

    // Check tutor availability for that day and time slot
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const availability = tutor.availability.find(a => a.day === dayOfWeek);
    if (!availability) {
      return sendResponse(res, 400, false, 'Tutor not available on this day');
    }

    const slot = availability.slots.find(s => s.startTime === startTime && s.endTime === endTime);
    if (!slot) {
      return sendResponse(res, 400, false, 'Time slot not available');
    }

    // Check if slot is already booked
    if (slot.isBooked) {
      return sendResponse(res, 400, false, 'This time slot is already booked');
    }

    // Check for overlapping sessions
    const existingSession = await Session.findOne({
      tutorId,
      date: new Date(date),
      startTime,
      endTime,
      status: { $in: ['pending', 'confirmed'] }
    });
    if (existingSession) {
      return sendResponse(res, 400, false, 'This time slot is already taken');
    }

    // Create session
    const session = await Session.create({
      tutorId,
      studentId,
      subject,
      gradeLevel,
      date,
      startTime,
      endTime,
      duration,
      hourlyRate,
      totalAmount,
      paymentMethod,
      location,
      notes,
      status: 'pending',
      paymentStatus: 'pending'
    });

    // Mark slot as booked
    slot.isBooked = true;
    await tutor.save();

    // Populate user details for response
    await session.populate([
      { path: 'tutorId', populate: { path: 'userId', select: 'fullName email' } },
      { path: 'studentId', select: 'fullName email' }
    ]);

    sendResponse(res, 201, true, 'Session booked successfully. Awaiting tutor confirmation.', { session });

  } catch (error) {
    console.error('Book session error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendResponse(res, 400, false, 'Validation failed', { errors });
    }
    sendResponse(res, 500, false, 'Server error booking session');
  }
};

// @desc    Get sessions for logged-in user (student or tutor)
// @route   GET /api/sessions/my-sessions
// @access  Private
export const getMySessions = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const userRole = req.user.role;
    const userId = req.user._id;

    let filter = {};

    if (userRole === 'student') {
      filter.studentId = userId;
    } else if (userRole === 'tutor') {
      const tutor = await Tutor.findOne({ userId });
      if (!tutor) {
        return sendResponse(res, 404, false, 'Tutor profile not found');
      }
      filter.tutorId = tutor._id;
    } else {
      return sendResponse(res, 403, false, 'Access denied');
    }

    if (status) {
      filter.status = status;
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const sessions = await Session.find(filter)
      .populate('tutorId', 'userId')
      .populate('studentId', 'fullName email')
      .populate({
        path: 'tutorId',
        populate: { path: 'userId', select: 'fullName email' }
      })
      .skip(skip)
      .limit(limitNum)
      .sort({ date: -1, startTime: -1 });

    const total = await Session.countDocuments(filter);

    sendResponse(res, 200, true, 'Sessions retrieved successfully', {
      sessions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get my sessions error:', error);
    sendResponse(res, 500, false, 'Server error retrieving sessions');
  }
};

// ======================
// NEW: Get a single session by ID
// ======================
// @desc    Get a single session by ID
// @route   GET /api/sessions/:id
// @access  Private (student or tutor who owns the session)
export const getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('studentId', 'fullName email')
      .populate({
        path: 'tutorId',
        populate: { path: 'userId', select: 'fullName email' }
      });

    if (!session) {
      return sendResponse(res, 404, false, 'Session not found');
    }

    // Check if the logged-in user is either the student or the tutor
    const userId = req.user._id.toString();
    const isStudent = session.studentId._id.toString() === userId;
    const isTutor = session.tutorId.userId._id.toString() === userId;

    if (!isStudent && !isTutor && req.user.role !== 'admin') {
      return sendResponse(res, 403, false, 'Not authorized to view this session');
    }

    sendResponse(res, 200, true, 'Session retrieved', { session });
  } catch (error) {
    console.error('Get session by ID error:', error);
    if (error.name === 'CastError') {
      return sendResponse(res, 400, false, 'Invalid session ID');
    }
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Confirm a session (tutor only)
// @route   PUT /api/sessions/:id/confirm
// @access  Private (Tutor only)
export const confirmSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return sendResponse(res, 404, false, 'Session not found');
    }

    // Check if the logged-in user is the tutor for this session
    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor || session.tutorId.toString() !== tutor._id.toString()) {
      return sendResponse(res, 403, false, 'Not authorized to confirm this session');
    }

    if (session.status !== 'pending') {
      return sendResponse(res, 400, false, 'Session cannot be confirmed');
    }

    session.status = 'confirmed';
    await session.save();

    sendResponse(res, 200, true, 'Session confirmed', { session });

  } catch (error) {
    console.error('Confirm session error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Cancel a session (student or tutor)
// @route   PUT /api/sessions/:id/cancel
// @access  Private
export const cancelSession = async (req, res) => {
  try {
    const { reason } = req.body;
    const session = await Session.findById(req.params.id);

    if (!session) {
      return sendResponse(res, 404, false, 'Session not found');
    }

    // Check if user is either the student or the tutor
    const tutor = await Tutor.findOne({ userId: req.user._id });
    const isStudent = session.studentId.toString() === req.user._id.toString();
    const isTutor = tutor && session.tutorId.toString() === tutor._id.toString();

    if (!isStudent && !isTutor) {
      return sendResponse(res, 403, false, 'Not authorized to cancel this session');
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
      return sendResponse(res, 400, false, 'Session already completed or cancelled');
    }

    session.status = 'cancelled';
    session.cancellationReason = reason || 'No reason provided';
    session.cancelledBy = req.user._id;
    await session.save();

    // Free the slot
    const tutorDoc = await Tutor.findById(session.tutorId);
    const dayOfWeek = new Date(session.date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const availability = tutorDoc.availability.find(a => a.day === dayOfWeek);
    if (availability) {
      const slot = availability.slots.find(s => s.startTime === session.startTime && s.endTime === session.endTime);
      if (slot) {
        slot.isBooked = false;
        await tutorDoc.save();
      }
    }

    sendResponse(res, 200, true, 'Session cancelled', { session });

  } catch (error) {
    console.error('Cancel session error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Complete a session (tutor only)
// @route   PUT /api/sessions/:id/complete
// @access  Private (Tutor only)
export const completeSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return sendResponse(res, 404, false, 'Session not found');
    }

    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor || session.tutorId.toString() !== tutor._id.toString()) {
      return sendResponse(res, 403, false, 'Not authorized');
    }

    if (session.status !== 'confirmed') {
      return sendResponse(res, 400, false, 'Only confirmed sessions can be completed');
    }

    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    // Update tutor stats
    tutor.totalSessions += 1;
    tutor.totalHours += session.duration;
    await tutor.save();

    sendResponse(res, 200, true, 'Session completed', { session });

  } catch (error) {
    console.error('Complete session error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};