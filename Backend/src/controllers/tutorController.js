import Tutor from '../models/Tutor.js';
import User from '../models/User.js';

// Helper response function
const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// ======================
// EXISTING FUNCTIONS
// ======================

// @desc    Register as a tutor
// @route   POST /api/tutors/register
// @access  Private (Must be logged in)
const registerTutor = async (req, res) => {
  try {
    const user = req.user;

    // Check if user already has a tutor profile
    const existingTutor = await Tutor.findOne({ userId: user._id });
    if (existingTutor) {
      return sendResponse(res, 400, false, 'You already have a tutor profile.');
    }

    // Check if user is verified
    if (!user.isVerified) {
      return sendResponse(res, 400, false, 'Please verify your email before registering as a tutor.');
    }

    // Prepare tutor data
    const tutorData = {
      userId: user._id,
      bio: req.body.bio || '',
      subjects: req.body.subjects || [],
      education: req.body.education || [],
      experience: req.body.experience || { totalYears: 0, description: '' },
      certifications: req.body.certifications || [],
      availability: req.body.availability || [],
      status: 'pending' // All new tutors need admin approval
    };

    // Validate subjects
    if (!tutorData.subjects || tutorData.subjects.length === 0) {
      return sendResponse(res, 400, false, 'At least one subject is required.');
    }

    // Create tutor profile
    const tutor = await Tutor.create(tutorData);

    // Update user role to tutor
    user.role = 'tutor';
    await user.save();

    sendResponse(res, 201, true, 'Tutor profile submitted successfully! Awaiting admin approval.', {
      tutor: {
        id: tutor._id,
        status: tutor.status,
        subjects: tutor.subjects,
        createdAt: tutor.createdAt
      }
    });

  } catch (error) {
    console.error('Tutor registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendResponse(res, 400, false, 'Validation failed', { errors });
    }

    sendResponse(res, 500, false, 'Server error during tutor registration.');
  }
};

// @desc    Get current user's tutor profile
// @route   GET /api/tutors/profile/me
// @access  Private (Tutor only)
const getMyTutorProfile = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ userId: req.user._id })
      .populate('userId', 'fullName email phone profileImage');

    if (!tutor) {
      return sendResponse(res, 404, false, 'Tutor profile not found. Please register as a tutor first.');
    }

    sendResponse(res, 200, true, 'Tutor profile retrieved successfully.', {
      tutor
    });

  } catch (error) {
    console.error('Get tutor profile error:', error);
    sendResponse(res, 500, false, 'Server error retrieving tutor profile.');
  }
};

// @desc    Update tutor profile
// @route   PUT /api/tutors/profile/me
// @access  Private (Tutor only)
const updateTutorProfile = async (req, res) => {
  try {
    // Find tutor profile
    const tutor = await Tutor.findOne({ userId: req.user._id });
    
    if (!tutor) {
      return sendResponse(res, 404, false, 'Tutor profile not found.');
    }

    // Update only allowed fields
    const allowedUpdates = ['bio', 'subjects', 'education', 'experience', 'certifications', 'availability'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Apply updates
    Object.assign(tutor, updates);
    await tutor.save();

    sendResponse(res, 200, true, 'Tutor profile updated successfully.', {
      tutor
    });

  } catch (error) {
    console.error('Update tutor profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendResponse(res, 400, false, 'Validation failed', { errors });
    }

    sendResponse(res, 500, false, 'Server error updating tutor profile.');
  }
};

// @desc    Get all approved tutors (public)
// @route   GET /api/tutors
// @access  Public
const getAllTutors = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      subject, 
      gradeLevel, 
      minRate, 
      maxRate,
      sortBy = 'rating.average',
      sortOrder = 'desc'
    } = req.query;

    // Build filter - only show approved tutors
    const filter = { status: 'approved' };
    
    if (subject) {
      filter['subjects.name'] = subject;
    }
    
    if (gradeLevel) {
      filter['subjects.gradeLevels'] = gradeLevel;
    }
    
    if (minRate || maxRate) {
      filter['subjects.hourlyRate'] = {};
      if (minRate) filter['subjects.hourlyRate'].$gte = Number(minRate);
      if (maxRate) filter['subjects.hourlyRate'].$lte = Number(maxRate);
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tutors = await Tutor.find(filter)
      .populate('userId', 'fullName profileImage')
      .skip(skip)
      .limit(Number(limit))
      .sort(sort);

    const total = await Tutor.countDocuments(filter);

    sendResponse(res, 200, true, 'Tutors retrieved successfully.', {
      tutors,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all tutors error:', error);
    sendResponse(res, 500, false, 'Server error retrieving tutors.');
  }
};

// @desc    Get tutor by ID (public)
// @route   GET /api/tutors/:id
// @access  Public
const getTutorById = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id)
      .populate('userId', 'fullName email phone profileImage location');

    if (!tutor) {
      return sendResponse(res, 404, false, 'Tutor not found.');
    }

    // Only show approved tutors to public
    if (tutor.status !== 'approved' && (!req.user || req.user.role !== 'admin')) {
      return sendResponse(res, 403, false, 'This tutor profile is not available.');
    }

    sendResponse(res, 200, true, 'Tutor retrieved successfully.', {
      tutor
    });

  } catch (error) {
    console.error('Get tutor by ID error:', error);
    
    if (error.name === 'CastError') {
      return sendResponse(res, 400, false, 'Invalid tutor ID.');
    }

    sendResponse(res, 500, false, 'Server error retrieving tutor.');
  }
};

