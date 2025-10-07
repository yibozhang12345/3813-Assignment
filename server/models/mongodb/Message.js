const mongoose = require('mongoose');

/**
 * Message Schema
 * Defines the structure for message documents in the database.
 * 消息模式
 * 定义数据库中消息文档的结构。
 */
const messageSchema = new mongoose.Schema({
  // 消息内容，对于文本消息必填，最大长度2000字符
  content: {
    type: String,
    required: function() {
      return this.type === 'text';
    },
    trim: true,
    maxlength: 2000
  },
  // 发送者ID，必填，引用User模型
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 发送者用户名，必填
  senderUsername: {
    type: String,
    required: true
  },
  // 频道ID，必填，引用Channel模型
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  // 消息类型，枚举值：'text', 'image', 'file', 'video'，默认'text'
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'video'],
    default: 'text'
  },
  // 文件URL，对于非文本消息必填
  fileUrl: {
    type: String,
    required: function() {
      return ['image', 'file', 'video'].includes(this.type);
    }
  },
  // 文件名，对于文件和视频消息必填
  fileName: {
    type: String,
    required: function() {
      return ['file', 'video'].includes(this.type);
    }
  },
  // 文件大小，对于非文本消息必填
  fileSize: {
    type: Number,
    required: function() {
      return ['image', 'file', 'video'].includes(this.type);
    }
  },
  // MIME类型，对于非文本消息必填
  mimeType: {
    type: String,
    required: function() {
      return ['image', 'file', 'video'].includes(this.type);
    }
  },
  // 是否已编辑，默认false
  isEdited: {
    type: Boolean,
    default: false
  },
  // 编辑时间，可选
  editedAt: {
    type: Date
  },
  // 回复到的消息ID，可选，引用Message模型
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  // 反应列表，包含用户ID、表情符号和时间戳
  reactions: [{
    // 反应用户ID，引用User模型
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // 表情符号
    emoji: String,
    // 时间戳，默认当前时间
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// 索引设置
// 为频道ID、发送者ID、创建时间和频道ID与创建时间的组合添加索引以提高查询性能
messageSchema.index({ channelId: 1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ channelId: 1, createdAt: -1 });

/**
 * Add reaction to message
 * @param {string} userId - User ID adding the reaction
 * @param {string} emoji - Emoji for the reaction
 * @returns {Promise} Save operation result
 * 为消息添加反应
 * @param {string} userId - 添加反应的用户ID
 * @param {string} emoji - 反应的表情符号
 * @returns {Promise} 保存操作的结果
 */
messageSchema.methods.addReaction = function(userId, emoji) {
  const existingReaction = this.reactions.find(
    reaction => reaction.userId.toString() === userId.toString() && reaction.emoji === emoji
  );

  if (!existingReaction) {
    this.reactions.push({ userId, emoji });
    return this.save();
  }

  return Promise.resolve(this);
};

/**
 * Remove reaction from message
 * @param {string} userId - User ID removing the reaction
 * @param {string} emoji - Emoji of the reaction to remove
 * @returns {Promise} Save operation result
 * 从消息中移除反应
 * @param {string} userId - 移除反应的用户ID
 * @param {string} emoji - 要移除的反应的表情符号
 * @returns {Promise} 保存操作的结果
 */
messageSchema.methods.removeReaction = function(userId, emoji) {
  this.reactions = this.reactions.filter(
    reaction => !(reaction.userId.toString() === userId.toString() && reaction.emoji === emoji)
  );
  return this.save();
};

/**
 * Edit message content
 * @param {string} newContent - New content for the message
 * @returns {Promise} Save operation result
 * 编辑消息内容
 * @param {string} newContent - 消息的新内容
 * @returns {Promise} 保存操作的结果
 */
messageSchema.methods.editMessage = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

/**
 * Static method: Get channel messages with pagination
 * Returns messages for a specific channel with pagination options.
 * @param {string} channelId - Channel ID
 * @param {Object} options - Pagination options (page, limit, before)
 * @returns {Query} Mongoose query result
 * 静态方法：获取频道消息（带分页）
 * 返回特定频道的消息，支持分页选项。
 * @param {string} channelId - 频道ID
 * @param {Object} options - 分页选项（page, limit, before）
 * @returns {Query} Mongoose查询结果
 */
messageSchema.statics.getChannelMessages = function(channelId, options = {}) {
  const { page = 1, limit = 50, before } = options;
  const skip = (page - 1) * limit;

  let query = { channelId };
  if (before) {
    query.createdAt = { $lt: before };
  }

  return this.find(query)
    .populate('senderId', 'username avatar')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('Message', messageSchema);