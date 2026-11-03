import app from './app.js';
import config from './config/config.js';
import database from './config/database.js';
import './jobs/sessionReminder.js';   // <-- ADD THIS LINE

const startServer = async () => {
  try {
    console.log('🚀 Starting Tutoring Platform Server...');
    
    await database.connect();
    
    app.listen(config.port, () => {
      console.log('✅ Server started successfully!');
      console.log(`📍 Port: ${config.port}`);
      console.log(`🌐 URL: http://localhost:${config.port}`);
      console.log(`❤️ Health: http://localhost:${config.port}/health`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();