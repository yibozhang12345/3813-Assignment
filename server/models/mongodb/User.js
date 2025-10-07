const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Defines the structure for user documents in the database.
 * 用户模式
 * 定义数据库中用户文档的结构。
 */
const userSchema = new mongoose.Schema({
  // 用户名，必填，唯一，长度在3-30字符之间
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  // 邮箱，必填，唯一，自动转换为小写
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  // 密码，必填，最小长度6字符
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  // 角色列表，枚举值：'user', 'group-admin', 'super-admin'，默认'user'
  roles: [{
    type: String,
    enum: ['user', 'group-admin', 'super-admin'],
    default: 'user'
  }],
  // 头像URL，可选，默认null
  avatar: {
    type: String,
    default: null
  },
  // 用户所属群组ID列表，引用Group模型
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  // 是否在线，默认false
  isOnline: {
    type: Boolean,
    default: false
  },
  // 最后在线时间，默认当前时间
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Password encryption middleware
// 密码加密中间件：在保存用户前对密码进行哈希加密
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
 * 比较密码方法
 * 将候选密码与用户的哈希密码进行比较。
 * @param {string} candidatePassword - 要比较的密码
 * @returns {boolean} 如果密码匹配则返回true
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Convert to JSON method
 * Removes password field when converting to JSON.
 * @returns {Object} User object without password
 * 转换为JSON方法
 * 在转换为JSON时移除密码字段。
 * @returns {Object} 不包含密码的用户对象
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
 * 静态方法：根据用户名查找用户
 * @param {string} username - 要搜索的用户名
 * @returns {Object} 用户文档
 */
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username });
};

/**
 * Check if user has specific role
 * @param {string} role - Role to check for
 * @returns {boolean} True if user has the role
 * 检查用户是否具有特定角色
 * @param {string} role - 要检查的角色
 * @returns {boolean} 如果用户具有该角色则返回true
 */
userSchema.methods.hasRole = function(role) {
  return this.roles.includes(role);
};

module.exports = mongoose.model('User', userSchema);