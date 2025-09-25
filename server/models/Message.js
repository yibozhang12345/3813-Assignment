// server/models/Message.js
// 消息数据模型 / Message data model
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

class Message {
  constructor(messageData) {
    this._id = messageData._id;
    this.content = messageData.content;
    this.type = messageData.type || 'text'; // text, image, file
    this.userId = messageData.userId;
    this.username = messageData.username;
    this.userAvatar = messageData.userAvatar || null;
    this.channelId = messageData.channelId;
    this.timestamp = messageData.timestamp || new Date();
    this.edited = messageData.edited || false;
    this.editedAt = messageData.editedAt || null;
    this.imageUrl = messageData.imageUrl || null; // 图片消息的URL / Image message URL
    this.fileUrl = messageData.fileUrl || null; // 文件消息的URL / File message URL
    this.fileName = messageData.fileName || null; // 文件名 / File name
    this.reactions = messageData.reactions || []; // 消息反应 / Message reactions
  }

  /**
   * 创建新消息 / Create new message
   * @param {Object} messageData 消息数据 / Message data
   * @returns {Promise<Message>} 创建的消息对象 / Created message object
   */
  static async create(messageData) {
    const db = getDB();

    const newMessage = new Message({
      ...messageData,
      timestamp: new Date()
    });

    const result = await db.collection('messages').insertOne(newMessage);
    newMessage._id = result.insertedId;

    return newMessage;
  }

  /**
   * 根据ID查找消息 / Find message by ID
   * @param {string} id 消息ID / Message ID
   * @returns {Promise<Message|null>} 消息对象 / Message object
   */
  static async findById(id) {
    const db = getDB();
    const messageData = await db.collection('messages').findOne({ _id: new ObjectId(id) });
    return messageData ? new Message(messageData) : null;
  }

  /**
   * 根据频道ID获取消息历史 / Get message history by channel ID
   * @param {string} channelId 频道ID / Channel ID
   * @param {Object} options 查询选项 / Query options
   * @returns {Promise<Message[]>} 消息列表 / Message list
   */
  static async findByChannelId(channelId, options = {}) {
    const db = getDB();

    const {
      limit = 50,  // 默认获取最近50条消息 / Default to get recent 50 messages
      skip = 0,    // 跳过的消息数量 / Number of messages to skip
      before = null // 获取指定时间之前的消息 / Get messages before specified time
    } = options;

    let query = { channelId };

    // 如果指定了时间，则获取该时间之前的消息 / If time is specified, get messages before that time
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await db.collection('messages')
      .find(query)
      .sort({ timestamp: -1 }) // 按时间倒序 / Sort by time descending
      .skip(skip)
      .limit(limit)
      .toArray();

    // 返回时按时间正序 / Return in chronological order
    return messages.reverse().map(messageData => new Message(messageData));
  }

