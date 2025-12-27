// src/controllers/userController.js
import User from '../models/User.js';

// @desc    Check profile completion status
// @route   GET /api/users/profile/check
// @access  Private
const checkProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: {
        fullName: user.fullName,
        phone: user.phone,
        location: user.location,
        profileComplete: !!(user.fullName && user.phone && user.location?.kebele && user.location?.woreda),
        missingFields: {
          fullName: !user.fullName,
          phone: !user.phone,
          kebele: !user.location?.kebele,
          woreda: !user.location?.woreda
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, location } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        fullName, 
        phone, 
        location,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export { checkProfile, getProfile, updateProfile };