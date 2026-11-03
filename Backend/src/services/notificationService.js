import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendEmail } from './emailService.js';
import { sendSMS } from './smsService.js';
import { sendPushNotification } from './pushService.js';

/**
 * Create and deliver a notification via all channels the user has enabled.
 * @param {ObjectId} recipient - User ID
 * @param {string} type - Notification type (from enum)
 * @param {string} title - Short title
 * @param {string} message - Detailed message
 * @param {Object} data - Additional data (e.g., sessionId)
 */
export const createNotification = async (recipient, type, title, message, data = {}) => {
  try {
    // 1. Always create in‑app notification
    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      data
    });

    // 2. Get user and preferences
    const user = await User.findById(recipient).select('notificationPreferences email phone');
    if (!user) return notification;

    const prefs = user.notificationPreferences || { email: true, sms: false, push: false };

    // 3. Send email if enabled
    if (prefs.email && user.email) {
      await sendEmail({
        to: user.email,
        subject: title,
        html: `<p>${message}</p>`
      });
    }

    // 4. Send SMS if enabled
    if (prefs.sms && user.phone) {
      const smsMessage = `${title}: ${message}`.substring(0, 160);
      await sendSMS(user.phone, smsMessage);
    }

    // 5. Send push if enabled
    if (prefs.push) {
      await sendPushNotification(recipient, title, message, data);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};