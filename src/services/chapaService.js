import crypto from 'crypto';

export const generateTxRef = () => {
  return 'tx-' + crypto.randomBytes(16).toString('hex');
};

// Mock initializePayment
export const initializePayment = async ({ amount, currency, email, first_name, last_name, tx_ref, callback_url, return_url }) => {
  console.log('🔵 Mock Chapa: Payment initialized', { amount, currency, email, tx_ref });
  return {
    status: 'success',
    message: 'Mock payment initialized',
    data: {
      checkout_url: `https://mock-chapa-checkout.com/${tx_ref}`,
      tx_ref
    }
  };
};

// Mock verifyPayment
export const verifyPayment = async (tx_ref) => {
  console.log('🔵 Mock Chapa: Verifying payment', { tx_ref });
  return {
    status: 'success',
    data: {
      status: 'success',
      tx_ref,
      amount: 100,
      currency: 'ETB'
    }
  };
};

// Mock refundPayment (new)
export const refundPayment = async (tx_ref, amount) => {
  console.log(`🔵 Mock Chapa: Refund for ${tx_ref}, amount ${amount}`);
  return { status: 'success', message: 'Refund initiated' };
};

// Webhook signature verification (optional)
export const verifyWebhookSignature = (payload, signature, secret) => {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return computedSignature === signature;
};