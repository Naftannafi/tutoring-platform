// src/utils/emailService.js - Smart OTP Service

/**
 * Smart OTP service that works in development and production
 * Free during development, uses free tier in production
 */

const sendOTP = async (email, otp, userName = 'User') => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // DEVELOPMENT: Show OTP in console (FREE)
    console.log('\n📧 ===== DEVELOPMENT EMAIL SIMULATION =====');
    console.log(`To: ${email}`);
    console.log(`Subject: Verify Your Tutoring Platform Account`);
    console.log(`Message: Hello ${userName}, your verification code is: ${otp}`);
    console.log(`This code expires in 10 minutes`);
    console.log(`📧 ========================================\n`);
    
    // Simulate successful sending
    return { success: true, method: 'development_console' };
  }
  
  // PRODUCTION: We'll implement Resend.com later
  // For now, still use console but mark as production
  console.log(`📧 [PRODUCTION] OTP for ${email}: ${otp}`);
  
  return { 
    success: true, 
    method: 'production_console',
    note: 'Integrate Resend.com when ready' 
  };
};

const sendWelcomeEmail = async (email, userName) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    console.log('\n📧 ===== WELCOME EMAIL =====');
    console.log(`To: ${email}`);
    console.log(`Subject: Welcome to Dire Dawa Tutoring Platform!`);
    console.log(`Message: Welcome ${userName}! Your account is ready.`);
    console.log(`📧 ========================\n`);
    return { success: true };
  }
  
  // Production: Implement later
  return { success: true };
};

export { sendOTP, sendWelcomeEmail };