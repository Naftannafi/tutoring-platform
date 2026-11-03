import mongoose from 'mongoose';

const paymentLogSchema = new mongoose.Schema({
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  tx_ref: String,
  action: {
    type: String,
    enum: ['initiate', 'webhook_received', 'status_changed', 'refund'],
    required: true
  },
  oldStatus: String,
  newStatus: String,
  data: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('PaymentLog', paymentLogSchema);