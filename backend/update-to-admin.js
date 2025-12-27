import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function updateToAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const db = mongoose.connection.db;
    const result = await db.collection('users').updateOne(
      { email: "admintutoring@gmail.com" },
      { $set: { role: "admin" } }
    );
    
    console.log('✅ Role updated to admin!');
    console.log('Modified count:', result.modifiedCount);
    
    // Verify update
    const user = await db.collection('users').findOne({ email: "admintutoring@gmail.com" });
    console.log('Current role:', user.role);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateToAdmin();
