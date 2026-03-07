import Notification from '../models/Notification.js';

/**
 * Create a notification for a user
 * @param {ObjectId} recipient - User ID
 * @param {string} type - Notification type (from enum)
 * @param {string} title - Short title
 * @param {string} message - Detailed message
 * @param {Object} data - Additional data (e.g., sessionId)
 */
export const createNotification = async (recipient, type, title, message, data = {}) => {
  try {
    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      data
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};