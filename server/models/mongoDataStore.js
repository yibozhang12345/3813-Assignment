const User = require('./mongodb/User');
const Group = require('./mongodb/Group');
const Channel = require('./mongodb/Channel');
const Message = require('./mongodb/Message');
const GroupApplication = require('./mongodb/GroupApplication');
const mongoose = require('mongoose');

// MongoDB数据存储类
// 提供对用户、群组、频道、消息等数据的管理操作
class MongoDataStore {
  // 构造函数：在初始化时确保默认超级管理员存在
  constructor() {
    // Ensure default super admin exists during initialization
    // 初始化时确保默认超级管理员存在
    this.initializeDefaultUser();
  }

  /**
   * Initialize default user
   * Creates a default super admin user if it doesn't exist.
   * 初始化默认用户
   * 如果不存在，则创建一个默认的超级管理员用户。
   */
  async initializeDefaultUser() {
    try {
      const existingSuperAdmin = await User.findOne({ username: 'super' });
      if (!existingSuperAdmin) {
        const superAdmin = new User({
          username: 'super',
          email: 'super@admin.com',
          password: '123456',
          roles: ['super-admin']
        });
        await superAdmin.save();
        console.log('✅ Default super admin created (username: super, password: 123456)');
      }
    } catch (error) {
      console.error('❌ Failed to create default user:', error);
    }
  }

  // User management methods
  // 用户管理方法

  /**
   * Get all users
   * Returns a list of all users without passwords.
   * 获取所有用户
   * 返回所有用户列表，不包含密码。
   */
  async getUsers() {
    try {
      return await User.find().select('-password');
    } catch (error) {
      console.error('Failed to get user list:', error);
      throw error;
    }
  }

