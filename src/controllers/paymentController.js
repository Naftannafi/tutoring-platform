import Payment from '../models/Payment.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import Tutor from '../models/Tutor.js';
import Earnings from '../models/Earnings.js';
import PaymentLog from '../models/paymentLog.js';
import { generateTxRef, initializePayment, verifyPayment, refundPayment, verifyWebhookSignature } from '../services/chapaService.js';
import { createNotification } from '../services/notificationService.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const initiatePayment = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user._id;

    const session = await Session.findById(sessionId)
      .populate('studentId')
      .populate({
        path: 'tutorId',
        populate: { path: 'userId', select: 'fullName email' }
      });

    if (!session) {
      return sendResponse(res, 404, false, 'Session not found');
    }
    if (session.studentId._id.toString() !== userId.toString()) {
      return sendResponse(res, 403, false, 'Not authorized to pay for this session');
    }
    if (session.status !== 'confirmed') {
      return sendResponse(res, 400, false, 'Only confirmed sessions can be paid for');
    }
    const existingPayment = await Payment.findOne({ sessionId, status: 'completed' });
    if (existingPayment) {
      return sendResponse(res, 400, false, 'Payment already completed for this session');
    }

    const tx_ref = generateTxRef();

    const student = session.studentId;
    const fullName = student.fullName.split(' ');
    const firstName = fullName[0] || 'Student';
    const lastName = fullName.slice(1).join(' ') || 'User';

    const return_url = `${process.env.BASE_URL}/payment/success?tx_ref=${tx_ref}`;
    const callback_url = `${process.env.BASE_URL}/api/payments/webhook`;

    const chapaResponse = await initializePayment({
      amount: session.totalAmount,
      currency: 'ETB',
      email: student.email,
      first_name: firstName,
      last_name: lastName,
      tx_ref,
      callback_url,
      return_url
    });

    if (!chapaResponse.status || chapaResponse.status !== 'success') {
      return sendResponse(res, 400, false, chapaResponse.message || 'Payment initiation failed');
    }

    const payment = await Payment.create({
      sessionId: session._id,
      userId: student._id,
      amount: session.totalAmount,
      currency: 'ETB',
      tx_ref,
      status: 'pending',
      // store plain for now, will be encrypted later in webhook
    });

    // Log the initiation
    await PaymentLog.create({
      paymentId: payment._id,
      tx_ref,
      action: 'initiate',
      newStatus: 'pending',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user._id,
    });

    sendResponse(res, 200, true, 'Payment initiated', {
      checkout_url: chapaResponse.data.checkout_url,
      tx_ref,
      paymentId: payment._id
    });

  } catch (error) {
    console.error('Initiate payment error:', error);
    sendResponse(res, 500, false, error.message || 'Server error');
  }
};

export const chapaWebhook = async (req, res) => {
  try {
    const { tx_ref, status, amount, currency } = req.body;

    const payment = await Payment.findOne({ tx_ref }).populate('sessionId');
    if (!payment) {
      return res.status(404).send('Payment not found');
    }

    const oldStatus = payment.status;
    payment.status = status === 'success' ? 'completed' : 'failed';
    // Encrypt the full webhook payload
    const encrypted = encrypt(JSON.stringify(req.body), process.env.ENCRYPTION_SECRET);
    payment.chapaResponse = encrypted;
    await payment.save();

    // Log the webhook
    await PaymentLog.create({
      paymentId: payment._id,
      tx_ref,
      action: 'webhook_received',
      oldStatus,
      newStatus: payment.status,
      data: { amount, currency }, // don't log full payload for privacy
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (status === 'success') {
      const session = await Session.findById(payment.sessionId._id).populate('tutorId').populate('studentId');
      session.paymentStatus = 'paid';
      await session.save();

      const commissionRate = 20;
      const commissionAmount = (payment.amount * commissionRate) / 100;
      const tutorEarnings = payment.amount - commissionAmount;

      payment.commissionRate = commissionRate;
      payment.commissionAmount = commissionAmount;
      payment.tutorEarnings = tutorEarnings;
      await payment.save();

      await Earnings.create({
        tutorId: session.tutorId._id,
        sessionId: session._id,
        paymentId: payment._id,
        amount: payment.amount,
        commissionRate,
        commissionAmount,
        netEarnings: tutorEarnings,
        status: 'pending'
      });

      await createNotification(
        payment.userId,
        'payment_received',
        'Payment Successful',
        `Your payment of ${amount} ${currency} for the session has been received.`,
        { sessionId: session._id, paymentId: payment._id }
      );

      await createNotification(
        session.tutorId.userId,
        'earnings_updated',
        'New Earnings',
        `You earned ${tutorEarnings} ETB (after commission) from a session with ${session.studentId.fullName}.`,
        { sessionId: session._id, paymentId: payment._id }
      );
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Server error');
  }
};

export const verifyPaymentStatus = async (req, res) => {
  try {
    const { tx_ref } = req.params;

    const payment = await Payment.findOne({ tx_ref }).populate('sessionId');
    if (!payment) {
      return sendResponse(res, 404, false, 'Payment not found');
    }

    let chapaStatus = null;
    try {
      chapaStatus = await verifyPayment(tx_ref);
    } catch (error) {
      // ignore
    }

    sendResponse(res, 200, true, 'Payment status retrieved', {
      status: payment.status,
      sessionId: payment.sessionId._id,
      chapaStatus: chapaStatus?.data?.status || null
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    sendResponse(res, 500, false, 'Server error');
  }
};

// NEW: Refund payment (admin only)
export const refundPaymentController = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId).populate('sessionId');
    if (!payment) {
      return sendResponse(res, 404, false, 'Payment not found');
    }
    if (payment.status !== 'completed') {
      return sendResponse(res, 400, false, 'Only completed payments can be refunded');
    }

    // Call mock refund API
    const refundResult = await refundPayment(payment.tx_ref, payment.amount);

    // Update payment status
    const oldStatus = payment.status;
    payment.status = 'refunded';
    await payment.save();

    // Update session payment status
    const session = payment.sessionId;
    session.paymentStatus = 'refunded';
    await session.save();

    // Create notification for student
    await createNotification(
      payment.userId,
      'payment_refunded',
      'Payment Refunded',
      `Your payment of ${payment.amount} ETB has been refunded.`,
      { sessionId: session._id, paymentId: payment._id }
    );

    // Log the refund
    await PaymentLog.create({
      paymentId: payment._id,
      tx_ref: payment.tx_ref,
      action: 'refund',
      oldStatus,
      newStatus: 'refunded',
      userId: req.user._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    sendResponse(res, 200, true, 'Payment refunded', { payment });
  } catch (error) {
    console.error('Refund error:', error);
    sendResponse(res, 500, false, error.message || 'Refund failed');
  }
};