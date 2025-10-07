const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Defines the structure for user documents in the database.
 */
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  roles: [{
    type: String,
    enum: ['user', 'group-admin', 'super-admin'],
    default: 'user'
  }],
  avatar: {
    type: String,
    default: null
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Password encryption middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare password method
 * Compares a candidate password with the user's hashed password.
 * @param {string} candidatePassword - Password to compare
 * @returns {boolean} True if passwords match
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Convert to JSON method
 * Removes password field when converting to JSON.
 * @returns {Object} User object without password
 */
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

/**
 * Static method: Find user by username
 * @param {string} username - Username to search for
 * @returns {Object} User document
 */
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username });
};

/**
 * Check if user has specific role
 * @param {string} role - Role to check for
 * @returns {boolean} True if user has the role
 */
userSchema.methods.hasRole = function(role) {
  return this.roles.includes(role);
};

module.exports = mongoose.model('User', userSchema);