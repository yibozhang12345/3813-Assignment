// server/models/Channel.js
// 频道数据模型 / Channel data model
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

class Channel {
  constructor(channelData) {
    this._id = channelData._id;
    this.name = channelData.name;
    this.description = channelData.description || '';
    this.groupId = channelData.groupId;
    this.memberIds = channelData.memberIds || [];
    this.bannedUserIds = channelData.bannedUserIds || [];
    this.createdAt = channelData.createdAt || new Date();
    this.updatedAt = channelData.updatedAt || new Date();
  }

  /**
   * 创建新频道 / Create new channel
   * @param {Object} channelData 频道数据 / Channel data
   * @returns {Promise<Channel>} 创建的频道对象 / Created channel object
   */
  static async create(channelData) {
    const db = getDB();

    // 检查同一群组下是否已存在同名频道 / Check if channel name already exists in the same group
    const existingChannel = await db.collection('channels').findOne({
      name: channelData.name,
      groupId: channelData.groupId
    });

    if (existingChannel) {
      throw new Error('Channel name already exists in this group / 该群组下频道名已存在');
    }

    const newChannel = new Channel({
      ...channelData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await db.collection('channels').insertOne(newChannel);
    newChannel._id = result.insertedId;

    return newChannel;
  }

  /**
   * 根据ID查找频道 / Find channel by ID
   * @param {string} id 频道ID / Channel ID
   * @returns {Promise<Channel|null>} 频道对象 / Channel object
   */
  static async findById(id) {
    const db = getDB();
    const channelData = await db.collection('channels').findOne({ _id: new ObjectId(id) });
    return channelData ? new Channel(channelData) : null;
  }

  /**
   * 根据群组ID查找所有频道 / Find all channels by group ID
   * @param {string} groupId 群组ID / Group ID
   * @returns {Promise<Channel[]>} 频道列表 / Channel list
   */
  static async findByGroupId(groupId) {
    const db = getDB();
    const channels = await db.collection('channels').find({ groupId }).toArray();
    return channels.map(channelData => new Channel(channelData));
  }

  /**
   * 获取用户可访问的频道 / Get channels accessible to user
   * @param {string} userId 用户ID / User ID
   * @returns {Promise<Channel[]>} 频道列表 / Channel list
   */
  static async findAccessibleByUserId(userId) {
    const db = getDB();
    const channels = await db.collection('channels').find({
      memberIds: userId,
      bannedUserIds: { $ne: userId }
    }).toArray();

    return channels.map(channelData => new Channel(channelData));
  }

  /**
   * 获取所有频道 / Get all channels
   * @param {Object} filter 过滤条件 / Filter conditions
   * @param {Object} options 查询选项 / Query options
   * @returns {Promise<Channel[]>} 频道列表 / Channel list
   */
  static async findAll(filter = {}, options = {}) {
    const db = getDB();
    const channels = await db.collection('channels').find(filter, options).toArray();
    return channels.map(channelData => new Channel(channelData));
  }

  /**
   * 添加用户到频道 / Add user to channel
   * @param {string} userId 用户ID / User ID
   * @returns {Promise<boolean>} 操作结果 / Operation result
   */
  async addMember(userId) {
    const db = getDB();

    // 检查用户是否被禁止 / Check if user is banned
    if (this.bannedUserIds.includes(userId)) {
      throw new Error('User is banned from this channel / 用户已被该频道禁止');
    }

    // 检查用户是否已经是成员 / Check if user is already a member
    if (this.memberIds.includes(userId)) {
      return false; // 已经是成员 / Already a member
    }

    const result = await db.collection('channels').updateOne(
      { _id: new ObjectId(this._id) },
      {
        $addToSet: { memberIds: userId },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      this.memberIds.push(userId);
      this.updatedAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * 从频道中移除用户 / Remove user from channel
   * @param {string} userId 用户ID / User ID
   * @returns {Promise<boolean>} 操作结果 / Operation result
   */
  async removeMember(userId) {
    const db = getDB();

    const result = await db.collection('channels').updateOne(
      { _id: new ObjectId(this._id) },
      {
        $pull: { memberIds: userId },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      this.memberIds = this.memberIds.filter(id => id !== userId);
      this.updatedAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * 禁止用户访问频道 / Ban user from channel
   * @param {string} userId 用户ID / User ID
   * @returns {Promise<boolean>} 操作结果 / Operation result
   */
  async banUser(userId) {
    const db = getDB();

    // 检查用户是否已经被禁止 / Check if user is already banned
    if (this.bannedUserIds.includes(userId)) {
      return false; // 已经被禁止 / Already banned
    }

    const result = await db.collection('channels').updateOne(
      { _id: new ObjectId(this._id) },
      {
        $addToSet: { bannedUserIds: userId },
        $pull: { memberIds: userId }, // 同时从成员列表中移除 / Also remove from member list
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      this.bannedUserIds.push(userId);
      this.memberIds = this.memberIds.filter(id => id !== userId);
      this.updatedAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * 解除用户禁令 / Unban user from channel
   * @param {string} userId 用户ID / User ID
   * @returns {Promise<boolean>} 操作结果 / Operation result
   */
  async unbanUser(userId) {
    const db = getDB();

    const result = await db.collection('channels').updateOne(
      { _id: new ObjectId(this._id) },
      {
        $pull: { bannedUserIds: userId },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      this.bannedUserIds = this.bannedUserIds.filter(id => id !== userId);
      this.updatedAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * 更新频道信息 / Update channel information
   * @param {Object} updateData 更新数据 / Update data
   * @returns {Promise<Channel>} 更新后的频道对象 / Updated channel object
   */
  async update(updateData) {
    const db = getDB();

    updateData.updatedAt = new Date();

    await db.collection('channels').updateOne(
      { _id: new ObjectId(this._id) },
      { $set: updateData }
    );

    // 更新当前对象 / Update current object
    Object.assign(this, updateData);
    return this;
  }

  /**
   * 删除频道 / Delete channel
   * @returns {Promise<boolean>} 删除结果 / Delete result
   */
  async delete() {
    const db = getDB();

    // 删除频道相关的所有消息 / Delete all messages related to the channel
    await db.collection('messages').deleteMany({ channelId: this._id.toString() });

    const result = await db.collection('channels').deleteOne({ _id: new ObjectId(this._id) });
    return result.deletedCount > 0;
  }

  /**
   * 检查用户是否是频道成员 / Check if user is channel member
   * @param {string} userId 用户ID / User ID
   * @returns {boolean} 检查结果 / Check result
   */
  isMember(userId) {
    return this.memberIds.includes(userId) && !this.bannedUserIds.includes(userId);
  }

  /**
   * 检查用户是否被禁止 / Check if user is banned
   * @param {string} userId 用户ID / User ID
   * @returns {boolean} 检查结果 / Check result
   */
  isBanned(userId) {
    return this.bannedUserIds.includes(userId);
  }

  /**
   * 转换为JSON格式 / Convert to JSON format
   * @returns {Object} JSON数据 / JSON data
   */
  toJSON() {
    return {
      ...this,
      id: this._id // 为前端兼容性添加id字段 / Add id field for frontend compatibility
    };
  }
}

module.exports = Channel;