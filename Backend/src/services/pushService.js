import PushSubscription from '../models/pushSubscription.js';

// Mock push sender
export const sendPushNotification = async (userId, title, body, data = {}) => {
  // Find all subscriptions for this user
  const subscriptions = await PushSubscription.find({ userId });
  if (!subscriptions.length) return;

  subscriptions.forEach(sub => {
    console.log(`📲 Mock push to user ${userId}: ${title} - ${body}`, data);
    // In production, you'd use web-push or Firebase Admin SDK
  });
};