// ======================
// NEW AVAILABILITY FUNCTIONS (Day 13)
// ======================

// @desc    Block a specific date (make it unavailable)
// @route   POST /api/tutors/availability/block
// @access  Private (Tutor only)
const blockDate = async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date) {
      return sendResponse(res, 400, false, 'Date is required');
    }

    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor) {
      return sendResponse(res, 404, false, 'Tutor profile not found');
    }

    // ✅ Ensure blockedDates exists as an array
    if (!tutor.blockedDates) {
      tutor.blockedDates = [];
    }

    // Check if date already blocked
    const alreadyBlocked = tutor.blockedDates.some(
      b => new Date(b.date).toDateString() === new Date(date).toDateString()
    );
    if (alreadyBlocked) {
      return sendResponse(res, 400, false, 'This date is already blocked');
    }

    tutor.blockedDates.push({ date, reason });
    await tutor.save();

    sendResponse(res, 200, true, 'Date blocked successfully', {
      blockedDates: tutor.blockedDates
    });
  } catch (error) {
    console.error('Block date error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Unblock a previously blocked date
// @route   DELETE /api/tutors/availability/block/:date
// @access  Private (Tutor only)
const unblockDate = async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) {
      return sendResponse(res, 400, false, 'Date is required');
    }

    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor) {
      return sendResponse(res, 404, false, 'Tutor profile not found');
    }

    // Remove the blocked date entry that matches the given date
    tutor.blockedDates = (tutor.blockedDates || []).filter(
      b => new Date(b.date).toDateString() !== new Date(date).toDateString()
    );
    await tutor.save();

    sendResponse(res, 200, true, 'Date unblocked successfully', {
      blockedDates: tutor.blockedDates
    });
  } catch (error) {
    console.error('Unblock date error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Get tutor's schedule with available slots and blocked dates for a date range
// @route   GET /api/tutors/availability/schedule (private - own schedule)
// @route   GET /api/tutors/:tutorId/schedule (public)
// @access  Private (Tutor) or Public (with tutorId)
const getSchedule = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let tutor;

    // If tutorId is provided in URL (public), use that, otherwise use logged-in user
    if (req.params.tutorId) {
      tutor = await Tutor.findById(req.params.tutorId);
      if (!tutor) {
        return sendResponse(res, 404, false, 'Tutor not found');
      }
    } else {
      tutor = await Tutor.findOne({ userId: req.user._id });
      if (!tutor) {
        return sendResponse(res, 404, false, 'Tutor profile not found');
      }
    }

    if (!startDate || !endDate) {
      return sendResponse(res, 400, false, 'startDate and endDate are required (YYYY-MM-DD)');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const schedule = [];

    // Generate all dates in the range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

      // Check if this date is blocked
      const isBlocked = (tutor.blockedDates || []).some(
        b => new Date(b.date).toDateString() === d.toDateString()
      );

      // Find availability for this day of week
      const dayAvailability = tutor.availability.find(a => a.day === dayOfWeek);

      const daySchedule = {
        date: dateStr,
        day: dayOfWeek,
        isBlocked,
        slots: dayAvailability ? dayAvailability.slots.filter(slot => !slot.isBooked) : []
      };

      schedule.push(daySchedule);
    }

    sendResponse(res, 200, true, 'Schedule retrieved', { schedule });
  } catch (error) {
    console.error('Get schedule error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// ======================
// EXPORT ALL FUNCTIONS
// ======================
export {
  registerTutor,
  getMyTutorProfile,
  updateTutorProfile,
  getAllTutors,
  getTutorById,
  blockDate,
  unblockDate,
  getSchedule
};