import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';
import {
  uploadProfileImage,
  uploadTutorCertificates,
  uploadTutorDocuments,
  getTutorDocuments,
  deleteCertificate,
  deleteDocument,
  getTutorDocumentsAdmin
} from '../controllers/uploadController.js';

const router = express.Router();

// ======================
// USER PROFILE IMAGE
// ======================
router.post('/profile',
  protect,
  upload.single('profileImage'),
  uploadProfileImage
);

// ======================
// TUTOR DOCUMENTS
// ======================
router.post('/tutor/certificates',
  protect,
  upload.array('certificates', 5), // Max 5 certificate files
  uploadTutorCertificates
);

router.post('/tutor/documents',
  protect,
  upload.array('documents', 5), // Max 5 document files
  uploadTutorDocuments
);

router.get('/tutor/documents',
  protect,
  getTutorDocuments
);

router.delete('/tutor/certificates/:certId',
  protect,
  deleteCertificate
);

router.delete('/tutor/documents/:docId',
  protect,
  deleteDocument
);

// ======================
// ADMIN DOCUMENT MANAGEMENT
// ======================
router.get('/admin/tutors/:tutorId/documents',
  protect,
  authorize('admin'),
  getTutorDocumentsAdmin
);

export default router;
