require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import configuration and models
const database = require('./config/database');
const mongoDataStore = require('./models/mongoDataStore');

// Import routes
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');

// Import middleware
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [process.env.CLIENT_URL || "http://localhost:4200", "http://localhost:4201"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(cors({
  origin: [process.env.CLIENT_URL || "http://localhost:4200", "http://localhost:4201"],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Create upload directories if they do not exist
const uploadDir = process.env.UPLOAD_PATH || './uploads';
const avatarDir = path.join(uploadDir, 'avatars');
const filesDir = path.join(uploadDir, 'files');

[uploadDir, avatarDir, filesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Static file serving
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', authenticateToken, groupRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);

/**
 * Health check endpoint for the server.
 * Returns the status of the server, database, and data store.
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

// Socket.io connection management
const activeUsers = new Map(); // socketId -> userData
const userSockets = new Map(); // userId -> socketId
const channelUsers = new Map(); // channelId -> Set of userIds
const typingUsers = new Map(); // channelId -> Set of userIds

/**
 * Handles all socket.io events for real-time chat functionality.
 */
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  /**
   * Handles user joining the chat system.
   * @param {Object} userData - The user data object.
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
     * Handles user joining a channel.
     * @param {Object} data - Contains channelId and user object.
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
     * Handles user leaving a channel.
     * @param {Object} data - Contains channelId and user object.
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
     * Handles sending a message to a channel.
     * @param {Object} data - Contains channelId, message, user, and file info.
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
     * Handles typing start event in a channel.
     * @param {Object} data - Contains channelId and user object.
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
     * Handles typing stop event in a channel.
     * @param {Object} data - Contains channelId and user object.
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
     * Handles user disconnect event.
     * Cleans up user state and broadcasts offline status.
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

// Start the server
server.listen(PORT, async () => {
  console.log(`🚀 Chat server (phase 2) started`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:4200'}`);
  console.log(`💾 Upload directory: ${uploadDir}`);
  console.log(`📊 Admin panel: http://localhost:8081 (MongoDB Express)`);
  console.log(`⚡ Socket.IO server is ready`);

  // Wait for database connection and then initialize data
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