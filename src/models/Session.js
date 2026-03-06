import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  gradeLevel: {
    type: String,
    enum: ['1-4', '5-8', '9-10', '11-12', 'university', 'adult'],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in hours
    required: true
  },
  hourlyRate: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['tele_birr', 'chapa', 'cash'],
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['online', 'in-person'],
      required: true
    },
    address: String,
    meetingLink: String
  },
  notes: String,
  cancellationReason: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: Date,
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: Date
  },
  // ✅ Added for Day 14 automated reminders
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
sessionSchema.index({ tutorId: 1, date: 1 });
sessionSchema.index({ studentId: 1, date: 1 });
sessionSchema.index({ status: 1 });

export default mongoose.model('Session', sessionSchema);