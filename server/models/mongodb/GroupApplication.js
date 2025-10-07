const mongoose = require('mongoose');

/**
 * Group Application Schema
 * Defines the structure for group join application documents in the database.
 */
const groupApplicationSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewMessage: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
groupApplicationSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupApplicationSchema.index({ status: 1 });
groupApplicationSchema.index({ createdAt: -1 });

/**
 * Static method: Get user applications
 * Retrieves all group join applications submitted by a specific user.
 * @param {string} userId - User ID
 * @returns {Query} Mongoose query result
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
 */
groupApplicationSchema.statics.getPendingApplicationsForGroup = async function(groupId) {
  const applications = await this.find({ groupId, status: 'pending' })
    .populate('userId', 'username email avatar')
    .populate('groupId', 'name description')
    .sort({ createdAt: -1 });

  // Flatten data structure for frontend use, filter out deleted users/groups
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
 */
groupApplicationSchema.statics.getAllPendingApplications = async function() {
  const applications = await this.find({ status: 'pending' })
    .populate('userId', 'username email avatar')
    .populate('groupId', 'name description')
    .sort({ createdAt: -1 });

  // Flatten data structure for frontend use, filter out deleted users/groups
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