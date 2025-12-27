import Tutor from '../models/Tutor.js';
import User from '../models/User.js';
import { getFileUrl } from '../middlewares/uploadMiddleware.js';

/* =========================
   Helper: Standard Response
========================= */
const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/* =========================
   Upload Profile Image
========================= */
// POST /api/upload/profile
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) return sendResponse(res, 400, false, 'No image uploaded');

    const user = await User.findById(req.user._id);
    if (!user) return sendResponse(res, 404, false, 'User not found');

    user.profileImage = getFileUrl(req.file);
    await user.save();

    sendResponse(res, 200, true, 'Profile image updated successfully', {
      profileImage: user.profileImage
    });

  } catch (error) {
    console.error('Upload Profile Error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') return sendResponse(res, 400, false, 'File too large. Max 5MB');
    sendResponse(res, 500, false, 'Error uploading profile image');
  }
};

/* =========================
   Upload Tutor Certificates
========================= */
// POST /api/upload/tutor/certificates
export const uploadTutorCertificates = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return sendResponse(res, 400, false, 'No files uploaded');

    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor) return sendResponse(res, 404, false, 'Tutor profile not found');

    const uploadedFiles = [];

    for (const file of req.files) {
      const certificate = {
        name: req.body.certificateName || 'Certificate',
        issuingOrganization: req.body.issuingOrganization || 'Unknown',
        issueDate: req.body.issueDate ? new Date(req.body.issueDate) : new Date(),
        certificateFile: {
          url: getFileUrl(file),
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date()
        }
      };

      tutor.certifications.push(certificate);
      uploadedFiles.push(certificate);
    }

    await tutor.save();

    sendResponse(res, 201, true, 'Certificates uploaded successfully', {
      files: uploadedFiles,
      totalCertificates: tutor.certifications.length
    });

  } catch (error) {
    console.error('Upload Certificates Error:', error);
    sendResponse(res, 500, false, 'Error uploading certificates');
  }
};

/* =========================
   Upload Tutor Documents
========================= */
// POST /api/upload/tutor/documents
export const uploadTutorDocuments = async (req, res) => {
  try {
    const { documentType } = req.body;

    if (!req.files || req.files.length === 0) return sendResponse(res, 400, false, 'No files uploaded');
    if (!documentType) return sendResponse(res, 400, false, 'Document type is required');

    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor) return sendResponse(res, 404, false, 'Tutor profile not found');

    const uploadedFiles = [];

    for (const file of req.files) {
      const document = {
        documentType,
        file: {
          url: getFileUrl(file),
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype
        },
        status: 'pending',
        uploadedAt: new Date()
      };

      if (!tutor.verificationDocuments) tutor.verificationDocuments = [];
      tutor.verificationDocuments.push(document);
      uploadedFiles.push(document);
    }

    await tutor.save();

    sendResponse(res, 201, true, 'Documents uploaded successfully', {
      files: uploadedFiles,
      totalDocuments: tutor.verificationDocuments.length
    });

  } catch (error) {
    console.error('Upload Documents Error:', error);
    sendResponse(res, 500, false, 'Error uploading documents');
  }
};

/* =========================
   Get Tutor Documents
========================= */
// GET /api/upload/tutor/documents
export const getTutorDocuments = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor) return sendResponse(res, 404, false, 'Tutor profile not found');

    sendResponse(res, 200, true, 'Documents retrieved successfully', {
      certifications: tutor.certifications || [],
      verificationDocuments: tutor.verificationDocuments || []
    });

  } catch (error) {
    console.error('Get Tutor Documents Error:', error);
    sendResponse(res, 500, false, 'Error retrieving documents');
  }
};

/* =========================
   Delete Certificate
========================= */
// DELETE /api/upload/tutor/certificates/:certId
export const deleteCertificate = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor) return sendResponse(res, 404, false, 'Tutor profile not found');

    tutor.certifications = tutor.certifications.filter(cert => cert._id.toString() !== req.params.certId);
    await tutor.save();

    sendResponse(res, 200, true, 'Certificate deleted successfully');

  } catch (error) {
    console.error('Delete Certificate Error:', error);
    sendResponse(res, 500, false, 'Error deleting certificate');
  }
};

/* =========================
   Delete Verification Document
========================= */
// DELETE /api/upload/tutor/documents/:docId
export const deleteDocument = async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ userId: req.user._id });
    if (!tutor) return sendResponse(res, 404, false, 'Tutor profile not found');

    tutor.verificationDocuments = tutor.verificationDocuments.filter(doc => doc._id.toString() !== req.params.docId);
    await tutor.save();

    sendResponse(res, 200, true, 'Document deleted successfully');

  } catch (error) {
    console.error('Delete Document Error:', error);
    sendResponse(res, 500, false, 'Error deleting document');
  }
};

/* =========================
   Admin: View Tutor Documents
========================= */
// GET /api/upload/admin/tutors/:tutorId/documents
export const getTutorDocumentsAdmin = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.tutorId).populate('userId', 'fullName email');
    if (!tutor) return sendResponse(res, 404, false, 'Tutor not found');

    sendResponse(res, 200, true, 'Tutor documents retrieved', {
      tutor: {
        id: tutor._id,
        name: tutor.userId.fullName,
        email: tutor.userId.email
      },
      certifications: tutor.certifications || [],
      verificationDocuments: tutor.verificationDocuments || []
    });

  } catch (error) {
    console.error('Admin Get Tutor Documents Error:', error);
    sendResponse(res, 500, false, 'Error retrieving tutor documents');
  }
};
