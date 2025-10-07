const mongoose = require('mongoose');

/**
 * Group Application Schema
 * Defines the structure for group join application documents in the database.
 * 群组申请模式
 * 定义数据库中群组加入申请文档的结构。
 */
const groupApplicationSchema = new mongoose.Schema({
  // 群组ID，必填，引用Group模型
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  // 用户ID，必填，引用User模型
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 申请消息，可选，最大长度500字符，默认空字符串
  message: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  // 申请状态，枚举值：'pending', 'approved', 'rejected'，默认'pending'
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // 审核者ID，可选，引用User模型
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // 审核时间，可选
  reviewedAt: {
    type: Date
  },
  // 审核消息，可选，最大长度500字符，默认空字符串
  reviewMessage: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  }
}, {
  timestamps: true
});

// 索引设置
// 为群组ID和用户ID组合添加唯一索引，为状态和创建时间添加索引以提高查询性能
groupApplicationSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupApplicationSchema.index({ status: 1 });
groupApplicationSchema.index({ createdAt: -1 });

/**
 * Static method: Get user applications
 * Retrieves all group join applications submitted by a specific user.
 * @param {string} userId - User ID
 * @returns {Query} Mongoose query result
 * 静态方法：获取用户申请
 * 检索特定用户提交的所有群组加入申请。
 * @param {string} userId - 用户ID
 * @returns {Query} Mongoose查询结果
 */
groupApplicationSchema.statics.getUserApplications = function(userId) {
  return this.find({ userId })
    .populate('groupId', 'name description')
    .sort({ createdAt: -1 });
};

/**
 * Static method: Get pending applications for group
 * Retrieves all pending group join applications for a specific group.
 * Flattens the data structure for frontend use and filters out deleted users/groups.
 * @param {string} groupId - Group ID
 * @returns {Promise<Array>} Array of flattened application objects
 * 静态方法：获取群组的待处理申请
 * 检索特定群组的所有待处理群组加入申请。
 * 为前端使用展平数据结构，并过滤掉已删除的用户/群组。
 * @param {string} groupId - 群组ID
 * @returns {Promise<Array>} 展平申请对象数组
 */
groupApplicationSchema.statics.getPendingApplicationsForGroup = async function(groupId) {
  const applications = await this.find({ groupId, status: 'pending' })
    .populate('userId', 'username email avatar')
    .populate('groupId', 'name description')
    .sort({ createdAt: -1 });

  // Flatten data structure for frontend use, filter out deleted users/groups
  // 为前端使用展平数据结构，过滤掉已删除的用户/群组
  return applications
    .filter(app => app.userId && app.groupId)
    .map(app => ({
      _id: app._id,
      id: app._id,
      groupId: app.groupId._id,
      userId: app.userId._id,
      username: app.userId.username,
      groupName: app.groupId.name,
      message: app.message,
      status: app.status,
      appliedAt: app.createdAt,
      reviewedBy: app.reviewedBy,
      reviewedAt: app.reviewedAt,
      reviewMessage: app.reviewMessage
    }));
};

/**
 * Static method: Get all pending applications (admin use)
 * Retrieves all pending group join applications across all groups for admin review.
 * Flattens the data structure for frontend use and filters out deleted users/groups.
 * @returns {Promise<Array>} Array of flattened application objects
 * 静态方法：获取所有待处理申请（管理员使用）
 * 检索所有群组的待处理群组加入申请以供管理员审核。
 * 为前端使用展平数据结构，并过滤掉已删除的用户/群组。
 * @returns {Promise<Array>} 展平申请对象数组
 */
groupApplicationSchema.statics.getAllPendingApplications = async function() {
  const applications = await this.find({ status: 'pending' })
    .populate('userId', 'username email avatar')
    .populate('groupId', 'name description')
    .sort({ createdAt: -1 });

  // Flatten data structure for frontend use, filter out deleted users/groups
  // 为前端使用展平数据结构，过滤掉已删除的用户/群组
  return applications
    .filter(app => app.userId && app.groupId)
    .map(app => ({
      _id: app._id,
      id: app._id,
      groupId: app.groupId._id,
      userId: app.userId._id,
      username: app.userId.username,
      groupName: app.groupId.name,
      message: app.message,
      status: app.status,
      appliedAt: app.createdAt,
      reviewedBy: app.reviewedBy,
      reviewedAt: app.reviewedAt,
      reviewMessage: app.reviewMessage
    }));
};

module.exports = mongoose.model('GroupApplication', groupApplicationSchema);