// 加载环境变量配置
require('dotenv').config();

// 导入必要的Node.js模块
const express = require('express'); // Express框架，用于构建Web服务器
const http = require('http'); // HTTP模块，用于创建HTTP服务器
const socketIo = require('socket.io'); // Socket.IO，用于实时通信
const cors = require('cors'); // CORS中间件，处理跨域请求
const path = require('path'); // 路径模块，处理文件路径
const fs = require('fs'); // 文件系统模块，处理文件操作

// Import configuration and models
const database = require('./config/database'); // 数据库配置模块
const mongoDataStore = require('./models/mongoDataStore'); // MongoDB数据存储操作模块

// Import routes
const authRoutes = require('./routes/auth'); // 用户认证路由模块
const groupRoutes = require('./routes/groups'); // 群组管理路由模块
const uploadRoutes = require('./routes/upload'); // 文件上传路由模块
const adminRoutes = require('./routes/admin'); // 管理员功能路由模块
const profileRoutes = require('./routes/profile'); // 用户资料路由模块

// Import middleware
const { authenticateToken } = require('./middleware/auth'); // JWT认证中间件

// 创建Express应用实例
const app = express();
// 创建HTTP服务器实例
const server = http.createServer(app);
// 配置Socket.IO服务器，支持跨域访问
const io = socketIo(server, {
  cors: {
    origin: [process.env.CLIENT_URL || "http://localhost:4200", "http://localhost:4201"], // 允许的客户端URL列表
    methods: ["GET", "POST"], // 允许的HTTP方法
    credentials: true // 允许发送凭据（如cookies）
  }
});

// 设置服务器监听端口，默认3000
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
  origin: [process.env.CLIENT_URL || "http://localhost:4200", "http://localhost:4201"], // 允许的客户端URL列表
  credentials: true // 允许发送凭据（如cookies）
}));

// 配置Express中间件，解析JSON和URL编码的数据，设置大小限制为50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 如果不存在则创建上传目录
const uploadDir = process.env.UPLOAD_PATH || './uploads';
const avatarDir = path.join(uploadDir, 'avatars');
const filesDir = path.join(uploadDir, 'files');

[uploadDir, avatarDir, filesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 静态文件服务
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'public')));

// API路由配置
app.use('/api/auth', authRoutes);
app.use('/api/groups', authenticateToken, groupRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);

