import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
// TEMPORARY - for testing reminders
import Session from './models/Session.js';
import { sendSessionReminder } from './services/emailService.js';
// Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import tutorRoutes from './routes/tutorRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

const app = express();

/* =========================
   ES Module __dirname Fix
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   Global Middleware
========================= */
app.use(express.json());
app.use(cors());

/* =========================
   Static Files (Uploads)
========================= */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =========================
   API Routes
========================= */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/reviews', reviewRoutes);

/* =========================
   Root Route
========================= */
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Tutoring Platform! ���',
    description: 'Connecting students and tutors',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      tutors: '/api/tutors',
      upload: '/api/upload'
    }
  });
});

/* =========================
   Health Check
========================= */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Tutoring Platform API',
    version: '1.0.0',
    database: 'connected'
  });
});
// =========================
// TEMPORARY TEST ROUTE - REMOVE AFTER TESTING
// =========================
app.get('/test-reminders', async (req, res) => {
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
      return res.json({ message: 'No upcoming sessions needing reminders.' });
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

    res.json({ message: `Triggered reminders for ${sessions.length} sessions.` });
  } catch (error) {
    console.error('Manual reminder error:', error);
    res.status(500).json({ error: error.message });
  }
});
/* =========================
   404 Handler
========================= */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`
  });
});

/* =========================
   Global Error Handler - SHOW REAL ERRORS
========================= */
app.use((error, req, res, next) => {
  console.error('��� REAL SERVER ERROR:', error);
  console.error('��� Error Stack:', error.stack);

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: error.message,  // Show actual error message
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

export default app;
