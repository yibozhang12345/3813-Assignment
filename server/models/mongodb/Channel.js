// 频道模型
// 定义聊天频道的数据结构和相关操作方法

const mongoose = require('mongoose');

/**
 * 频道数据结构定义
 * 定义数据库中频道文档的结构
 */
const channelSchema = new mongoose.Schema({
  // 频道名称，必填，长度1-50字符，会自动去除首尾空格
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50
  },
  // 频道描述，可选，最大200字符，默认空字符串
  description: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  },
  // 所属群组ID，必填，引用Group模型
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  // 频道成员ID列表，引用User模型
  memberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // 是否为私有频道，默认false（公开）
  isPrivate: {
    type: Boolean,
    default: false
  },
  // 创建者ID，必填，引用User模型
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 最后活动时间，默认当前时间
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // 自动添加createdAt和updatedAt字段
});

// 数据库索引设置，提高查询性能
channelSchema.index({ groupId: 1 }); // 按群组ID索引
channelSchema.index({ memberIds: 1 }); // 按成员ID索引
channelSchema.index({ name: 1, groupId: 1 }); // 复合索引：频道名称+群组ID

/**
 * 检查用户是否为频道成员
 * @param {string} userId - 要检查的用户ID
 * @returns {boolean} 如果用户是成员则返回true
 */
channelSchema.methods.isMember = function(userId) {
  return this.memberIds.some(id => id.toString() === userId.toString());
};

/**
 * 添加成员到频道
 * @param {string} userId - 要添加的用户ID
 * @returns {Promise} 保存操作结果
 */
channelSchema.methods.addMember = function(userId) {
  // 检查用户是否已经是成员，避免重复添加
  if (!this.isMember(userId)) {
    this.memberIds.push(userId);
  }
  return this.save();
};

/**
 * 从频道移除成员
 * @param {string} userId - 要移除的用户ID
 * @returns {Promise} 保存操作结果
 */
channelSchema.methods.removeMember = function(userId) {
  // 过滤掉指定用户ID，保留其他成员
  this.memberIds = this.memberIds.filter(id => id.toString() !== userId.toString());
  return this.save();
};

/**
 * 静态方法：获取群组的所有频道
 * 返回指定群组的所有频道，并填充成员信息
 * @param {string} groupId - 群组ID
 * @returns {Query} Mongoose查询结果
 */
channelSchema.statics.getGroupChannels = function(groupId) {
  // 查询指定群组的频道，并填充成员的用户名、邮箱和头像信息
  return this.find({ groupId }).populate('memberIds', 'username email avatar');
};

// 保存前的中间件，用于更新最后活动时间
channelSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

// 导出Channel模型
module.exports = mongoose.model('Channel', channelSchema);