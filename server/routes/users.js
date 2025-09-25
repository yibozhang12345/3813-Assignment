// server/routes/users.js
// 用户管理路由 / User management routes
const express = require('express');
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证 / All routes require authentication
router.use(verifyToken);

/**
 * 获取所有用户 (仅超级管理员) / Get all users (super admin only)
 * GET /api/users
 */
router.get('/', requireRole('super'), async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (search) {
      filter = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.findAll(filter, { skip: parseInt(skip), limit: parseInt(limit) });

    res.json({
      success: true,
      message: 'Users retrieved successfully / 获取用户列表成功',
      data: {
        users: users.map(user => user.toSafeJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: users.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users / 获取用户列表失败',
      code: 'GET_USERS_FAILED'
    });
  }
});

/**
 * 获取用户详情 / Get user details
 * GET /api/users/:userId
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    // 用户只能查看自己的详细信息，除非是管理员 / Users can only view their own details unless they are admin
    if (userId !== currentUser._id.toString() && !currentUser.roles.includes('super')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied / 权限不足',
        code: 'PERMISSION_DENIED'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found / 用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'User details retrieved successfully / 获取用户详情成功',
      data: {
        user: user.toSafeJSON()
      }
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user details / 获取用户详情失败',
      code: 'GET_USER_DETAILS_FAILED'
    });
  }
});

/**
 * 更新用户信息 / Update user info
 * PUT /api/users/:userId
 */
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email } = req.body;
    const currentUser = req.user;

    // 用户只能更新自己的信息，除非是管理员 / Users can only update their own info unless they are admin
    if (userId !== currentUser._id.toString() && !currentUser.roles.includes('super')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied / 权限不足',
        code: 'PERMISSION_DENIED'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found / 用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    const updateData = {};

    if (username !== undefined) {
      updateData.username = username?.trim();
    }

    if (email !== undefined) {
      // 验证邮箱格式 / Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format / 邮箱格式无效',
          code: 'INVALID_EMAIL'
        });
      }
      updateData.email = email.toLowerCase().trim();
    }

    await user.update(updateData);

    res.json({
      success: true,
      message: 'User updated successfully / 用户信息更新成功',
      data: {
        user: user.toSafeJSON()
      }
    });

  } catch (error) {
    console.error('Update user error:', error);

    if (error.message.includes('Email already exists') || error.message.includes('邮箱已存在')) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists / 邮箱已存在',
        code: 'EMAIL_EXISTS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update user / 更新用户信息失败',
      code: 'UPDATE_USER_FAILED'
    });
  }
});

/**
 * 删除用户 (仅超级管理员) / Delete user (super admin only)
 * DELETE /api/users/:userId
 */
router.delete('/:userId', requireRole('super'), async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    // 不能删除自己 / Cannot delete yourself
    if (userId === currentUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete yourself / 不能删除自己',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found / 用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    await user.delete();

    res.json({
      success: true,
      message: 'User deleted successfully / 用户删除成功'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user / 删除用户失败',
      code: 'DELETE_USER_FAILED'
    });
  }
});

module.exports = router;