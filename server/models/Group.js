// server/models/Group.js
// 群组数据模型 / Group data model
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

class Group {
  constructor(groupData) {
    this._id = groupData._id;
    this.name = groupData.name;
    this.description = groupData.description || '';
    this.ownerId = groupData.ownerId;
    this.adminIds = groupData.adminIds || [];
    this.memberIds = groupData.memberIds || [];
    this.createdAt = groupData.createdAt || new Date();
    this.updatedAt = groupData.updatedAt || new Date();
  }

  /**
   * 创建新群组 / Create new group
   * @param {Object} groupData 群组数据 / Group data
   * @returns {Promise<Group>} 创建的群组对象 / Created group object
   */
  static async create(groupData) {
    const db = getDB();

    // 检查群组名是否已存在 / Check if group name already exists
    const existingGroup = await db.collection('groups').findOne({ name: groupData.name });
    if (existingGroup) {
      throw new Error('Group name already exists / 群组名已存在');
    }

    const newGroup = new Group({
      ...groupData,
      adminIds: [groupData.ownerId], // 创建者默认为管理员 / Creator is default admin
      memberIds: [groupData.ownerId], // 创建者默认为成员 / Creator is default member
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const result = await db.collection('groups').insertOne(newGroup);
    newGroup._id = result.insertedId;

    return newGroup;
  }

  /**
   * 根据ID查找群组 / Find group by ID
   * @param {string} id 群组ID / Group ID
   * @returns {Promise<Group|null>} 群组对象 / Group object
   */
  static async findById(id) {
    const db = getDB();
    const groupData = await db.collection('groups').findOne({ _id: new ObjectId(id) });
    return groupData ? new Group(groupData) : null;
  }

  /**
   * 获取用户所属的所有群组 / Get all groups that user belongs to
   * @param {string} userId 用户ID / User ID
   * @returns {Promise<Group[]>} 群组列表 / Group list
   */
  static async findByUserId(userId) {
    const db = getDB();
    const groups = await db.collection('groups').find({
      memberIds: userId
    }).toArray();

    return groups.map(groupData => new Group(groupData));
  }

  /**
   * 获取所有群组 / Get all groups
   * @param {Object} filter 过滤条件 / Filter conditions
   * @param {Object} options 查询选项 / Query options
   * @returns {Promise<Group[]>} 群组列表 / Group list
   */
  static async findAll(filter = {}, options = {}) {
    const db = getDB();
    const groups = await db.collection('groups').find(filter, options).toArray();
    return groups.map(groupData => new Group(groupData));
  }

  /**
   * 添加用户到群组 / Add user to group
   * @param {string} userId 用户ID / User ID
   * @returns {Promise<boolean>} 操作结果 / Operation result
   */
  async addMember(userId) {
    const db = getDB();

    // 检查用户是否已经是成员 / Check if user is already a member
    if (this.memberIds.includes(userId)) {
      return false; // 已经是成员 / Already a member
    }

    const result = await db.collection('groups').updateOne(
      { _id: new ObjectId(this._id) },
      {
        $addToSet: { memberIds: userId },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      this.memberIds.push(userId);
      this.updatedAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * 从群组中移除用户 / Remove user from group
   * @param {string} userId 用户ID / User ID
   * @returns {Promise<boolean>} 操作结果 / Operation result
   */
  async removeMember(userId) {
    const db = getDB();

    // 不能移除群组拥有者 / Cannot remove group owner
    if (this.ownerId === userId) {
      throw new Error('Cannot remove group owner / 不能移除群组拥有者');
    }

    const result = await db.collection('groups').updateOne(
      { _id: new ObjectId(this._id) },
      {
        $pull: {
          memberIds: userId,
          adminIds: userId // 同时从管理员列表中移除 / Also remove from admin list
        },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      this.memberIds = this.memberIds.filter(id => id !== userId);
      this.adminIds = this.adminIds.filter(id => id !== userId);
      this.updatedAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * 添加管理员 / Add admin
   * @param {string} userId 用户ID / User ID
   * @returns {Promise<boolean>} 操作结果 / Operation result
   */
  async addAdmin(userId) {
    const db = getDB();

    // 检查用户是否是群组成员 / Check if user is a group member
    if (!this.memberIds.includes(userId)) {
      throw new Error('User must be a group member first / 用户必须先成为群组成员');
    }

    // 检查用户是否已经是管理员 / Check if user is already an admin
    if (this.adminIds.includes(userId)) {
      return false; // 已经是管理员 / Already an admin
    }

    const result = await db.collection('groups').updateOne(
      { _id: new ObjectId(this._id) },
      {
        $addToSet: { adminIds: userId },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      this.adminIds.push(userId);
      this.updatedAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * 移除管理员 / Remove admin
   * @param {string} userId 用户ID / User ID
   * @returns {Promise<boolean>} 操作结果 / Operation result
   */
  async removeAdmin(userId) {
    const db = getDB();

    // 不能移除群组拥有者的管理员权限 / Cannot remove owner's admin privilege
    if (this.ownerId === userId) {
      throw new Error('Cannot remove owner admin privilege / 不能移除拥有者的管理员权限');
    }

    const result = await db.collection('groups').updateOne(
      { _id: new ObjectId(this._id) },
      {
        $pull: { adminIds: userId },
        $set: { updatedAt: new Date() }
      }
    );

    if (result.modifiedCount > 0) {
      this.adminIds = this.adminIds.filter(id => id !== userId);
      this.updatedAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * 更新群组信息 / Update group information
   * @param {Object} updateData 更新数据 / Update data
   * @returns {Promise<Group>} 更新后的群组对象 / Updated group object
   */
  async update(updateData) {
    const db = getDB();

    updateData.updatedAt = new Date();

    await db.collection('groups').updateOne(
      { _id: new ObjectId(this._id) },
      { $set: updateData }
    );

    // 更新当前对象 / Update current object
    Object.assign(this, updateData);
    return this;
  }

  /**
   * 删除群组 / Delete group
   * @returns {Promise<boolean>} 删除结果 / Delete result
   */
  async delete() {
    const db = getDB();

    // 同时删除群组下的所有频道 / Also delete all channels under the group
    await db.collection('channels').deleteMany({ groupId: this._id.toString() });

    // 删除群组下的所有消息 / Delete all messages under the group
    const channels = await db.collection('channels').find({ groupId: this._id.toString() }).toArray();
    const channelIds = channels.map(ch => ch._id.toString());
    if (channelIds.length > 0) {
      await db.collection('messages').deleteMany({ channelId: { $in: channelIds } });
    }

    const result = await db.collection('groups').deleteOne({ _id: new ObjectId(this._id) });
    return result.deletedCount > 0;
  }

  /**
   * 检查用户是否是群组成员 / Check if user is group member
   * @param {string} userId 用户ID / User ID
   * @returns {boolean} 检查结果 / Check result
   */
  isMember(userId) {
    return this.memberIds.includes(userId);
  }

  /**
   * 检查用户是否是群组管理员 / Check if user is group admin
   * @param {string} userId 用户ID / User ID
   * @returns {boolean} 检查结果 / Check result
   */
  isAdmin(userId) {
    return this.adminIds.includes(userId);
  }

  /**
   * 检查用户是否是群组拥有者 / Check if user is group owner
   * @param {string} userId 用户ID / User ID
   * @returns {boolean} 检查结果 / Check result
   */
  isOwner(userId) {
    return this.ownerId === userId;
  }

  /**
   * 转换为JSON格式 / Convert to JSON format
   * @returns {Object} JSON数据 / JSON data
   */
  toJSON() {
    return {
      ...this,
      id: this._id // 为前端兼容性添加id字段 / Add id field for frontend compatibility
    };
  }
}

module.exports = Group;