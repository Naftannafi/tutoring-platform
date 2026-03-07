import axios from 'axios';
import crypto from 'crypto';

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_API_URL = 'https://api.chapa.co/v1';

export const generateTxRef = () => {
  return 'tx-' + crypto.randomBytes(16).toString('hex');
};

export const initializePayment = async ({ amount, currency, email, first_name, last_name, tx_ref, callback_url, return_url }) => {
  try {
    const response = await axios.post(
      `${CHAPA_API_URL}/transaction/initialize`,
      {
        amount,
        currency,
        email,
        first_name,
        last_name,
        tx_ref,
        callback_url,
        return_url,
        customization: {
          title: 'Tutoring Session Payment',
          description: 'Payment for tutoring session'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Chapa initialize error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Payment initialization failed');
  }
};

export const verifyPayment = async (tx_ref) => {
  try {
    const response = await axios.get(
      `${CHAPA_API_URL}/transaction/verify/${tx_ref}`,
      {
        headers: {
          'Authorization': `Bearer ${CHAPA_SECRET_KEY}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Chapa verify error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Payment verification failed');
  }
};

export const verifyWebhookSignature = (payload, signature, secret) => {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return computedSignature === signature;
};