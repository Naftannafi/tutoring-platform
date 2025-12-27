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

// Export all functions
export {
  registerTutor,
  getMyTutorProfile,
  updateTutorProfile,
  getAllTutors,
  getTutorById
};