const User = require('./mongodb/User');
const Group = require('./mongodb/Group');
const Channel = require('./mongodb/Channel');
const Message = require('./mongodb/Message');
const GroupApplication = require('./mongodb/GroupApplication');
const mongoose = require('mongoose');

class MongoDataStore {
  constructor() {
    // Ensure default super admin exists during initialization
    this.initializeDefaultUser();
  }

  /**
   * Initialize default user
   * Creates a default super admin user if it doesn't exist.
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

  /**
   * Get all users
   * Returns a list of all users without passwords.
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
   */
  async deleteUser(userId) {
    try {
      const result = await User.findByIdAndDelete(userId);
      if (result) {
        // Remove user from all groups
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
        await Channel.updateMany(
          {},
          { $pull: { memberIds: userId } }
        );

        // Delete all group applications for this user
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

  /**
   * Get all groups
   * Returns all groups with populated admin and member information.
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
   */
  async addGroup(groupData) {
    try {
      const group = new Group(groupData);

      // Creator automatically becomes admin and member
      if (!group.adminIds.includes(groupData.createdBy)) {
        group.adminIds.push(groupData.createdBy);
      }
      if (!group.memberIds.includes(groupData.createdBy)) {
        group.memberIds.push(groupData.createdBy);
      }

      const savedGroup = await group.save();

      // Create default 'general' channel
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
   */
  async deleteGroup(groupId) {
    try {
      // Get group information
      const group = await Group.findById(groupId);
      if (!group) return false;

      // Delete all channels and related messages in the group
      const channels = await Channel.find({ groupId: groupId });
      for (const channel of channels) {
        // Delete all messages in the channel
        await Message.deleteMany({ channelId: channel._id });
      }

      // Delete all channels
      await Channel.deleteMany({ groupId: groupId });

      // Delete group application records
      await GroupApplication.deleteMany({ groupId: groupId });

      // Delete group
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
   */
  async addUserToGroup(groupId, userId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) return false;

      const success = await group.addMember(userId);

      // Add user to all channels in the group
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
   */
  async removeUserFromGroup(groupId, userId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) return false;

      const success = await group.removeMember(userId);

      // Remove user from all channels in the group
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
   */
  async promoteUserToGroupAdmin(groupId, userId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) return false;

      // Check if user is already an admin
      if (group.adminIds.includes(userId)) {
        return false;
      }

      // Check if user is a member
      if (!group.memberIds.includes(userId)) {
        return false;
      }

      // Add user to admin list
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
   */
  async demoteUserFromGroupAdmin(groupId, userId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) return false;

      // Check if user is an admin
      if (!group.adminIds.includes(userId)) {
        return false;
      }

      // Remove user from admin list (user remains a member)
      group.adminIds = group.adminIds.filter(adminId => adminId.toString() !== userId.toString());
      await group.save();

      return true;
    } catch (error) {
      console.error('Failed to demote user from group admin:', error);
      throw error;
    }
  }

  // Channel management methods

  /**
   * Get group channels
   * Returns all channels for a specific group.
   * @param {string} groupId - Group ID
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
   */
  async addChannelToGroup(groupId, channelData) {
    try {
      // Get group member list
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
   */
  async deleteChannel(channelId) {
    try {
      // Delete all messages in the channel
      await Message.deleteMany({ channelId: channelId });

      // Delete channel
      const result = await Channel.findByIdAndDelete(channelId);

      return !!result;
    } catch (error) {
      console.error('Failed to delete channel:', error);
      throw error;
    }
  }

  // Message management methods

  /**
   * Get channel messages
   * Returns messages for a specific channel with pagination options.
   * @param {string} channelId - Channel ID
   * @param {Object} options - Pagination and filtering options
   */
  async getChannelMessages(channelId, options = {}) {
    try {
      const messages = await Message.getChannelMessages(channelId, options);
      return messages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Failed to get channel messages:', error);
      throw error;
    }
  }

  /**
   * Add message
   * Creates a new message and updates channel activity.
   * @param {Object} messageData - Message data to create
   */
  async addMessage(messageData) {
    try {
      const message = new Message(messageData);
      const savedMessage = await message.save();

      // Update channel's last activity time
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

  /**
   * Set user online status
   * Updates a user's online status and last seen time.
   * @param {string} userId - User ID
   * @param {boolean} isOnline - Online status
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

  /**
   * Get available groups for application
   * Returns groups that a user has not joined and can apply to.
   * @param {string} userId - User ID
   */
  async getAvailableGroups(userId) {
    try {
      // Get groups the user has not joined
      const groups = await Group.find({
        $and: [
          { memberIds: { $ne: userId } },
          { adminIds: { $ne: userId } }
        ]
      }).populate('adminIds memberIds', 'username email avatar');

      // Get channel count for each group
      const GroupsWithChannelCount = await Promise.all(
        groups.map(async (group) => {
          const channelCount = await Channel.countDocuments({ groupId: group._id });
          const groupObj = group.toObject();
          groupObj.channels = [{ id: 'general', name: 'general' }]; // Simulate default channel
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