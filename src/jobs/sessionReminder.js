import cron from 'node-cron';
import Session from '../models/Session.js';
import Tutor from '../models/Tutor.js';
import { sendSessionReminder } from '../services/emailService.js';

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
      .populate('studentId', 'email fullName')
      .populate({
        path: 'tutorId',
        populate: { path: 'userId', select: 'email fullName' }
      });

    if (sessions.length === 0) {
      console.log('ℹ️ No upcoming sessions needing reminders.');
      return;
    }

    for (const session of sessions) {
      const student = session.studentId;
      const tutor = session.tutorId.userId;

      const sessionData = {
        _id: session._id,
        subject: session.subject,
        gradeLevel: session.gradeLevel,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        location: session.location,
        notes: session.notes,
        studentName: student.fullName,
        tutorName: tutor.fullName,
      };

      // Send to student
      await sendSessionReminder(student.email, student.fullName, sessionData, 'student');

      // Send to tutor
      await sendSessionReminder(tutor.email, tutor.fullName, sessionData, 'tutor');

      // Mark reminder as sent
      session.reminderSent = true;
      await session.save();
    }

    console.log(`✅ Sent reminders for ${sessions.length} sessions.`);
  } catch (error) {
    console.error('❌ Session reminder job error:', error);
  }
});