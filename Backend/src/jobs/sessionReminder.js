import cron from 'node-cron';
import Session from '../models/Session.js';
import { createNotification } from '../services/notificationService.js';

// Run every hour at minute 0 (e.g., 1:00, 2:00, ...)
cron.schedule('0 * * * *', async () => {
  console.log('⏰ Running session reminder job...');

  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find confirmed sessions starting in the next 24 hours that haven't had a reminder sent yet
    const sessions = await Session.find({
      status: 'confirmed',
      date: { $gte: now, $lte: in24Hours },
      reminderSent: { $ne: true }
    })
      .populate('studentId', '_id fullName')
      .populate({
        path: 'tutorId',
        populate: { path: 'userId', select: '_id fullName' }
      });

    if (sessions.length === 0) {
      console.log('ℹ️ No upcoming sessions needing reminders.');
      return;
    }

    for (const session of sessions) {
      const student = session.studentId;
      const tutor = session.tutorId.userId;
      const dateStr = new Date(session.date).toDateString();

      // Prepare base notification data
      const notificationData = { sessionId: session._id };

      // Notify student
      await createNotification(
        student._id,
        'reminder',
        'Session Reminder',
        `You have a ${session.subject} session with ${tutor.fullName} on ${dateStr} at ${session.startTime}.`,
        notificationData
      );

      // Notify tutor
      await createNotification(
        tutor._id,
        'reminder',
        'Session Reminder',
        `You have a ${session.subject} session with ${student.fullName} on ${dateStr} at ${session.startTime}.`,
        notificationData
      );

      // Mark reminder as sent
      session.reminderSent = true;
      await session.save();
    }

    console.log(`✅ Sent reminders for ${sessions.length} sessions.`);
  } catch (error) {
    console.error('❌ Session reminder job error:', error);
  }
});