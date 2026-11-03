import Notification from '../models/Notification.js';

const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// @desc    Get notifications for the logged-in user
// @route   GET /api/notifications
// @access  Private
export const getMyNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user._id;

    const filter = { recipient: userId };
    if (unreadOnly === 'true') filter.isRead = false;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    sendResponse(res, 200, true, 'Notifications retrieved', {
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return sendResponse(res, 404, false, 'Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    sendResponse(res, 200, true, 'Notification marked as read', { notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Mark all notifications as read for the user
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    sendResponse(res, 200, true, 'All notifications marked as read');
  } catch (error) {
    console.error('Mark all as read error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return sendResponse(res, 404, false, 'Notification not found');
    }

    sendResponse(res, 200, true, 'Notification deleted');
  } catch (error) {
    console.error('Delete notification error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};