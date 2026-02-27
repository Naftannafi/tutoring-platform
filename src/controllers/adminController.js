import Tutor from '../models/Tutor.js';
import User from '../models/User.js';

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