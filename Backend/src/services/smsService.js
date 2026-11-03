// Mock SMS service – replace with real provider (Twilio, etc.) later
export const sendSMS = async (phoneNumber, message) => {
  // For development, just log
  console.log(`📱 Mock SMS to ${phoneNumber}: ${message}`);
  return Promise.resolve({ success: true });
};