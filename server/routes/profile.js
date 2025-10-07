const express = require('express');
// 引入multer中间件用于文件上传
// Import multer middleware for file uploads
const multer = require('multer');
// 引入path模块用于路径操作
// Import path module for path operations
const path = require('path');
// 引入fs模块用于文件系统操作
// Import fs module for file system operations
const fs = require('fs');
// 引入认证中间件
// Import authentication middleware
const { authenticateToken } = require('../middleware/auth');
// 引入数据存储模块
// Import data store module
const dataStore = require('../models/mongoDataStore');

const router = express.Router();

// Configure multer for avatar uploads
// 配置multer用于头像上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/avatars');
    // Ensure directory exists
    // 确保目录存在
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Only accept image files
  // 只接受图片文件
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
    // 5MB大小限制
  }
});

// Apply authentication to all routes
// 为所有路由应用认证中间件
router.use(authenticateToken);

/**
 * Get current user profile
 * Returns the profile information of the authenticated user.
 * 获取当前用户资料
 * 返回已认证用户的资料信息。
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
 * 更新用户资料
 * 更新已认证用户的用户名和/或邮箱。
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
      // Handle duplicate key error (unique constraint violation)
      // 处理重复键错误（唯一约束违反）
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
 * 上传头像
 * 为已认证用户上传新的头像图片。
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
    // 获取当前用户以删除旧头像
    const currentUser = await dataStore.findUserById(req.user.id);
    if (currentUser && currentUser.avatar) {
      // Delete old avatar file
      // 删除旧头像文件
      const oldAvatarPath = path.join(__dirname, '../uploads/avatars', path.basename(currentUser.avatar));
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Update user with new avatar path
    // 使用新头像路径更新用户
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
        // 文件大小不能超过5MB
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
 * 删除头像
 * 移除已认证用户的头像图片。
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
    // 删除头像文件
    const avatarPath = path.join(__dirname, '../uploads/avatars', path.basename(currentUser.avatar));
    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }

    // Remove avatar from user
    // 从用户资料中移除头像
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