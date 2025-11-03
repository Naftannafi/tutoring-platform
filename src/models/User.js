import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    validate: {
      validator: function(email) {
        // Basic domain validation - reject obvious fake domains
        const fakeDomains = ['fake.com', 'test.com', 'example.com', 'temp.com'];
        const domain = email.split('@')[1];
        return !fakeDomains.includes(domain.toLowerCase());
      },
      message: 'Please use a legitimate email provider'
    }
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    validate: {
      validator: function(password) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    },
    select: false
  },
  
  role: {
    type: String,
    enum: ['student', 'tutor', 'admin'],
    default: 'student'
  },
  
  phone: {
    type: String,
    required: [true, 'Mobile phone number is required'],
    validate: {
      validator: function(phone) {
        const ethiopianPhoneRegex = /^(\+251|251|0)?(9[0-9])([0-9]{7})$/;
        return ethiopianPhoneRegex.test(phone.replace(/\s+/g, ''));
      },
      message: 'Please use a valid Ethiopian mobile number (e.g., 0912345678, +251912345678, 251912345678)'
    },
    set: function(phone) {
      const cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
      
      if (cleaned.startsWith('0')) {
        return '+251' + cleaned.slice(1);
      } else if (cleaned.startsWith('251')) {
        return '+' + cleaned;
      } else if (cleaned.startsWith('+251')) {
        return cleaned;
      } else {
        return '+251' + cleaned;
      }
    }
  },
  
  homeNumber: {
    type: String,
    required: function() {
      return this.role === 'tutor';
    },
    validate: {
      validator: function(homeNumber) {
        const ethiopianLandlineRegex = /^(\+251|251|0)?([1-5][0-9])([0-9]{7})$/;
        return ethiopianLandlineRegex.test(homeNumber.replace(/\s+/g, ''));
      },
      message: 'Please use a valid Ethiopian landline number (e.g., 0251112222, +251251112222)'
    },
    set: function(homeNumber) {
      const cleaned = homeNumber.replace(/\s+/g, '').replace(/-/g, '');
      
      if (cleaned.startsWith('0')) {
        return '+251' + cleaned.slice(1);
      } else if (cleaned.startsWith('251')) {
        return '+' + cleaned;
      } else if (cleaned.startsWith('+251')) {
        return cleaned;
      } else {
        return '+251' + cleaned;
      }
    }
  },
  
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  location: {
    kebele: {
      type: String,
      required: [true, 'Kebele is required']
    },
    woreda: {
      type: String,
      required: [true, 'Woreda is required']
    },
    city: {
      type: String,
      default: 'Dire Dawa'
    },
    specificAddress: {
      type: String,
      required: function() {
        return this.role === 'tutor';
      }
    }
  },
  
  profileImage: String,
  
  // ======================
  // EMAIL VERIFICATION SYSTEM
  // ======================
  isVerified: {
    type: Boolean,
    default: false
  },
  
  otp: {
    type: String,
    select: false
  },
  
  otpExpires: {
    type: Date,
    select: false
  },
  
  otpAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  
  lastOtpSent: {
    type: Date,
    select: false
  },
  
  // ======================
  // PASSWORD RESET SYSTEM
  // ======================
  resetPasswordToken: {
    type: String,
    select: false
  },
  
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
  
}, {
  timestamps: true
});

// ======================
// EMAIL VERIFICATION METHODS
// ======================

// Generate OTP for email verification
userSchema.methods.generateEmailOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  
  this.otp = otp;
  this.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  this.otpAttempts = 0;
  this.lastOtpSent = new Date();
  
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function(enteredOtp) {
  // Check if OTP exists and not expired
  if (!this.otp || !this.otpExpires) {
    throw new Error('No OTP found. Please request a new one.');
  }
  
  if (Date.now() > this.otpExpires) {
    throw new Error('OTP has expired. Please request a new one.');
  }
  
  // Check attempt limit
  if (this.otpAttempts >= 5) {
    throw new Error('Too many OTP attempts. Please request a new OTP.');
  }
  
  this.otpAttempts += 1;
  
  if (this.otp !== enteredOtp) {
    throw new Error('Invalid OTP code.');
  }
  
  // OTP is valid - mark email as verified and clear OTP
  this.isVerified = true;
  this.otp = undefined;
  this.otpExpires = undefined;
  this.otpAttempts = 0;
  
  return true;
};

// Resend OTP (with rate limiting)
userSchema.methods.canResendOTP = function() {
  if (!this.lastOtpSent) return true;
  
  const timeSinceLastOtp = Date.now() - this.lastOtpSent;
  return timeSinceLastOtp > 60000; // 1 minute cooldown
};

// ======================
// PASSWORD SECURITY METHODS
// ======================

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

userSchema.methods.generatePasswordReset = function() {
  this.resetPasswordToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  return this.resetPasswordToken;
};

userSchema.methods.isResetTokenValid = function() {
  return this.resetPasswordExpires > Date.now();
};

userSchema.methods.clearResetToken = function() {
  this.resetPasswordToken = undefined;
  this.resetPasswordExpires = undefined;
};

// ======================
// USER-FRIENDLY METHODS
// ======================

userSchema.methods.getFormattedPhone = function() {
  const phone = this.phone.replace('+251', '0');
  return phone.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
};

userSchema.methods.getFormattedHomeNumber = function() {
  if (!this.homeNumber) return null;
  const home = this.homeNumber.replace('+251', '0');
  return home.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
};

userSchema.methods.isTutor = function() {
  return this.role === 'tutor';
};

userSchema.methods.isStudent = function() {
  return this.role === 'student';
};

userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// ======================
// SECURITY SANITIZATION
// ======================

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.otp;
  delete user.otpExpires;
  delete user.otpAttempts;
  delete user.lastOtpSent;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  return user;
};

export default mongoose.model('User', userSchema);