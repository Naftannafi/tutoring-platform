
import mongoose from 'mongoose';

import Payment from '../models/Payment.js';
import Session from '../models/Session.js';
import Earnings from '../models/Earnings.js';
import PaymentLog from '../models/paymentLog.js';

import {
  generateTxRef,
  initializePayment,
  verifyPayment,
  refundPayment,
  verifyWebhookSignature
} from '../services/chapaService.js';

import { createNotification } from '../services/notificationService.js';
import { encrypt } from '../utils/encryption.js';


const sendResponse = (res, statusCode, success, message, data = null) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};


// ==========================================
// 1. INITIATE PAYMENT
// ==========================================

export const initiatePayment = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user._id;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return sendResponse(res, 400, false, 'Valid session ID is required');
    }

    if (!process.env.BASE_URL) {
      return sendResponse(res, 500, false, 'Payment configuration is incomplete');
    }

    const session = await Session.findById(sessionId)
      .populate('studentId')
      .populate({
        path: 'tutorId',
        populate: {
          path: 'userId',
          select: 'fullName email'
        }
      });

    if (!session) {
      return sendResponse(res, 404, false, 'Session not found');
    }

    if (!session.studentId) {
      return sendResponse(res, 400, false, 'Session student information is missing');
    }

    if (session.studentId._id.toString() !== userId.toString()) {
      return sendResponse(res, 403, false, 'Not authorized to pay for this session');
    }

    if (session.status !== 'confirmed') {
      return sendResponse(res, 400, false, 'Only confirmed sessions can be paid for');
    }

    if (session.paymentStatus === 'paid') {
      return sendResponse(res, 400, false, 'This session has already been paid for');
    }

    if (
      typeof session.totalAmount !== 'number' ||
      !Number.isFinite(session.totalAmount) ||
      session.totalAmount <= 0
    ) {
      return sendResponse(res, 400, false, 'Invalid session payment amount');
    }

    const existingPayment = await Payment.findOne({
      sessionId: session._id,
      status: { $in: ['completed', 'pending'] }
    });

    if (existingPayment) {
      return sendResponse(
        res,
        400,
        false,
        existingPayment.status === 'completed'
          ? 'Payment already completed for this session'
          : 'A payment is already pending for this session',
        {
          tx_ref: existingPayment.tx_ref,
          status: existingPayment.status
        }
      );
    }

    const student = session.studentId;

    const fullName = (student.fullName || 'Student User')
      .trim()
      .split(/\s+/);

    const firstName = fullName[0] || 'Student';
    const lastName = fullName.slice(1).join(' ') || 'User';

    const tx_ref = generateTxRef();

    const return_url =
      `${process.env.BASE_URL}/payment/success?tx_ref=${tx_ref}`;

    const callback_url =
      `${process.env.BASE_URL}/api/payments/webhook`;

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

    if (
      !chapaResponse ||
      chapaResponse.status !== 'success' ||
      !chapaResponse.data?.checkout_url
    ) {
      return sendResponse(
        res,
        400,
        false,
        chapaResponse?.message || 'Payment initiation failed'
      );
    }

    const payment = await Payment.create({
      sessionId: session._id,
      userId: student._id,
      amount: session.totalAmount,
      currency: 'ETB',
      tx_ref,
      status: 'pending'
    });

    await PaymentLog.create({
      paymentId: payment._id,
      tx_ref,
      action: 'initiate',
      newStatus: 'pending',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user._id
    });

    return sendResponse(res, 200, true, 'Payment initiated', {
      checkout_url: chapaResponse.data.checkout_url,
      tx_ref,
      paymentId: payment._id,
      amount: payment.amount,
      currency: payment.currency
    });

  } catch (error) {
    console.error('Initiate payment error:', error);

    return sendResponse(
      res,
      500,
      false,
      'Unable to initiate payment'
    );
  }
};


// ==========================================
// 2. CHAPA WEBHOOK
// ==========================================

