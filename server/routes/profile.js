const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const dataStore = require('../models/mongoDataStore');

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/avatars');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Only accept image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Get current user profile
 * Returns the profile information of the authenticated user.
 */
router.get('/me', async (req, res) => {
  try {
    const user = await dataStore.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Failed to get user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * Update user profile
 * Updates the username and/or email of the authenticated user.
 */
router.put('/me', async (req, res) => {
  try {
    const { username, email } = req.body;
    const updates = {};

    if (username && username.trim()) {
      updates.username = username.trim();
    }
    if (email && email.trim()) {
      updates.email = email.trim().toLowerCase();
    }

    const updatedUser = await dataStore.updateUser(req.user.id, updates);
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Failed to update user profile:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'username' ? 'Username' : 'Email'} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * Upload avatar
 * Uploads a new avatar image for the authenticated user.
 */
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an avatar file to upload'
      });
    }

    // Get current user to delete old avatar
    const currentUser = await dataStore.findUserById(req.user.id);
    if (currentUser && currentUser.avatar) {
      // Delete old avatar file
      const oldAvatarPath = path.join(__dirname, '../uploads/avatars', path.basename(currentUser.avatar));
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update user with new avatar path
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const updatedUser = await dataStore.updateUser(req.user.id, { avatar: avatarUrl });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatar: avatarUrl,
      user: updatedUser
    });
  } catch (error) {
    console.error('Failed to upload avatar:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size cannot exceed 5MB'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

/**
 * Delete avatar
 * Removes the avatar image of the authenticated user.
 */
router.delete('/avatar', async (req, res) => {
  try {
    const currentUser = await dataStore.findUserById(req.user.id);
    if (!currentUser || !currentUser.avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found'
      });
    }

    // Delete avatar file
    const avatarPath = path.join(__dirname, '../uploads/avatars', path.basename(currentUser.avatar));
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }

    // Remove avatar from user
    const updatedUser = await dataStore.updateUser(req.user.id, { avatar: null });

    res.json({
      success: true,
      message: 'Avatar deleted successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Failed to delete avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;