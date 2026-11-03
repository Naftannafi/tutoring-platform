import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'ETB'
  },
  commissionRate: {
    type: Number,
    default: 20
  },
  commissionAmount: {
    type: Number,
    default: 0
  },
  tutorEarnings: {
    type: Number,
    default: 0
  },
  tx_ref: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'telebirr', 'chapa'],
    default: 'chapa'
  },
  // Encrypted Chapa response
  chapaResponse: {
    encrypted: { type: String, default: '' },
    iv: { type: String, default: '' },
    salt: { type: String, default: '' },
    tag: { type: String, default: '' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Payment', paymentSchema);