// server/models/User.js
// 用户数据模型 / User data model
const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const { getDB } = require('../config/database');

class User {
  constructor(userData) {
    this._id = userData._id;
    this.username = userData.username;
    this.email = userData.email;
    this.password = userData.password;
    this.roles = userData.roles || ['user'];
    this.groups = userData.groups || [];
    this.avatar = userData.avatar || null; // 头像文件路径 / Avatar file path
    this.createdAt = userData.createdAt || new Date();
    this.updatedAt = userData.updatedAt || new Date();
  }

  /**
   * 创建新用户 / Create new user
   * @param {Object} userData 用户数据 / User data
   * @returns {Promise<User>} 创建的用户对象 / Created user object
   */
  static async create(userData) {
    const db = getDB();

    // 检查邮箱是否已存在 / Check if email already exists
    const existingUser = await db.collection('users').findOne({ email: userData.email });
    if (existingUser) {
      throw new Error('Email already exists / 邮箱已存在');
    }

    // 检查用户名是否已存在 / Check if username already exists
    if (userData.username) {
      const existingUsername = await db.collection('users').findOne({ username: userData.username });
      if (existingUsername) {
        throw new Error('Username already exists / 用户名已存在');
      }
    }

    // 加密密码 / Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const newUser = new User({
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await db.collection('users').insertOne(newUser);
    newUser._id = result.insertedId;

    return newUser;
  }

  /**
   * 根据ID查找用户 / Find user by ID
   * @param {string} id 用户ID / User ID
   * @returns {Promise<User|null>} 用户对象 / User object
   */
  static async findById(id) {
    const db = getDB();
    const userData = await db.collection('users').findOne({ _id: new ObjectId(id) });
    return userData ? new User(userData) : null;
  }

  /**
   * 根据邮箱查找用户 / Find user by email
   * @param {string} email 用户邮箱 / User email
   * @returns {Promise<User|null>} 用户对象 / User object
   */
  static async findByEmail(email) {
    const db = getDB();
    const userData = await db.collection('users').findOne({ email });
    return userData ? new User(userData) : null;
  }

  /**
   * 验证用户密码 / Verify user password
   * @param {string} password 明文密码 / Plain password
   * @returns {Promise<boolean>} 验证结果 / Verification result
   */
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  /**
   * 更新用户信息 / Update user information
   * @param {Object} updateData 更新数据 / Update data
   * @returns {Promise<User>} 更新后的用户对象 / Updated user object
   */
  async update(updateData) {
    const db = getDB();

    // 如果更新密码，需要加密 / If updating password, need to hash
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }

    updateData.updatedAt = new Date();

    await db.collection('users').updateOne(
      { _id: new ObjectId(this._id) },
      { $set: updateData }
    );

    // 更新当前对象 / Update current object
    Object.assign(this, updateData);
    return this;
  }

  /**
   * 删除用户 / Delete user
   * @returns {Promise<boolean>} 删除结果 / Delete result
   */
  async delete() {
    const db = getDB();
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(this._id) });
    return result.deletedCount > 0;
  }

  /**
   * 获取所有用户 / Get all users
   * @param {Object} filter 过滤条件 / Filter conditions
   * @param {Object} options 查询选项 / Query options
   * @returns {Promise<User[]>} 用户列表 / User list
   */
  static async findAll(filter = {}, options = {}) {
    const db = getDB();
    const users = await db.collection('users').find(filter, options).toArray();
    return users.map(userData => new User(userData));
  }

  /**
   * 将用户对象转换为安全的JSON格式（不包含密码）/ Convert user object to safe JSON format (excluding password)
   * @returns {Object} 安全的用户数据 / Safe user data
   */
  toSafeJSON() {
    const { password, ...safeUser } = this;
    return {
      ...safeUser,
      id: this._id // 为前端兼容性添加id字段 / Add id field for frontend compatibility
    };
  }
}

module.exports = User;