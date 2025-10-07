const mongoose = require('mongoose');

/**
 * Group Schema
 * Defines the structure for group documents in the database.
 * 群组模式
 * 定义数据库中群组文档的结构。
 */
const groupSchema = new mongoose.Schema({
  // 群组名称，必填，长度在1-50字符之间
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50
  },
  // 群组描述，可选，最大长度200字符，默认空字符串
  description: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  },
  // 管理员ID列表，必填，引用User模型
  adminIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  // 成员ID列表，可选，引用User模型
  memberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // 创建者ID，必填，引用User模型
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 是否为私有群组，默认false
  isPrivate: {
    type: Boolean,
    default: false
  },
  // 最大成员数量，默认100
  maxMembers: {
    type: Number,
    default: 100
  }
}, {
  timestamps: true
});

// 索引设置
// 为群组名称、管理员ID列表、成员ID列表和创建者ID添加索引以提高查询性能
groupSchema.index({ name: 1 });
groupSchema.index({ adminIds: 1 });
groupSchema.index({ memberIds: 1 });
groupSchema.index({ createdBy: 1 });

/**
 * Check if user is an admin
 * @param {string} userId - User ID to check
 * @returns {boolean} True if user is an admin
 * 检查用户是否为管理员
 * @param {string} userId - 要检查的用户ID
 * @returns {boolean} 如果用户是管理员则返回true
 */
groupSchema.methods.isAdmin = function(userId) {
  return this.adminIds.some(id => id.toString() === userId.toString());
};

/**
 * Check if user is a member
 * @param {string} userId - User ID to check
 * @returns {boolean} True if user is a member
 * 检查用户是否为成员
 * @param {string} userId - 要检查的用户ID
 * @returns {boolean} 如果用户是成员则返回true
 */
groupSchema.methods.isMember = function(userId) {
  return this.memberIds.some(id => id.toString() === userId.toString());
};

/**
 * Add member to group
 * @param {string} userId - User ID to add
 * @returns {Promise} Save operation result
 * 将成员添加到群组
 * @param {string} userId - 要添加的用户ID
 * @returns {Promise} 保存操作的结果
 */
groupSchema.methods.addMember = function(userId) {
  if (!this.isMember(userId)) {
    this.memberIds.push(userId);
  }
  return this.save();
};

/**
 * Remove member from group
 * @param {string} userId - User ID to remove
 * @returns {Promise} Save operation result
 * 从群组中移除成员
 * @param {string} userId - 要移除的用户ID
 * @returns {Promise} 保存操作的结果
 */
groupSchema.methods.removeMember = function(userId) {
  this.memberIds = this.memberIds.filter(id => id.toString() !== userId.toString());
  this.adminIds = this.adminIds.filter(id => id.toString() !== userId.toString());
  return this.save();
};

/**
 * Static method: Get user's groups
 * Returns all groups where the user is an admin or member.
 * @param {string} userId - User ID
 * @returns {Query} Mongoose query result
 * 静态方法：获取用户的群组
 * 返回用户作为管理员或成员的所有群组。
 * @param {string} userId - 用户ID
 * @returns {Query} Mongoose查询结果
 */
groupSchema.statics.getUserGroups = function(userId) {
  return this.find({
    $or: [
      { adminIds: userId },
      { memberIds: userId }
    ]
  }).populate('adminIds memberIds', 'username email avatar');
};

module.exports = mongoose.model('Group', groupSchema);