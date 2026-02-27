// src/config/config.js
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Debug: Let's see what's actually happening
console.log('🔍 DEBUG - process.env.MONGODB_URI:', process.env.MONGODB_URI);
console.log('🔍 DEBUG - typeof MONGODB_URI:', typeof process.env.MONGODB_URI);

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI,
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  }
};

console.log('🔍 DEBUG - config.mongodbUri:', config.mongodbUri);

// Simple check
if (!config.mongodbUri) {
  console.error('❌ MONGODB_URI is missing in config!');
} else {
  console.log('✅ MONGODB_URI found in config!');
}

export default config;