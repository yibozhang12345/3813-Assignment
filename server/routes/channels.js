// server/routes/channels.js
// 频道管理路由 / Channel management routes
const express = require('express');
const Channel = require('../models/Channel');
const Group = require('../models/Group');
const { verifyToken, requireGroupPermission } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证 / All routes require authentication
router.use(verifyToken);

/**
 * 创建频道 / Create channel
 * POST /api/channels
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, groupId } = req.body;

    if (!name?.trim() || !groupId) {
      return res.status(400).json({
        success: false,
        message: 'Channel name and group ID are required / 频道名称和群组ID为必填项',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 验证群组权限 / Verify group permission
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found / 群组不存在',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // 检查用户是否是群组管理员 / Check if user is group admin
    const isAdmin = group.isAdmin(req.userId) || group.isOwner(req.userId) || req.user.roles.includes('super');
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can create channels / 只有群组管理员可以创建频道',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const channel = await Channel.create({
      name: name.trim(),
      description: description?.trim() || '',
      groupId,
      memberIds: group.memberIds // 默认群组成员都可以访问频道 / Default all group members can access channel
    });

    res.status(201).json({
      success: true,
      message: 'Channel created successfully / 频道创建成功',
      data: {
        channel: channel.toJSON()
      }
    });

  } catch (error) {
    console.error('Create channel error:', error);

    if (error.message.includes('Channel name already exists') || error.message.includes('频道名已存在')) {
      return res.status(409).json({
        success: false,
        message: 'Channel name already exists in this group / 该群组下频道名已存在',
        code: 'CHANNEL_NAME_EXISTS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create channel / 创建频道失败',
      code: 'CREATE_CHANNEL_FAILED'
    });
  }
});

/**
 * 获取群组下的频道列表 / Get channels in a group
 * GET /api/channels?groupId=xxx
 */
router.get('/', async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required / 群组ID为必填项',
        code: 'MISSING_GROUP_ID'
      });
    }

    // 验证用户是否是群组成员 / Verify user is group member
    const group = await Group.findById(groupId);
    if (!group || !group.isMember(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'No access to this group / 无权限访问该群组',
        code: 'GROUP_ACCESS_DENIED'
      });
    }

    const channels = await Channel.findByGroupId(groupId);

    // 只返回用户有权限访问的频道 / Only return channels user has access to
    const accessibleChannels = channels.filter(channel => channel.isMember(req.userId));

    res.json({
      success: true,
      message: 'Channels retrieved successfully / 获取频道列表成功',
      data: {
        channels: accessibleChannels.map(channel => channel.toJSON())
      }
    });

  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get channels / 获取频道列表失败',
      code: 'GET_CHANNELS_FAILED'
    });
  }
});

/**
 * 获取频道详情 / Get channel details
 * GET /api/channels/:channelId
 */
router.get('/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found / 频道不存在',
        code: 'CHANNEL_NOT_FOUND'
      });
    }

    // 检查用户是否有权限访问该频道 / Check if user has permission to access channel
    if (!channel.isMember(req.userId)) {
      return res.status(403).json({
        success: false,
        message: 'No permission to access this channel / 无权限访问该频道',
        code: 'CHANNEL_ACCESS_DENIED'
      });
    }

    res.json({
      success: true,
      message: 'Channel details retrieved successfully / 获取频道详情成功',
      data: {
        channel: channel.toJSON()
      }
    });

  } catch (error) {
    console.error('Get channel details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get channel details / 获取频道详情失败',
      code: 'GET_CHANNEL_DETAILS_FAILED'
    });
  }
});

module.exports = router;