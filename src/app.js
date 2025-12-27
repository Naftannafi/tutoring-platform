import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import tutorRoutes from './routes/tutorRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

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

/* =========================
   Root Route
========================= */
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Tutoring Platform! 🎓',
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
   Global Error Handler
========================= */
app.use((error, req, res, next) => {
  console.error('🚨 Server Error:', error);

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'Something went wrong on our end'
  });
});

export default app;
