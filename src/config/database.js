import mongoose from 'mongoose';
import config from './config.js';

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log('✅ Using existing database connection');
        return;
      }

      console.log('🔗 Attempting to connect to MongoDB...');
      
      // Connection options for better performance and stability
      const options = {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      };

      this.connection = await mongoose.connect(config.mongodbUri, options);
      this.isConnected = true;

      console.log('✅ MongoDB Connected Successfully!');
      console.log(`📍 Database: ${mongoose.connection.name}`);
      console.log(`🏠 Host: ${mongoose.connection.host}`);
      console.log(`📊 Port: ${mongoose.connection.port}`);

      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      console.log('💡 Troubleshooting tips:');
      console.log('   1. Is MongoDB running? (mongod)');
      console.log('   2. Check MONGODB_URI in .env file');
      console.log('   3. Try: brew services start mongodb-community (on Mac)');
      process.exit(1);
    }
  }

  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      console.log('📊 Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ Mongoose disconnected from DB');
      this.isConnected = false;
    });
  }

  async disconnect() {
    if (this.isConnected) {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('✅ MongoDB connection closed');
    }
  }
}

// Create singleton instance
const database = new DatabaseConnection();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Closing database connection...');
  await database.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Closing database connection...');
  await database.disconnect();
  process.exit(0);
});

export default database;