/**
 * 服务器健康检查端点
 * 返回服务器、数据库和数据存储的状态
 */
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    const storeHealth = await mongoDataStore.healthCheck();

    res.json({
      status: 'OK',
      message: 'Chat server is running',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      dataStore: storeHealth,
      version: '2.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Socket.io连接管理
const activeUsers = new Map(); // socketId -> userData，存储活跃用户的映射
const userSockets = new Map(); // userId -> socketId，用户ID到socket ID的映射
const channelUsers = new Map(); // channelId -> Set of userIds，频道中的用户集合
const typingUsers = new Map(); // channelId -> Set of userIds，正在输入的用户集合

/**
 * 处理所有socket.io事件，实现实时聊天功能
 */
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  /**
   * 处理用户加入聊天系统的事件
   * @param {Object} userData - 用户数据对象
   */
  socket.on('user-join', async (userData) => {
    try {
      activeUsers.set(socket.id, userData);
      userSockets.set(userData.id, socket.id);

      // Update user online status in database
      await mongoDataStore.setUserOnline(userData.id, true);

      // Broadcast user online event
      socket.broadcast.emit('user-online', {
        userId: userData.id,
        username: userData.username
      });

      console.log(`👤 User ${userData.username} connected`);
    } catch (error) {
      console.error('User join failed:', error);
      socket.emit('error', { message: 'Join failed' });
    }
  });

    /**
     * 处理用户加入频道的事件
     * @param {Object} data - 包含channelId和user对象的参数
     */
    socket.on('join-channel', async (data) => {
      try {
        const { channelId, user } = data;

        // Check if channel exists
        const channel = await mongoDataStore.findChannelById(channelId);
        if (!channel) {
          socket.emit('error', { message: 'Channel does not exist' });
          return;
        }

        // Check if user is a member of the channel or a super admin
        const isMember = channel.memberIds.some(member => {
          if (typeof member === 'string') {
            return member === user.id;
          } else if (typeof member === 'object' && member !== null) {
            // Handle ObjectId or plain object
            const memberId = member._id ? member._id.toString() : (member.id ? member.id.toString() : '');
            return memberId === user.id;
          }
          return false;
        });

        const isSuperAdmin = user.roles && user.roles.includes('super-admin');

        if (!isMember && !isSuperAdmin) {
          socket.emit('error', { message: 'No permission to access this channel' });
          return;
        }

        socket.join(channelId);

        if (!channelUsers.has(channelId)) {
          channelUsers.set(channelId, new Set());
        }
        channelUsers.get(channelId).add(user.id);

        // Broadcast user joined channel
        socket.to(channelId).emit('user-joined-channel', {
          userId: user.id,
          username: user.username,
          message: `${user.username} joined the channel`
        });

        // Send online users in the channel
        const onlineUsers = Array.from(channelUsers.get(channelId) || []);
        socket.emit('channel-users', { channelId, users: onlineUsers });

        console.log(`📺 User ${user.username} joined channel ${channelId}`);
      } catch (error) {
        console.error('Join channel failed:', error);
        socket.emit('error', { message: 'Join channel failed' });
      }
    });

    /**
     * 处理用户离开频道的事件
     * @param {Object} data - 包含channelId和user对象的参数
     */
    socket.on('leave-channel', (data) => {
      const { channelId, user } = data;
      socket.leave(channelId);

      if (channelUsers.has(channelId)) {
        channelUsers.get(channelId).delete(user.id);
        if (channelUsers.get(channelId).size === 0) {
          channelUsers.delete(channelId);
        }
      }

      // Remove typing status
      if (typingUsers.has(channelId)) {
        typingUsers.get(channelId).delete(user.id);
      }

      socket.to(channelId).emit('user-left-channel', {
        userId: user.id,
        username: user.username,
        message: `${user.username} left the channel`
      });

      socket.to(channelId).emit('typing-stop', {
        userId: user.id,
        username: user.username
      });
    });

    /**
     * 处理向频道发送消息的事件
     * @param {Object} data - 包含channelId、message、user和文件信息的参数
     */
    socket.on('send-message', async (data) => {
      try {
        const { channelId, message, user, type = 'text', fileUrl, fileName, fileSize, mimeType } = data;

        // Debug logs
        console.log('Received send-message data:', data);
        console.log('User object:', user);
        console.log('User ID:', user ? user.id : 'undefined');

        // Validate message content
        if (type === 'text' && (!message || message.trim() === '')) {
          socket.emit('error', { message: 'Message content cannot be empty' });
          return;
        }

        // For image, file, or video types, fileUrl is required
        if (['image', 'file', 'video'].includes(type) && !fileUrl) {
          socket.emit('error', { message: 'File URL cannot be empty' });
          return;
        }

        // Check channel existence
        const channel = await mongoDataStore.findChannelById(channelId);
        if (!channel) {
          socket.emit('error', { message: 'Channel does not exist' });
          return;
        }

        // Check if user is a member or super admin
        const isMember = channel.memberIds.some(member => {
          if (typeof member === 'string') {
            return member === user.id;
          } else if (typeof member === 'object' && member !== null) {
            // Handle ObjectId or plain object
            const memberId = member._id ? member._id.toString() : (member.id ? member.id.toString() : '');
            return memberId === user.id;
          }
          return false;
        });

        const isSuperAdmin = user.roles && user.roles.includes('super-admin');

        if (!isMember && !isSuperAdmin) {
          socket.emit('error', { message: 'No permission to send message to this channel' });
          return;
        }

        // Save message to database
        const messageData = {
          content: message,
          senderId: user.id,
          senderUsername: user.username,
          channelId: channelId,
          type: type,
          fileUrl: fileUrl,
          fileName: fileName,
          fileSize: fileSize,
          mimeType: mimeType
        };

        const savedMessage = await mongoDataStore.addMessage(messageData);

        // Broadcast message to channel
        io.to(channelId).emit('receive-message', {
          id: savedMessage._id,
          content: savedMessage.content,
          senderId: savedMessage.senderId,
          senderUsername: savedMessage.senderUsername,
          channelId: savedMessage.channelId,
          type: savedMessage.type,
          fileUrl: savedMessage.fileUrl,
          fileName: savedMessage.fileName,
          fileSize: savedMessage.fileSize,
          mimeType: savedMessage.mimeType,
          timestamp: savedMessage.createdAt
        });

        console.log(`💬 Message sent to channel ${channelId} by ${user.username}`);
      } catch (error) {
        console.error('Send message failed:', error);
        socket.emit('error', { message: 'Send message failed' });
      }
    });

    /**
     * 处理频道中开始输入的事件
     * @param {Object} data - 包含channelId和user对象的参数
     */
    socket.on('typing-start', (data) => {
      const { channelId, user } = data;

      if (!typingUsers.has(channelId)) {
        typingUsers.set(channelId, new Set());
      }
      typingUsers.get(channelId).add(user.id);

      socket.to(channelId).emit('typing-start', {
        userId: user.id,
        username: user.username
      });
    });

    /**
     * 处理频道中停止输入的事件
     * @param {Object} data - 包含channelId和user对象的参数
     */
    socket.on('typing-stop', (data) => {
      const { channelId, user } = data;

      if (typingUsers.has(channelId)) {
        typingUsers.get(channelId).delete(user.id);
      }

      socket.to(channelId).emit('typing-stop', {
        userId: user.id,
        username: user.username
      });
    });

    /**
     * 处理用户断开连接的事件
     * 清理用户状态并广播离线状态
     */
    socket.on('disconnect', async () => {
      try {
        const userData = activeUsers.get(socket.id);

        if (userData) {
          // Update user offline status in database
          await mongoDataStore.setUserOnline(userData.id, false);

          // Remove user from all channels
          channelUsers.forEach((users, channelId) => {
            if (users.has(userData.id)) {
              users.delete(userData.id);
              if (users.size === 0) {
                channelUsers.delete(channelId);
              }
            }
          });

          // Remove typing status from all channels
          typingUsers.forEach((users, channelId) => {
            if (users.has(userData.id)) {
              users.delete(userData.id);
              if (users.size === 0) {
                typingUsers.delete(channelId);
              }
            }
          });

          // Broadcast user offline event
          socket.broadcast.emit('user-offline', {
            userId: userData.id,
            username: userData.username
          });

          activeUsers.delete(socket.id);
          userSockets.delete(userData.id);

          console.log(`👤 User ${userData.username} disconnected`);
        }
      } catch (error) {
        console.error('Handle user disconnect failed:', error);
      }

      console.log(`🔌 Connection disconnected: ${socket.id}`);
    });
});

// 启动服务器
server.listen(PORT, async () => {
  console.log(`🚀 Chat server (phase 2) started`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:4200'}`);
  console.log(`💾 Upload directory: ${uploadDir}`);
  console.log(`📊 Admin panel: http://localhost:8081 (MongoDB Express)`);
  console.log(`⚡ Socket.IO server is ready`);

  // 等待数据库连接，然后初始化数据
  setTimeout(async () => {
    try {
      const health = await mongoDataStore.healthCheck();
      console.log(`📈 Data statistics:`, health.counts);
    } catch (error) {
      console.error('Failed to get data statistics:', error);
    }
  }, 2000);
});
// End of file