import User from '../models/User.js';

const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// @desc    Get current user's notification preferences
// @route   GET /api/users/preferences
// @access  Private
export const getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    sendResponse(res, 200, true, 'Preferences retrieved', user.notificationPreferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Update notification preferences
// @route   PUT /api/users/preferences
// @access  Private
export const updatePreferences = async (req, res) => {
  try {
    const { email, sms, push } = req.body;
    const preferences = {};
    if (typeof email === 'boolean') preferences['notificationPreferences.email'] = email;
    if (typeof sms === 'boolean') preferences['notificationPreferences.sms'] = sms;
    if (typeof push === 'boolean') preferences['notificationPreferences.push'] = push;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: preferences },
      { new: true, runValidators: true }
    ).select('notificationPreferences');

    sendResponse(res, 200, true, 'Preferences updated', user.notificationPreferences);
  } catch (error) {
    console.error('Update preferences error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};