import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = [
    './uploads/profile',
    './uploads/certificates', 
    './uploads/documents',
    './uploads/temp'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    let uploadPath = './uploads/';
    
    // Determine folder based on fieldname
    if (file.fieldname === 'profileImage') {
      uploadPath += 'profile/';
    } else if (file.fieldname === 'certificates') {
      uploadPath += 'certificates/';
    } else if (file.fieldname === 'documents') {
      uploadPath += 'documents/';
    } else {
      uploadPath += 'temp/';
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const originalName = path.basename(file.originalname, ext);
    
    // Safe filename (remove special characters)
    const safeName = originalName.replace(/[^a-zA-Z0-9]/g, '-');
    
    cb(null, safeName + '-' + uniqueSuffix + ext);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'profileImage': ['.jpg', '.jpeg', '.png', '.gif'],
    'certificates': ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'],
    'documents': ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx']
  };
  
  const allowedExtensions = allowedTypes[file.fieldname] || 
                          ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${allowedExtensions.join(', ')}`), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Max 10 files at once
  }
});

// Helper function to get file URL
const getFileUrl = (file) => {
  if (!file) return null;
  
  // Remove './' from path for URL
  let filePath = file.path.replace(/^\.\//, '');
  
  // Convert backslashes to forward slashes (for Windows)
  filePath = filePath.replace(/\\/g, '/');
  
  return `/${filePath}`;
};

export { upload, getFileUrl };
