const mongoose = require('mongoose');

/**
 * Channel Schema
 * Defines the structure for channel documents in the database.
 */
const channelSchema = new mongoose.Schema({
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
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  memberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
channelSchema.index({ groupId: 1 });
channelSchema.index({ memberIds: 1 });
channelSchema.index({ name: 1, groupId: 1 });

/**
 * Check if user is a channel member
 * @param {string} userId - User ID to check
 * @returns {boolean} True if user is a member
 */
channelSchema.methods.isMember = function(userId) {
  return this.memberIds.some(id => id.toString() === userId.toString());
};

/**
 * Add member to channel
 * @param {string} userId - User ID to add
 * @returns {Promise} Save operation result
 */
channelSchema.methods.addMember = function(userId) {
  if (!this.isMember(userId)) {
    this.memberIds.push(userId);
  }
  return this.save();
};

/**
 * Remove member from channel
 * @param {string} userId - User ID to remove
 * @returns {Promise} Save operation result
 */
channelSchema.methods.removeMember = function(userId) {
  this.memberIds = this.memberIds.filter(id => id.toString() !== userId.toString());
  return this.save();
};

/**
 * Static method: Get group's channels
 * Returns all channels for a specific group.
 * @param {string} groupId - Group ID
 * @returns {Query} Mongoose query result
 */
channelSchema.statics.getGroupChannels = function(groupId) {
  return this.find({ groupId }).populate('memberIds', 'username email avatar');
};

// Middleware to update last activity time
channelSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

module.exports = mongoose.model('Channel', channelSchema);