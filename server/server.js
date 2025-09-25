// server/server.js
// -------------------------------
// Phase 2: Express + Socket.IO + MongoDB
// 实现完整的聊天系统：用户认证、实时聊天、图片上传、视频通话
// Phase 2: Complete chat system with user auth, real-time chat, image upload, video call
// -------------------------------

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

// 数据库连接 / Database connection
const { connectDB } = require('./config/database');

// 路由导入 / Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const channelRoutes = require('./routes/channels');
const messageRoutes = require('./routes/messages');
const uploadRoutes = require('./routes/upload');

// 中间件导入 / Middleware imports
const { verifyToken } = require('./middleware/auth');

const PORT = process.env.PORT || 3000;
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || 'http://localhost:4200';

const app = express();

// 中间件设置 / Middleware setup
app.use(cors({
  origin: FRONT_ORIGIN,
  credentials: true // 允许携带认证信息 / Allow credentials
}));
app.use(express.json({ limit: '10mb' })); // 支持较大的JSON数据 / Support larger JSON data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务 / Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 路由设置 / Route setup
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);

// 健康检查端点 / Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running / 服务器运行正常',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// 错误处理中间件 / Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);

  // MongoDB连接错误 / MongoDB connection error
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    return res.status(500).json({
      success: false,
      message: 'Database connection error / 数据库连接错误',
      code: 'DB_CONNECTION_ERROR'
    });
  }

  // JWT错误 / JWT error
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed / 认证失败',
      code: 'AUTH_ERROR'
    });
  }

  // 默认错误响应 / Default error response
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error / 服务器内部错误',
    code: error.code || 'INTERNAL_ERROR'
  });
});

// 404处理 / 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found / 路由未找到',
    code: 'ROUTE_NOT_FOUND',
    path: req.path
  });
});

// 创建 HTTP + Socket.IO 服务器 / Create HTTP + Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: FRONT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Socket.IO 实时聊天逻辑 / Socket.IO real-time chat logic
const socketManager = require('./socket/socketManager');
socketManager(io);

// 启动服务器 / Start server
async function startServer() {
  try {
    // 连接数据库 / Connect to database
    await connectDB();
    console.log('✅ Database connected successfully / 数据库连接成功');

    // 创建上传目录 / Create upload directories
    const fs = require('fs');
    const uploadDirs = ['uploads', 'uploads/avatars', 'uploads/images', 'uploads/files'];

    uploadDirs.forEach(dir => {
      const fullPath = path.join(__dirname, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });

    // 启动服务器 / Start server
    server.listen(PORT, () => {
      console.log(`🚀 Phase 2 server listening on http://localhost:${PORT}`);
      console.log(`🌐 CORS allowed origin: ${FRONT_ORIGIN}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💬 Real-time chat with Socket.IO enabled`);
      console.log(`📁 File upload support enabled`);
      console.log(`🎥 Video chat with PeerJS support enabled`);
    });

  } catch (error) {
    console.error('❌ Failed to start server / 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭处理 / Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  const { closeDB } = require('./config/database');
  await closeDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  const { closeDB } = require('./config/database');
  await closeDB();
  process.exit(0);
});

// 未处理的错误捕获 / Unhandled error catching
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
