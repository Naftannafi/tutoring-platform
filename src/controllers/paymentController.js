import Payment from '../models/Payment.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import Tutor from '../models/Tutor.js';
import { generateTxRef, initializePayment, verifyPayment, verifyWebhookSignature } from '../services/chapaService.js';
import { createNotification } from '../services/notificationService.js';

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
      chapaResponse: chapaResponse.data
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
    // Optional: verify signature (skip during development)
    // const signature = req.headers['x-chapa-signature'];
    // const secret = process.env.CHAPA_WEBHOOK_SECRET;
    // if (secret && !verifyWebhookSignature(req.body, signature, secret)) {
    //   return res.status(401).send('Invalid signature');
    // }

    const { tx_ref, status, amount, currency } = req.body;

    const payment = await Payment.findOne({ tx_ref }).populate('sessionId');
    if (!payment) {
      return res.status(404).send('Payment not found');
    }

    payment.status = status === 'success' ? 'completed' : 'failed';
    payment.chapaResponse = req.body;
    await payment.save();

    if (status === 'success') {
      const session = await Session.findById(payment.sessionId._id);
      session.paymentStatus = 'paid';
      await session.save();

      await createNotification(
        payment.userId,
        'payment_received',
        'Payment Successful',
        `Your payment of ${amount} ${currency} for the session has been received.`,
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