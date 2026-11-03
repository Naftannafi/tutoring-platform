
import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/User.js';

async function setupAdmin() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/tutoringDB'
    );

    const email = 'admin@tutoring.local';
    let admin = await User.findOne({ email });

    if (!admin) {
      admin = new User({
        fullName: 'Platform Admin',
        email,
        phone: '+251933456789',
        role: 'admin',
        isVerified: true,
        location: {
          city: 'Dire Dawa',
          woreda: 'Sabian',
          kebele: '01',
          specificAddress: ''
        }
      });
    }

    admin.role = 'admin';
    admin.isVerified = true;
    admin.password = 'Admin123';

    await admin.save();

    console.log('Admin account is ready.');
    console.log('Email:', email);
    console.log('Password: AdminLocal2026X');
  } catch (error) {
    console.error('Setup failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

setupAdmin();
