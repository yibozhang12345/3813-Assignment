// server/config/database.js
// MongoDB连接配置 / MongoDB connection configuration
const { MongoClient } = require('mongodb');

// 数据库配置 / Database configuration
const DB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_NAME || 'chat_system_phase2';

let db = null;
let client = null;

/**
 * 连接MongoDB数据库 / Connect to MongoDB database
 * @returns {Promise<Object>} 数据库连接对象 / Database connection object
 */
async function connectDB() {
  try {
    if (db) {
      return db;
    }

    console.log('Connecting to MongoDB...', DB_URL);
    client = new MongoClient(DB_URL);
    await client.connect();

    db = client.db(DB_NAME);
    console.log('Successfully connected to MongoDB database:', DB_NAME);

    // 创建必要的集合索引 / Create necessary collection indexes
    await createIndexes();

    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * 创建数据库索引 / Create database indexes
 */
async function createIndexes() {
  try {
    // 用户集合索引 / Users collection indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 });

    // 群组集合索引 / Groups collection indexes
    await db.collection('groups').createIndex({ name: 1 });
    await db.collection('groups').createIndex({ ownerId: 1 });

    // 频道集合索引 / Channels collection indexes
    await db.collection('channels').createIndex({ groupId: 1 });
    await db.collection('channels').createIndex({ name: 1, groupId: 1 });

    // 消息集合索引 / Messages collection indexes
    await db.collection('messages').createIndex({ channelId: 1, timestamp: -1 });
    await db.collection('messages').createIndex({ userId: 1 });

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

/**
 * 获取数据库连接 / Get database connection
 * @returns {Object} 数据库连接对象 / Database connection object
 */
function getDB() {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
}

/**
 * 关闭数据库连接 / Close database connection
 */
async function closeDB() {
  if (client) {
    await client.close();
    db = null;
    client = null;
    console.log('Database connection closed');
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB
};