export const chapaWebhook = async (req, res) => {
  try {
    // Verify the webhook signature first.
    // This is the local mock HMAC convention, not a production
    // Chapa webhook implementation.

    const signature = req.headers['x-chapa-signature'];
    const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;

    if (!webhookSecret || !signature) {
      return res.status(401).send('Webhook signature is required');
    }

    const isValid = verifyWebhookSignature(
      req.body,
      signature,
      webhookSecret
    );

    if (!isValid) {
      return res.status(401).send('Invalid webhook signature');
    }

    const { tx_ref, status, amount, currency } = req.body;

    // Validate webhook data.
    if (!tx_ref || !status || amount === undefined || !currency) {
      return res.status(400).send('Missing payment information');
    }

    if (!['success', 'failed'].includes(status)) {
      return res.status(400).send('Invalid payment status');
    }

    const payment = await Payment.findOne({ tx_ref });

    if (!payment) {
      return res.status(404).send('Payment not found');
    }

    // Validate amount and currency.
    if (
      Number(amount) !== Number(payment.amount) ||
      currency !== payment.currency
    ) {
      return res.status(400).send('Payment amount or currency mismatch');
    }

    // Prevent processing an already processed payment.
    if (payment.status !== 'pending') {
      return res.status(200).send('Payment already processed');
    }

    // Confirm the session exists before changing payment state.
    const session = await Session.findById(payment.sessionId)
      .populate({
        path: 'tutorId',
        populate: {
          path: 'userId',
          select: 'fullName email'
        }
      })
      .populate('studentId');

    if (!session || !session.tutorId) {
      return res.status(404).send('Session or tutor not found');
    }

    if (!session.studentId) {
      return res.status(404).send('Student not found');
    }

    if (!process.env.ENCRYPTION_SECRET) {
      return res.status(500).send('Encryption configuration is missing');
    }

    // Encrypt webhook response.
    payment.chapaResponse = encrypt(
      JSON.stringify(req.body),
      process.env.ENCRYPTION_SECRET
    );

    if (status === 'failed') {
      payment.status = 'failed';
      await payment.save();

      await PaymentLog.create({
        paymentId: payment._id,
        tx_ref,
        action: 'webhook_received',
        oldStatus: 'pending',
        newStatus: 'failed',
        data: { amount, currency },
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).send('Payment marked as failed');
    }

    // Calculate commission.
    const commissionRate = 20;
    const commissionAmount =
      (payment.amount * commissionRate) / 100;

    const tutorEarnings =
      payment.amount - commissionAmount;

    // Update payment.
    payment.status = 'completed';
    payment.commissionRate = commissionRate;
    payment.commissionAmount = commissionAmount;
    payment.tutorEarnings = tutorEarnings;

    await payment.save();

    // Update session.
    session.paymentStatus = 'paid';
    await session.save();

    // Create earnings record only once per payment.
    await Earnings.findOneAndUpdate(
      { paymentId: payment._id },
      {
        $setOnInsert: {
          tutorId: session.tutorId._id,
          sessionId: session._id,
          paymentId: payment._id,
          amount: payment.amount,
          commissionRate,
          commissionAmount,
          netEarnings: tutorEarnings,
          status: 'pending'
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    // Log successful webhook.
    await PaymentLog.create({
      paymentId: payment._id,
      tx_ref,
      action: 'webhook_received',
      oldStatus: 'pending',
      newStatus: 'completed',
      data: { amount, currency },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Notify student.
    await createNotification(
      payment.userId,
      'payment_received',
      'Payment Successful',
      `Your payment of ${payment.amount} ${payment.currency} was received.`,
      {
        sessionId: session._id,
        paymentId: payment._id
      }
    );

    // Notify tutor.
    if (session.tutorId.userId) {
      await createNotification(
        session.tutorId.userId._id,
        'earnings_updated',
        'New Earnings',
        `You earned ${tutorEarnings} ETB after commission.`,
        {
          sessionId: session._id,
          paymentId: payment._id
        }
      );
    }

    return res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).send('Server error');
  }
};


// ==========================================
// 3. VERIFY PAYMENT STATUS
// ==========================================

export const verifyPaymentStatus = async (req, res) => {
  try {
    const { tx_ref } = req.params;

    if (!tx_ref) {
      return sendResponse(res, 400, false, 'Transaction reference is required');
    }

    const payment = await Payment.findOne({ tx_ref })
      .populate('sessionId');

    if (!payment) {
      return sendResponse(res, 404, false, 'Payment not found');
    }

    // Only the payment owner or an admin can view its status.
    const isOwner =
      payment.userId.toString() === req.user._id.toString();

    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return sendResponse(res, 403, false, 'Not authorized to view this payment');
    }

    let chapaStatus = null;

    try {
      const verification = await verifyPayment(tx_ref);

      chapaStatus = verification?.data?.status || null;
    } catch (error) {
      console.error('Chapa verification error:', error.message);
    }

    return sendResponse(
      res,
      200,
      true,
      'Payment status retrieved',
      {
        status: payment.status,
        sessionId: payment.sessionId?._id || null,
        chapaStatus
      }
    );

  } catch (error) {
    console.error('Verify payment error:', error);

    return sendResponse(
      res,
      500,
      false,
      'Unable to retrieve payment status'
    );
  }
};


// ==========================================
// 4. REFUND PAYMENT (ADMIN ONLY)
// ==========================================

export const refundPaymentController = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return sendResponse(res, 400, false, 'Invalid payment ID');
    }

    const payment = await Payment.findById(paymentId)
      .populate('sessionId');

    if (!payment) {
      return sendResponse(res, 404, false, 'Payment not found');
    }

    if (payment.status !== 'completed') {
      return sendResponse(
        res,
        400,
        false,
        'Only completed payments can be refunded'
      );
    }

    if (!payment.sessionId) {
      return sendResponse(res, 404, false, 'Related session not found');
    }

    // Call the refund service.
    const refundResult = await refundPayment(
      payment.tx_ref,
      payment.amount
    );

    if (!refundResult || refundResult.status !== 'success') {
      return sendResponse(
        res,
        400,
        false,
        refundResult?.message || 'Refund operation failed'
      );
    }

    const oldStatus = payment.status;

    payment.status = 'refunded';
    await payment.save();

    // Update session payment status.
    payment.sessionId.paymentStatus = 'refunded';
    await payment.sessionId.save();

    // Cancel pending tutor earnings.
    await Earnings.findOneAndUpdate(
      { paymentId: payment._id, status: 'pending' },
      { $set: { status: 'cancelled' } }
    );

    // Notify student.
    await createNotification(
      payment.userId,
      'payment_refunded',
      'Payment Refunded',
      `Your payment of ${payment.amount} ETB has been refunded.`,
      {
        sessionId: payment.sessionId._id,
        paymentId: payment._id
      }
    );

    // Log refund.
    await PaymentLog.create({
      paymentId: payment._id,
      tx_ref: payment.tx_ref,
      action: 'refund',
      oldStatus,
      newStatus: 'refunded',
      userId: req.user._id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    return sendResponse(
      res,
      200,
      true,
      'Mock refund completed',
      {
        paymentId: payment._id,
        status: payment.status
      }
    );

  } catch (error) {
    console.error('Refund error:', error);

    return sendResponse(
      res,
      500,
      false,
      'Unable to process refund'
    );
  }
};
