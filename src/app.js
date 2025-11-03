import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
// Routes
app.use('/api/auth', authRoutes);



app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to  Tutoring Platform! 🎓',
    description: 'Connecting students and tutors ',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      documentation: 'coming soon...'
    }
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`
  });
});

// Error Handler
app.use((error, req, res, next) => {
  console.error('🚨 Server Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error', 
    message: 'Something went wrong on our end'
  });
});

export default app;