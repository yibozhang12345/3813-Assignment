// server/routes/groups.js
// 群组管理路由 / Group management routes
const express = require('express');
const Group = require('../models/Group');
const User = require('../models/User');
const { verifyToken, requireRole, requireGroupPermission } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证 / All routes require authentication
router.use(verifyToken);

/**
 * 创建群组 / Create group
 * POST /api/groups
 */
router.post('/', requireRole(['super', 'groupAdmin']), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required / 群组名称为必填项',
        code: 'MISSING_GROUP_NAME'
      });
    }

    const group = await Group.create({
      name: name.trim(),
      description: description?.trim() || '',
      ownerId: req.userId
    });

    res.status(201).json({
      success: true,
      message: 'Group created successfully / 群组创建成功',
      data: {
        group: group.toJSON()
      }
    });

  } catch (error) {
    console.error('Create group error:', error);

    if (error.message.includes('Group name already exists') || error.message.includes('群组名已存在')) {
      return res.status(409).json({
        success: false,
        message: 'Group name already exists / 群组名已存在',
        code: 'GROUP_NAME_EXISTS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create group / 创建群组失败',
      code: 'CREATE_GROUP_FAILED'
    });
  }
});

/**
 * 获取用户的群组列表 / Get user's groups
 * GET /api/groups
 */
router.get('/', async (req, res) => {
  try {
    const groups = await Group.findByUserId(req.userId);

    res.json({
      success: true,
      message: 'Groups retrieved successfully / 获取群组列表成功',
      data: {
        groups: groups.map(group => group.toJSON())
      }
    });

  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get groups / 获取群组列表失败',
      code: 'GET_GROUPS_FAILED'
    });
  }
});

module.exports = router;