const mongoose = require('mongoose');

/**
 * Group Schema
 * Defines the structure for group documents in the database.
 */
const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  },
  adminIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  memberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  maxMembers: {
    type: Number,
    default: 100
  }
}, {
  timestamps: true
});

// Indexes
groupSchema.index({ name: 1 });
groupSchema.index({ adminIds: 1 });
groupSchema.index({ memberIds: 1 });
groupSchema.index({ createdBy: 1 });

/**
 * Check if user is an admin
 * @param {string} userId - User ID to check
 * @returns {boolean} True if user is an admin
 */
groupSchema.methods.isAdmin = function(userId) {
  return this.adminIds.some(id => id.toString() === userId.toString());
};

/**
 * Check if user is a member
 * @param {string} userId - User ID to check
 * @returns {boolean} True if user is a member
 */
groupSchema.methods.isMember = function(userId) {
  return this.memberIds.some(id => id.toString() === userId.toString());
};

/**
 * Add member to group
 * @param {string} userId - User ID to add
 * @returns {Promise} Save operation result
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