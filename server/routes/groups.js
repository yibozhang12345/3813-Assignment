const express = require('express');
const dataStore = require('../models/mongoDataStore');

const router = express.Router();

function hasPermission(user, group, action) {
  switch (action) {
    case 'manage':
      if (user.roles.includes('super-admin')) return true;

      // Check if user is a group admin (considering populated object format)
      return group.adminIds.some(admin => {
        const adminId = admin._id ? admin._id.toString() : admin.toString();
        return adminId === user.id.toString();
      });

    case 'view':
      if (user.roles.includes('super-admin')) return true;

      // Check if user is a group member or admin (considering populated object format)
      const isMember = group.memberIds.some(member => {
        const memberId = member._id ? member._id.toString() : member.toString();
        return memberId === user.id.toString();
      });

      const isAdmin = group.adminIds.some(admin => {
        const adminId = admin._id ? admin._id.toString() : admin.toString();
        return adminId === user.id.toString();
      });

      return isMember || isAdmin;

    default:
      return false;
  }
}

// STATIC ROUTES FIRST (no parameters)

/**
 * Get groups available for application (groups the user has not joined)
 * Returns a list of groups the user can apply to join.
 */
router.get('/available', async (req, res) => {
  try {
    const availableGroups = await dataStore.getAvailableGroups(req.user.id);

    res.json({
      success: true,
      groups: availableGroups
    });
  } catch (error) {
    console.error('Get available groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * Get all pending group join applications (super admin only)
 * Returns all pending applications for group membership.
 */
router.get('/applications', async (req, res) => {
  try {
    if (!req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions, super admin required'
      });
    }

    const applications = await dataStore.getPendingApplications();

    res.json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Get all applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * Review a group join application (approve or reject)
 * @param {string} applicationId - The application ID
 * @param {string} action - 'approve' or 'reject'
 * @param {string} message - Optional review message
 */
router.post('/applications/:applicationId/review', async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { action, message = '' } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }

    const reviewedApplication = await dataStore.reviewGroupApplication(applicationId, {
      action,
      message,
      reviewedBy: req.user.id
    });

    res.json({
      success: true,
      message: action === 'approve' ? 'Application approved' : 'Application rejected',
      application: reviewedApplication
    });
  } catch (error) {
    if (error.message === 'Application does not exist' || error.message === 'Application already processed') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Review application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * Get all groups (admin use)
 * Super admin can see all groups, other admins see only their managed/joined groups.
 */
router.get('/all', async (req, res) => {
  try {
    if (!req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const allGroups = await dataStore.getGroups();
    let userGroups = [];

    // Super admin sees all groups, others see only their managed/joined groups
    if (req.user.roles.includes('super-admin')) {
      userGroups = allGroups;
    } else {
      userGroups = allGroups.filter(group => {
        // Check if user is a member or admin of the group
        const isMember = group.memberIds.some(member => {
          const memberId = member._id ? member._id.toString() : member.toString();
          return memberId === req.user.id.toString();
        });

        const isAdmin = group.adminIds.some(admin => {
          const adminId = admin._id ? admin._id.toString() : admin.toString();
          return adminId === req.user.id.toString();
        });

        return isMember || isAdmin;
      });
    }

    // Add channels info to each group
    const groupsWithChannels = await Promise.all(
      userGroups.map(async (group) => {
        const channels = await dataStore.getGroupChannels(group._id.toString());
        return {
          ...group.toObject(),
          channels: channels
        };
      })
    );

    res.json({
      success: true,
      groups: groupsWithChannels
    });

  } catch (error) {
    console.error('Get all groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * Get groups for the current user
 * Super admin sees all groups, others see only their managed/joined groups.
 */
router.get('/', async (req, res) => {
  try {
    const allGroups = await dataStore.getGroups();
    let userGroups = [];

    if (req.user.roles.includes('super-admin')) {
      userGroups = allGroups;
    } else {
      userGroups = allGroups.filter(group => {
        // Check if user is a member or admin of the group
        const isMember = group.memberIds.some(member => {
          const memberId = member._id ? member._id.toString() : member.toString();
          return memberId === req.user.id.toString();
        });

        const isAdmin = group.adminIds.some(admin => {
          const adminId = admin._id ? admin._id.toString() : admin.toString();
          return adminId === req.user.id.toString();
        });

        return isMember || isAdmin;
      });
    }

    // Add channels info to each group
    const groupsWithChannels = await Promise.all(
      userGroups.map(async (group) => {
        const channels = await dataStore.getGroupChannels(group._id.toString());
        return {
          ...group.toObject(),
          channels: channels
        };
      })
    );

    res.json({
      success: true,
      groups: groupsWithChannels
    });

  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * Create a new group
 * Only group-admin or super-admin can create groups.
 */
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Group name cannot be empty'
      });
    }

    if (!req.user.roles.includes('group-admin') && !req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions, group admin required'
      });
    }

    const newGroup = await dataStore.addGroup({
      name,
      description,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      group: newGroup
    });

  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// PARAMETERIZED ROUTES AFTER STATIC ROUTES

/**
 * Get single group information
 * Returns detailed information about a specific group including its channels.
 */
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!hasPermission(req.user, group, 'view')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    // Get group's channels
    const channels = await dataStore.getGroupChannels(groupId);

    res.json({
      success: true,
      group: {
        ...group.toObject(),
        channels: channels
      }
    });

  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * Delete group
 * Removes a group from the system. Only super admins or group creators can delete groups.
 */
router.delete('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Permission check: Super admins can delete all groups, group admins can only delete groups they created
    const isSuperAdmin = req.user.roles.includes('super-admin');
    const isCreator = group.createdBy.toString() === req.user.id.toString();

    if (!isSuperAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions, only super admin or group creator can delete groups'
      });
    }

    const success = await dataStore.deleteGroup(groupId);

    if (success) {
      res.json({
        success: true,
        message: 'Group deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete group'
      });
    }

  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * Apply to join group
 * Submits an application to join a specific group.
 */
router.post('/:groupId/apply', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message = '' } = req.body;

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is already a member (considering populated object format)
    const isMember = group.memberIds.some(member => {
      const memberId = member._id ? member._id.toString() : member.toString();
      return memberId === req.user.id.toString();
    });

    const isAdmin = group.adminIds.some(admin => {
      const adminId = admin._id ? admin._id.toString() : admin.toString();
      return adminId === req.user.id.toString();
    });

    if (isMember || isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this group'
      });
    }

    const application = await dataStore.createGroupApplication({
      groupId,
      userId: req.user.id,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted, waiting for admin review',
      application
    });
  } catch (error) {
    if (error.message === '已有待审核的申请') {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending application'
      });
    }

    console.error('Apply to group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * Get group's pending applications (for admins)
 * Returns all pending applications for a specific group.
 */
router.get('/:groupId/applications', async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!hasPermission(req.user, group, 'manage')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const applications = await dataStore.getPendingApplications(groupId);

    res.json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Get group applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * Get group channels list
 * Returns all channels for a specific group.
 */
router.get('/:groupId/channels', async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!hasPermission(req.user, group, 'view')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const channels = await dataStore.getGroupChannels(groupId);
    res.json(channels);

  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * Create channel
 * Creates a new channel within a group.
 */
router.post('/:groupId/channels', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '频道名称不能为空'
      });
    }

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!hasPermission(req.user, group, 'manage')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const newChannel = await dataStore.addChannelToGroup(groupId, {
      name,
      description,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      channel: newChannel
    });

  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 删除频道
router.delete('/:groupId/channels/:channelId', async (req, res) => {
  try {
    const { groupId, channelId } = req.params;

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!hasPermission(req.user, group, 'manage')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const channel = await dataStore.findChannelById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // 防止删除general频道（默认频道）
    if (channel.name === 'general') {
      return res.status(400).json({
        success: false,
        message: '不能删除默认频道'
      });
    }

    const success = await dataStore.deleteChannel(channelId);

    if (success) {
      res.json({
        success: true,
        message: '频道已删除'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to delete channel'
      });
    }

  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 添加成员到频道
router.post('/:groupId/channels/:channelId/members', async (req, res) => {
  try {
    const { groupId, channelId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID cannot be empty'
      });
    }

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!hasPermission(req.user, group, 'manage')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const channel = await dataStore.findChannelById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    const user = await dataStore.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already in the channel
    const isAlreadyMember = channel.memberIds.some(memberId => {
      const id = memberId._id ? memberId._id.toString() : memberId.toString();
      return id === userId.toString();
    });

    if (isAlreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already in the channel'
      });
    }

    // 添加成员到频道
    const success = await channel.addMember(userId);

    if (success) {
      res.json({
        success: true,
        message: 'User added to channel successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to add user'
      });
    }

  } catch (error) {
    console.error('Add user to channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 从频道移除成员
router.delete('/:groupId/channels/:channelId/members/:userId', async (req, res) => {
  try {
    const { groupId, channelId, userId } = req.params;

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!hasPermission(req.user, group, 'manage')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const channel = await dataStore.findChannelById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // Check if user is in the channel
    const isMember = channel.memberIds.some(memberId => {
      const id = memberId._id ? memberId._id.toString() : memberId.toString();
      return id === userId.toString();
    });

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: 'User is not in the channel'
      });
    }

    // 从频道移除成员
    const success = await channel.removeMember(userId);

    if (success) {
      res.json({
        success: true,
        message: 'User removed from channel successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to remove user'
      });
    }

  } catch (error) {
    console.error('Remove user from channel error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**\\n * Add member to group\\n * Adds a user as a member to a specific group.\\n */
router.post('/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID cannot be empty'
      });
    }

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!hasPermission(req.user, group, 'manage')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const user = await dataStore.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const success = await dataStore.addUserToGroup(groupId, userId);

    if (success) {
      res.json({
        success: true,
        message: 'User added to group successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to add user'
      });
    }

  } catch (error) {
    console.error('Add user to group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**\\n * Remove member from group\\n * Removes a user from a specific group.\\n */
router.delete('/:groupId/members/:userId', async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!hasPermission(req.user, group, 'manage')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const success = await dataStore.removeUserFromGroup(groupId, userId);

    if (success) {
      res.json({
        success: true,
        message: 'User removed from group successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to remove user'
      });
    }

  } catch (error) {
    console.error('Remove user from group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**\\n * Promote member to group admin (super admin only)\\n * Promotes a group member to administrator role.\\n */
router.put('/:groupId/members/:userId/promote', async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    // Check permissions: Only super admin can promote group administrators
    if (!req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions, only super admin can promote group administrators'
      });
    }

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const user = await dataStore.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a group administrator
    const isAlreadyAdmin = group.adminIds.some(adminId => {
      const id = adminId._id ? adminId._id.toString() : adminId.toString();
      return id === userId.toString();
    });

    if (isAlreadyAdmin) {
      return res.status(400).json({
        success: false,
        message: 'This user is already a group administrator'
      });
    }

    // Check if user is a group member
    const isMember = group.memberIds.some(memberId => {
      const id = memberId._id ? memberId._id.toString() : memberId.toString();
      return id === userId.toString();
    });

    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: 'User must be a group member first before being promoted to administrator'
      });
    }

    // Promote user to group administrator
    const success = await dataStore.promoteUserToGroupAdmin(groupId, userId);

    if (success) {
      res.json({
        success: true,
        message: '用户已成功提升为群组管理员'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '提升用户失败'
      });
    }

  } catch (error) {
    console.error('Promote user to group admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 撤销群组管理员权限（仅限超级管理员）
router.put('/:groupId/members/:userId/demote', async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    // 检查权限：只有超级管理员可以撤销群组管理员权限
    if (!req.user.roles.includes('super-admin')) {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有超级管理员可以撤销群组管理员权限'
      });
    }

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const user = await dataStore.findUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // 检查用户是否是群组管理员
    const isAdmin = group.adminIds.some(adminId => {
      const id = adminId._id ? adminId._id.toString() : adminId.toString();
      return id === userId.toString();
    });

    if (!isAdmin) {
      return res.status(400).json({
        success: false,
        message: '该用户不是群组管理员'
      });
    }

    // 撤销群组管理员权限
    const success = await dataStore.demoteUserFromGroupAdmin(groupId, userId);

    if (success) {
      res.json({
        success: true,
        message: '用户的群组管理员权限已被撤销'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '撤销权限失败'
      });
    }

  } catch (error) {
    console.error('Demote user from group admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 获取频道消息
router.get('/:groupId/channels/:channelId/messages', async (req, res) => {
  try {
    const { groupId, channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!hasPermission(req.user, group, 'view')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const channel = await dataStore.findChannelById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // 检查用户是否是频道成员（考虑populate后的对象格式）
    if (!req.user.roles.includes('super-admin')) {
      const isMember = channel.memberIds.some(member => {
        const memberId = member._id ? member._id.toString() : member.toString();
        return memberId === req.user.id.toString();
      });

      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: '您不是该频道的成员'
        });
      }
    }

    const messages = await dataStore.getChannelMessages(channelId, { limit });

    res.json({
      success: true,
      messages: messages
    });

  } catch (error) {
    console.error('Get channel messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// 发送消息
router.post('/:groupId/channels/:channelId/messages', async (req, res) => {
  try {
    const { groupId, channelId } = req.params;
    const { content, type = 'text', fileUrl, fileName, fileSize, mimeType } = req.body;

    // 调试日志
    console.log('Received message data:', { content, type, fileUrl, fileName, fileSize, mimeType });

    // 对于非文本消息类型，内容可以为空
    if (type === 'text' && (!content || content.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: '消息内容不能为空'
      });
    }

    // 对于图片、文件、视频类型，需要fileUrl
    if (['image', 'file', 'video'].includes(type) && !fileUrl) {
      return res.status(400).json({
        success: false,
        message: '文件URL不能为空'
      });
    }

    const group = await dataStore.findGroupById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const channel = await dataStore.findChannelById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    // 检查用户是否是频道成员（考虑populate后的对象格式）
    if (!req.user.roles.includes('super-admin')) {
      const isMember = channel.memberIds.some(member => {
        const memberId = member._id ? member._id.toString() : member.toString();
        return memberId === req.user.id.toString();
      });

      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: '您不是该频道的成员'
        });
      }
    }

    // 准备消息数据，包含图片相关字段（如果存在）
    const messageData = {
      content,
      senderId: req.user.id,
      senderUsername: req.user.username,
      channelId,
      type
    };

    // 如果是图片、文件或视频类型，添加相关字段
    if (['image', 'file', 'video'].includes(type)) {
      if (fileUrl) messageData.fileUrl = fileUrl;
      if (fileName) messageData.fileName = fileName;
      if (fileSize) messageData.fileSize = fileSize;
      if (mimeType) messageData.mimeType = mimeType;
    }

    const message = await dataStore.addMessage(messageData);

    res.status(201).json({
      success: true,
      message: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
