
import crypto from 'crypto';

const secret = process.env.CHAPA_WEBHOOK_SECRET;

if (!secret) {
  throw new Error('CHAPA_WEBHOOK_SECRET is missing');
}

const payload = {
  tx_ref: 'tx-0acdc62b26994ad7b870713c1453910f',
  status: 'success',
  amount: 400,
  currency: 'ETB'
};

const signature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

console.log('Webhook signature:', signature);