  /**
   * Add new user
   * Creates a new user with the provided data.
   * @param {Object} userData - User data to create
   * 添加新用户
   * 使用提供的数据创建新用户。
   * @param {Object} userData - 要创建的用户数据
   */
  async addUser(userData) {
    try {
      const user = new User(userData);
      return await user.save();
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   * @param {string} username - Username to search for
   * 根据用户名查找用户
   * @param {string} username - 要搜索的用户名
   */
  async findUserByUsername(username) {
    try {
      return await User.findOne({ username });
    } catch (error) {
      console.error('Failed to find user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {string} id - User ID to search for
   * 根据ID查找用户
   * @param {string} id - 要搜索的用户ID
   */
  async findUserById(id) {
    try {
      return await User.findById(id).select('-password');
    } catch (error) {
      console.error('Failed to find user by ID:', error);
      throw error;
    }
  }

  /**
   * Update user
   * Updates user information and sets updated timestamp.
   * @param {string} userId - User ID to update
   * @param {Object} updates - Fields to update
   * 更新用户
   * 更新用户信息并设置更新时间戳。
   * @param {string} userId - 要更新的用户ID
   * @param {Object} updates - 要更新的字段
   */
  async updateUser(userId, updates) {
    try {
      return await User.findByIdAndUpdate(
        userId,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-password');
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   * Removes a user and cleans up all related data.
   * @param {string} userId - User ID to delete
   * 删除用户
   * 移除用户并清理所有相关数据。
   * @param {string} userId - 要删除的用户ID
   */
  async deleteUser(userId) {
    try {
      const result = await User.findByIdAndDelete(userId);
      if (result) {
        // Remove user from all groups
        // 从所有群组中移除用户
        await Group.updateMany(
          {},
          {
            $pull: {
              memberIds: userId,
              adminIds: userId
            }
          }
        );

        // Remove user from all channels
        // 从所有频道中移除用户
        await Channel.updateMany(
          {},
          { $pull: { memberIds: userId } }
        );

        // Delete all group applications for this user
        // 删除此用户的所有群组申请
        await GroupApplication.deleteMany({ userId: userId });

        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }

  // Group management methods
  // 群组管理方法

  /**
   * Get all groups
   * Returns all groups with populated admin and member information.
   * 获取所有群组
   * 返回所有群组，并填充管理员和成员信息。
   */
  async getGroups() {
    try {
      return await Group.find()
        .populate('adminIds', 'username email avatar')
        .populate('memberIds', 'username email avatar')
        .populate('createdBy', 'username email');
    } catch (error) {
      console.error('Failed to get group list:', error);
      throw error;
    }
  }

  /**
   * Get user's groups
   * Returns all groups where the user is a member or admin.
   * @param {string} userId - User ID
   * 获取用户的群组
   * 返回用户作为成员或管理员的所有群组。
   * @param {string} userId - 用户ID
   */
  async getUserGroups(userId) {
    try {
      return await Group.getUserGroups(userId);
    } catch (error) {
      console.error('Failed to get user groups:', error);
      throw error;
    }
  }

  /**
   * Add new group
   * Creates a new group and automatically adds creator as admin and member.
   * @param {Object} groupData - Group data to create
   * 添加新群组
   * 创建新群组，并自动将创建者添加为管理员和成员。
   * @param {Object} groupData - 要创建的群组数据
   */
  async addGroup(groupData) {
    try {
      const group = new Group(groupData);

      // Creator automatically becomes admin and member
      // 创建者自动成为管理员和成员
      if (!group.adminIds.includes(groupData.createdBy)) {
        group.adminIds.push(groupData.createdBy);
      }
      if (!group.memberIds.includes(groupData.createdBy)) {
        group.memberIds.push(groupData.createdBy);
      }

      const savedGroup = await group.save();

      // Create default 'general' channel
      // 创建默认的'general'频道
      const defaultChannel = new Channel({
        name: 'general',
        description: 'Default channel',
        groupId: savedGroup._id,
        memberIds: [...savedGroup.memberIds],
        createdBy: groupData.createdBy
      });

      await defaultChannel.save();

      return await Group.findById(savedGroup._id)
        .populate('adminIds', 'username email avatar')
        .populate('memberIds', 'username email avatar');
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  }

  /**
   * Find group by ID
   * @param {string} id - Group ID to search for
   * 根据ID查找群组
   * @param {string} id - 要搜索的群组ID
   */
  async findGroupById(id) {
    try {
      return await Group.findById(id)
        .populate('adminIds', 'username email avatar')
        .populate('memberIds', 'username email avatar');
    } catch (error) {
      console.error('Failed to find group:', error);
      throw error;
    }
  }

  /**
   * Update group
   * Updates group information and sets updated timestamp.
   * @param {string} groupId - Group ID to update
   * @param {Object} updates - Fields to update
   * 更新群组
   * 更新群组信息并设置更新时间戳。
   * @param {string} groupId - 要更新的群组ID
   * @param {Object} updates - 要更新的字段
   */
  async updateGroup(groupId, updates) {
    try {
      return await Group.findByIdAndUpdate(
        groupId,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate('adminIds memberIds', 'username email avatar');
    } catch (error) {
      console.error('Failed to update group:', error);
      throw error;
    }
  }

  /**
   * Delete group
   * Removes a group and all associated channels and messages.
   * @param {string} groupId - Group ID to delete
   * 删除群组
   * 移除群组及其所有关联的频道和消息。
   * @param {string} groupId - 要删除的群组ID
   */
  async deleteGroup(groupId) {
    try {
      // Get group information
      // 获取群组信息
      const group = await Group.findById(groupId);
      if (!group) return false;

      // Delete all channels and related messages in the group
      // 删除群组中的所有频道及相关消息
      const channels = await Channel.find({ groupId: groupId });
      for (const channel of channels) {
        // Delete all messages in the channel
        // 删除频道中的所有消息
        await Message.deleteMany({ channelId: channel._id });
      }

      // Delete all channels
      // 删除所有频道
      await Channel.deleteMany({ groupId: groupId });

      // Delete group application records
      // 删除群组申请记录
      await GroupApplication.deleteMany({ groupId: groupId });

      // Delete group
      // 删除群组
      const result = await Group.findByIdAndDelete(groupId);

      return !!result;
    } catch (error) {
      console.error('Failed to delete group:', error);
      throw error;
    }
  }

  /**
   * Add user to group
   * Adds a user as a member to a group and all its channels.
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID to add
   * 将用户添加到群组
   * 将用户作为成员添加到群组及其所有频道。
   * @param {string} groupId - 群组ID
   * @param {string} userId - 要添加的用户ID
   */
  async addUserToGroup(groupId, userId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) return false;

      const success = await group.addMember(userId);

      // Add user to all channels in the group
      // 将用户添加到群组的所有频道
      await Channel.updateMany(
        { groupId: groupId },
        { $addToSet: { memberIds: userId } }
      );

      return !!success;
    } catch (error) {
      console.error('Failed to add user to group:', error);
      throw error;
    }
  }

  /**
   * Remove user from group
   * Removes a user from a group and all its channels.
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID to remove
   * 从群组中移除用户
   * 从群组及其所有频道中移除用户。
   * @param {string} groupId - 群组ID
   * @param {string} userId - 要移除的用户ID
   */
  async removeUserFromGroup(groupId, userId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) return false;

      const success = await group.removeMember(userId);

      // Remove user from all channels in the group
      // 从群组的所有频道中移除用户
      await Channel.updateMany(
        { groupId: groupId },
        { $pull: { memberIds: userId } }
      );

      return !!success;
    } catch (error) {
      console.error('Failed to remove user from group:', error);
      throw error;
    }
  }

  /**
   * Promote user to group admin
   * Grants admin privileges to a user in a group.
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID to promote
   * 将用户提升为群组管理员
   * 授予用户在群组中的管理员权限。
   * @param {string} groupId - 群组ID
   * @param {string} userId - 要提升的用户ID
   */
  async promoteUserToGroupAdmin(groupId, userId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) return false;

      // Check if user is already an admin
      // 检查用户是否已经是管理员
      if (group.adminIds.includes(userId)) {
        return false;
      }

      // Check if user is a member
      // 检查用户是否是成员
      if (!group.memberIds.includes(userId)) {
        return false;
      }

      // Add user to admin list
      // 将用户添加到管理员列表
      group.adminIds.push(userId);
      await group.save();

      return true;
    } catch (error) {
      console.error('Failed to promote user to group admin:', error);
      throw error;
    }
  }

  /**
   * Demote user from group admin
   * Removes admin privileges from a user in a group.
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID to demote
   * 将用户从群组管理员降级
   * 移除用户在群组中的管理员权限。
   * @param {string} groupId - 群组ID
   * @param {string} userId - 要降级的用户ID
   */
  async demoteUserFromGroupAdmin(groupId, userId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) return false;

      // Check if user is an admin
      // 检查用户是否是管理员
      if (!group.adminIds.includes(userId)) {
        return false;
      }

      // Remove user from admin list (user remains a member)
      // 从管理员列表中移除用户（用户仍为成员）
      group.adminIds = group.adminIds.filter(adminId => adminId.toString() !== userId.toString());
      await group.save();

      return true;
    } catch (error) {
      console.error('Failed to demote user from group admin:', error);
      throw error;
    }
  }

  // Channel management methods
  // 频道管理方法

  /**
   * Get group channels
   * Returns all channels for a specific group.
   * @param {string} groupId - Group ID
   * 获取群组频道
   * 返回特定群组的所有频道。
   * @param {string} groupId - 群组ID
   */
  async getGroupChannels(groupId) {
    try {
      return await Channel.getGroupChannels(groupId);
    } catch (error) {
      console.error('Failed to get group channels:', error);
      throw error;
    }
  }

  /**
   * Add channel to group
   * Creates a new channel within a group.
   * @param {string} groupId - Group ID
   * @param {Object} channelData - Channel data to create
   * 向群组添加频道
   * 在群组中创建新频道。
   * @param {string} groupId - 群组ID
   * @param {Object} channelData - 要创建的频道数据
   */
  async addChannelToGroup(groupId, channelData) {
    try {
      // Get group member list
      // 获取群组成员列表
      const group = await Group.findById(groupId);
      if (!group) return null;

      const channel = new Channel({
        ...channelData,
        groupId: groupId,
        memberIds: [...group.memberIds]
      });

      return await channel.save();
    } catch (error) {
      console.error('Failed to create channel:', error);
      throw error;
    }
  }

  /**
   * Find channel by ID
   * @param {string} channelId - Channel ID to search for
   * 根据ID查找频道
   * @param {string} channelId - 要搜索的频道ID
   */
  async findChannelById(channelId) {
    try {
      return await Channel.findById(channelId)
        .populate('memberIds', 'username email avatar')
        .populate('groupId', 'name');
    } catch (error) {
      console.error('Failed to find channel:', error);
      throw error;
    }
  }

  /**
   * Delete channel
   * Removes a channel and all its messages.
   * @param {string} channelId - Channel ID to delete
   * 删除频道
   * 移除频道及其所有消息。
   * @param {string} channelId - 要删除的频道ID
   */
  async deleteChannel(channelId) {
    try {
      // Delete all messages in the channel
      // 删除频道中的所有消息
      await Message.deleteMany({ channelId: channelId });

      // Delete channel
      // 删除频道
      const result = await Channel.findByIdAndDelete(channelId);

      return !!result;
    } catch (error) {
      console.error('Failed to delete channel:', error);
      throw error;
    }
  }

  // Message management methods
  // 消息管理方法

  /**
   * Get channel messages
   * Returns messages for a specific channel with pagination options.
   * @param {string} channelId - Channel ID
   * @param {Object} options - Pagination and filtering options
   * 获取频道消息
   * 返回特定频道的消息，支持分页选项。
   * @param {string} channelId - 频道ID
   * @param {Object} options - 分页和过滤选项
   */
  async getChannelMessages(channelId, options = {}) {
    try {
      const messages = await Message.getChannelMessages(channelId, options);
      return messages.reverse(); // Return in chronological order
      // 返回按时间顺序排列的消息
    } catch (error) {
      console.error('Failed to get channel messages:', error);
      throw error;
    }
  }

  /**
   * Add message
   * Creates a new message and updates channel activity.
   * @param {Object} messageData - Message data to create
   * 添加消息
   * 创建新消息并更新频道活动时间。
   * @param {Object} messageData - 要创建的消息数据
   */
  async addMessage(messageData) {
    try {
      const message = new Message(messageData);
      const savedMessage = await message.save();

      // Update channel's last activity time
      // 更新频道的最后活动时间
      await Channel.findByIdAndUpdate(
        messageData.channelId,
        { lastActivity: new Date() }
      );

      return await Message.findById(savedMessage._id)
        .populate('senderId', 'username avatar');
    } catch (error) {
      console.error('Failed to create message:', error);
      throw error;
    }
  }

  /**
   * Update message
   * Edits the content of an existing message.
   * @param {string} messageId - Message ID to update
   * @param {string} content - New message content
   * 更新消息
   * 编辑现有消息的内容。
   * @param {string} messageId - 要更新的消息ID
   * @param {string} content - 新的消息内容
   */
  async updateMessage(messageId, content) {
    try {
      const message = await Message.findById(messageId);
      if (!message) return null;

      return await message.editMessage(content);
    } catch (error) {
      console.error('Failed to update message:', error);
      throw error;
    }
  }

  /**
   * Delete message
   * Removes a message from the database.
   * @param {string} messageId - Message ID to delete
   * 删除消息
   * 从数据库中移除消息。
   * @param {string} messageId - 要删除的消息ID
   */
  async deleteMessage(messageId) {
    try {
      return await Message.findByIdAndDelete(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }

  // User online status management
  // 用户在线状态管理

  /**
   * Set user online status
   * Updates a user's online status and last seen time.
   * @param {string} userId - User ID
   * @param {boolean} isOnline - Online status
   * 设置用户在线状态
   * 更新用户的在线状态和最后在线时间。
   * @param {string} userId - 用户ID
   * @param {boolean} isOnline - 在线状态
   */
  async setUserOnline(userId, isOnline = true) {
    try {
      return await User.findByIdAndUpdate(
        userId,
        {
          isOnline,
          lastSeen: new Date()
        },
        { new: true }
      ).select('-password');
    } catch (error) {
      console.error('Failed to update user online status:', error);
      throw error;
    }
  }

  /**
   * Get online users
   * Returns all users who are currently online.
   * 获取在线用户
   * 返回当前所有在线的用户。
   */
  async getOnlineUsers() {
    try {
      return await User.find({ isOnline: true }).select('username avatar');
    } catch (error) {
      console.error('Failed to get online users:', error);
      throw error;
    }
  }

  /**
   * Health check
   * Performs a health check on the database and returns statistics.
   * 健康检查
   * 对数据库执行健康检查并返回统计信息。
   */
  async healthCheck() {
    try {
      const userCount = await User.countDocuments();
      const groupCount = await Group.countDocuments();
      const messageCount = await Message.countDocuments();

      return {
        status: 'healthy',
        counts: {
          users: userCount,
          groups: groupCount,
          messages: messageCount
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  // Group application management methods
  // 群组申请管理方法

  /**
   * Get available groups for application
   * Returns groups that a user has not joined and can apply to.
   * @param {string} userId - User ID
   * 获取可申请的群组
   * 返回用户尚未加入且可以申请的群组。
   * @param {string} userId - 用户ID
   */
  async getAvailableGroups(userId) {
    try {
      // Get groups the user has not joined
      // 获取用户尚未加入的群组
      const groups = await Group.find({
        $and: [
          { memberIds: { $ne: userId } },
          { adminIds: { $ne: userId } }
        ]
      }).populate('adminIds memberIds', 'username email avatar');

      // Get channel count for each group
      // 获取每个群组的频道数量
      const GroupsWithChannelCount = await Promise.all(
        groups.map(async (group) => {
          const channelCount = await Channel.countDocuments({ groupId: group._id });
          const groupObj = group.toObject();
          groupObj.channels = [{ id: 'general', name: 'general' }]; // Simulate default channel
          // 模拟默认频道
          return groupObj;
        })
      );

      return GroupsWithChannelCount;
    } catch (error) {
      console.error('Failed to get available groups:', error);
      throw error;
    }
  }

  /**
   * Create group application
   * Submits an application for a user to join a group.
   * @param {Object} applicationData - Application data
   * 创建群组申请
   * 提交用户加入群组的申请。
   * @param {Object} applicationData - 申请数据
   */
  async createGroupApplication(applicationData) {
    try {
      const existingApplication = await GroupApplication.findOne({
        groupId: applicationData.groupId,
        userId: applicationData.userId,
        status: 'pending'
      });

      if (existingApplication) {
        throw new Error('You already have a pending application');
      }

      const application = new GroupApplication(applicationData);
      return await application.save();
    } catch (error) {
      console.error('Failed to create group application:', error);
      throw error;
    }
  }

  /**
   * Get pending applications
   * Returns pending applications for a specific group or all groups.
   * @param {string} groupId - Optional group ID filter
   * 获取待处理申请
   * 返回特定群组或所有群组的待处理申请。
   * @param {string} groupId - 可选的群组ID过滤器
   */
  async getPendingApplications(groupId = null) {
    try {
      if (groupId) {
        return await GroupApplication.getPendingApplicationsForGroup(groupId);
      } else {
        return await GroupApplication.getAllPendingApplications();
      }
    } catch (error) {
      console.error('Failed to get pending applications:', error);
      throw error;
    }
  }

  /**
   * Review group application
   * Approves or rejects a group join application.
   * @param {string} applicationId - Application ID
   * @param {Object} reviewData - Review data with action and message
   * 审核群组申请
   * 批准或拒绝群组加入申请。
   * @param {string} applicationId - 申请ID
   * @param {Object} reviewData - 审核数据，包含操作和消息
   */
  async reviewGroupApplication(applicationId, reviewData) {
    try {
      const application = await GroupApplication.findById(applicationId);
      if (!application) {
        throw new Error('Application does not exist');
      }

      if (application.status !== 'pending') {
        throw new Error('Application already processed');
      }

      application.status = reviewData.action === 'approve' ? 'approved' : 'rejected';
      application.reviewedBy = reviewData.reviewedBy;
      application.reviewedAt = new Date();
      application.reviewMessage = reviewData.message || '';

      await application.save();

      if (reviewData.action === 'approve') {
        await this.addUserToGroup(application.groupId, application.userId);
      }

      return application;
    } catch (error) {
      console.error('Failed to review group application:', error);
      throw error;
    }
  }

  /**
   * Get user applications
   * Returns all applications submitted by a specific user.
   * @param {string} userId - User ID
   * 获取用户申请
   * 返回特定用户提交的所有申请。
   * @param {string} userId - 用户ID
   */
  async getUserApplications(userId) {
    try {
      return await GroupApplication.getUserApplications(userId);
    } catch (error) {
      console.error('Failed to get user applications:', error);
      throw error;
    }
  }

  /**
   * Create user by admin
   * Allows administrators to create new users.
   * @param {Object} userData - User data to create
   * 管理员创建用户
   * 允许管理员创建新用户。
   * @param {Object} userData - 要创建的用户数据
   */
  async createUserByAdmin(userData) {
    try {
      const existingUser = await User.findOne({
        $or: [
          { username: userData.username },
          { email: userData.email }
        ]
      });

      if (existingUser) {
        throw new Error('Username or email already exists');
      }

      const user = new User({
        ...userData,
        roles: userData.roles || ['user']
      });

      return await user.save();
    } catch (error) {
      console.error('Failed to create user by admin:', error);
      throw error;
    }
  }
}

module.exports = new MongoDataStore();