  /**
   * 获取用户发送的消息 / Get messages sent by user
   * @param {string} userId 用户ID / User ID
   * @param {Object} options 查询选项 / Query options
   * @returns {Promise<Message[]>} 消息列表 / Message list
   */
  static async findByUserId(userId, options = {}) {
    const db = getDB();

    const { limit = 50, skip = 0 } = options;

    const messages = await db.collection('messages')
      .find({ userId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return messages.map(messageData => new Message(messageData));
  }

  /**
   * 搜索消息 / Search messages
   * @param {Object} searchCriteria 搜索条件 / Search criteria
   * @param {Object} options 查询选项 / Query options
   * @returns {Promise<Message[]>} 消息列表 / Message list
   */
  static async search(searchCriteria, options = {}) {
    const db = getDB();

    const { limit = 50, skip = 0 } = options;

    let query = {};

    // 根据内容搜索 / Search by content
    if (searchCriteria.content) {
      query.content = { $regex: searchCriteria.content, $options: 'i' };
    }

    // 根据频道搜索 / Search by channel
    if (searchCriteria.channelId) {
      query.channelId = searchCriteria.channelId;
    }

    // 根据用户搜索 / Search by user
    if (searchCriteria.userId) {
      query.userId = searchCriteria.userId;
    }

    // 根据消息类型搜索 / Search by message type
    if (searchCriteria.type) {
      query.type = searchCriteria.type;
    }

    // 时间范围搜索 / Time range search
    if (searchCriteria.startTime || searchCriteria.endTime) {
      query.timestamp = {};
      if (searchCriteria.startTime) {
        query.timestamp.$gte = new Date(searchCriteria.startTime);
      }
      if (searchCriteria.endTime) {
        query.timestamp.$lte = new Date(searchCriteria.endTime);
      }
    }

    const messages = await db.collection('messages')
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return messages.map(messageData => new Message(messageData));
  }

  /**
   * 更新消息 / Update message
   * @param {Object} updateData 更新数据 / Update data
   * @returns {Promise<Message>} 更新后的消息对象 / Updated message object
   */
  async update(updateData) {
    const db = getDB();

    updateData.edited = true;
    updateData.editedAt = new Date();

    await db.collection('messages').updateOne(
      { _id: new ObjectId(this._id) },
      { $set: updateData }
    );

    // 更新当前对象 / Update current object
    Object.assign(this, updateData);
    return this;
  }

  /**
   * 删除消息 / Delete message
   * @returns {Promise<boolean>} 删除结果 / Delete result
   */
  async delete() {
    const db = getDB();
    const result = await db.collection('messages').deleteOne({ _id: new ObjectId(this._id) });
    return result.deletedCount > 0;
  }

  /**
   * 添加反应 / Add reaction
   * @param {string} userId 用户ID / User ID
   * @param {string} emoji 表情符号 / Emoji
   * @returns {Promise<boolean>} 操作结果 / Operation result
   */
  async addReaction(userId, emoji) {
    const db = getDB();

    // 检查用户是否已经对此消息有相同反应 / Check if user already has the same reaction on this message
    const existingReaction = this.reactions.find(r => r.userId === userId && r.emoji === emoji);
    if (existingReaction) {
      return false; // 已存在相同反应 / Same reaction already exists
    }

    const reaction = {
      userId,
      emoji,
      timestamp: new Date()
    };

    const result = await db.collection('messages').updateOne(
      { _id: new ObjectId(this._id) },
      { $push: { reactions: reaction } }
    );

    if (result.modifiedCount > 0) {
      this.reactions.push(reaction);
      return true;
    }

    return false;
  }

  /**
   * 移除反应 / Remove reaction
   * @param {string} userId 用户ID / User ID
   * @param {string} emoji 表情符号 / Emoji
   * @returns {Promise<boolean>} 操作结果 / Operation result
   */
  async removeReaction(userId, emoji) {
    const db = getDB();

    const result = await db.collection('messages').updateOne(
      { _id: new ObjectId(this._id) },
      { $pull: { reactions: { userId, emoji } } }
    );

    if (result.modifiedCount > 0) {
      this.reactions = this.reactions.filter(r => !(r.userId === userId && r.emoji === emoji));
      return true;
    }

    return false;
  }

  /**
   * 获取频道消息统计 / Get channel message statistics
   * @param {string} channelId 频道ID / Channel ID
   * @returns {Promise<Object>} 统计结果 / Statistics result
   */
  static async getChannelStats(channelId) {
    const db = getDB();

    const stats = await db.collection('messages').aggregate([
      { $match: { channelId } },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          messageTypes: { $addToSet: '$type' },
          firstMessage: { $min: '$timestamp' },
          lastMessage: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          _id: 0,
          totalMessages: 1,
          uniqueUserCount: { $size: '$uniqueUsers' },
          messageTypes: 1,
          firstMessage: 1,
          lastMessage: 1
        }
      }
    ]).toArray();

    return stats[0] || {
      totalMessages: 0,
      uniqueUserCount: 0,
      messageTypes: [],
      firstMessage: null,
      lastMessage: null
    };
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

module.exports = Message;