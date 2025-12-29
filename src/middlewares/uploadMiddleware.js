import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   Ensure Upload Directories Exist
========================= */
const ensureUploadDirs = () => {
  const baseDir = path.join(__dirname, '..'); // Go up to src
  const dirs = [
    path.join(baseDir, 'uploads'),
    path.join(baseDir, 'uploads/profile'),
    path.join(baseDir, 'uploads/documents'),
    path.join(baseDir, 'uploads/certificates'),
    path.join(baseDir, 'uploads/verification')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`��� Created upload directory: ${dir}`);
    }
  });
};

ensureUploadDirs();

/* =========================
   Helper: Get File URL
========================= */
const getFileUrl = (file) => {
  if (!file || !file.filename) return null;
  
  let folder = 'documents';
  
  if (file.fieldname === 'profileImage') {
    folder = 'profile';
  } else if (file.fieldname && file.fieldname.includes('certificate')) {
    folder = 'certificates';
  } else if (file.mimetype && file.mimetype.startsWith('image/')) {
    folder = 'documents';
  }
  
  return `/uploads/${folder}/${file.filename}`;
};

/* =========================
   Storage Configuration
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const baseDir = path.join(__dirname, '..'); // Go up to src
    
    let folder = 'documents';
    
    if (file.fieldname === 'profileImage') {
      folder = 'profile';
    } else if (file.fieldname && file.fieldname.includes('certificate')) {
      folder = 'certificates';
    } else if (req.originalUrl && req.originalUrl.includes('verification')) {
      folder = 'verification';
    }
    
    const destPath = path.join(baseDir, 'uploads', folder);
    cb(null, destPath);
  },
  
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase()
      .substring(0, 50);
    
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

/* =========================
   File Filter
========================= */
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (jpg, png) and documents (pdf, doc, docx) are allowed'));
  }
};

/* =========================
   Multer Configuration
========================= */
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10
  },
  fileFilter: fileFilter
});

// Export the upload middleware as default and getFileUrl as named export
export { getFileUrl };
export default upload;
