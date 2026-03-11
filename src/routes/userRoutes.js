// src/routes/userRoutes.js
import express from 'express';
import { checkProfile, getProfile, updateProfile } from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';
import {
  getPreferences, updatePreferences } from '../controllers/preferenceController.js';


const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/profile/check', checkProfile);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/preferences', protect, getPreferences);
router.put('/preferences', protect, updatePreferences);

export default router;