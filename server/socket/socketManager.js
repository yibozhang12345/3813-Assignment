// server/socket/socketManager.js
// Socket.IO 连接管理器 / Socket.IO connection manager
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const { JWT_SECRET } = require('../middleware/auth');

// 存储在线用户信息 / Store online user information
const onlineUsers = new Map(); // userId -> { socketId, userData, currentChannelId }
const userSockets = new Map(); // socketId -> userId

/**
 * Socket.IO 主管理函数 / Socket.IO main management function
 * @param {Object} io Socket.IO服务器实例 / Socket.IO server instance
 */
function socketManager(io) {
  // Socket认证中间件 / Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required / 需要认证令牌'));
      }

      // 验证JWT令牌 / Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('Invalid token - user not found / 无效令牌 - 用户不存在'));
      }

      // 将用户信息附加到socket / Attach user info to socket
      socket.userId = user._id.toString();
      socket.user = user;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed / 认证失败'));
    }
  });

  // 连接处理 / Connection handling
  io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.user.username || socket.user.email} (${socket.id})`);

    // 添加到在线用户列表 / Add to online users list
    onlineUsers.set(socket.userId, {
      socketId: socket.id,
      userData: socket.user.toSafeJSON(),
      currentChannelId: null,
      connectedAt: new Date()
    });

    userSockets.set(socket.id, socket.userId);

    // 通知用户上线 / Notify user online
    socket.broadcast.emit('userOnline', {
      userId: socket.userId,
      userData: socket.user.toSafeJSON()
    });

    // 发送在线用户列表给新连接的用户 / Send online users list to newly connected user
    const onlineUsersList = Array.from(onlineUsers.values()).map(user => ({
      userId: user.userData.id,
      username: user.userData.username || user.userData.email,
      avatar: user.userData.avatar
    }));

    socket.emit('onlineUsers', onlineUsersList);

    // 加入频道 / Join channel
    socket.on('joinChannel', async (data) => {
      try {
        const { channelId } = data;

        if (!channelId) {
          socket.emit('error', { message: 'Channel ID is required / 需要频道ID' });
          return;
        }

        // 验证用户是否有权限加入频道 / Verify if user has permission to join channel
        const channel = await Channel.findById(channelId);
        if (!channel) {
          socket.emit('error', { message: 'Channel not found / 频道不存在' });
          return;
        }

        // 检查用户是否是频道成员 / Check if user is channel member
        if (!channel.isMember(socket.userId)) {
          socket.emit('error', { message: 'No permission to join this channel / 无权限加入该频道' });
          return;
        }

        // 离开之前的频道 / Leave previous channel
        const currentChannelId = onlineUsers.get(socket.userId)?.currentChannelId;
        if (currentChannelId && currentChannelId !== channelId) {
          socket.leave(currentChannelId);
          socket.to(currentChannelId).emit('userLeftChannel', {
            userId: socket.userId,
            channelId: currentChannelId,
            userData: socket.user.toSafeJSON()
          });
        }

        // 加入新频道 / Join new channel
        socket.join(channelId);

        // 更新用户当前频道 / Update user current channel
        const userInfo = onlineUsers.get(socket.userId);
        if (userInfo) {
          userInfo.currentChannelId = channelId;
        }

        console.log(`📢 User ${socket.user.username || socket.user.email} joined channel ${channelId}`);

        // 通知其他用户有新用户加入频道 / Notify other users of new user joining channel
        socket.to(channelId).emit('userJoinedChannel', {
          userId: socket.userId,
          channelId,
          userData: socket.user.toSafeJSON()
        });

        // 发送加入成功确认 / Send join success confirmation
        socket.emit('joinedChannel', {
          channelId,
          success: true
        });

        // 发送最近的聊天历史 / Send recent chat history
        const recentMessages = await Message.findByChannelId(channelId, { limit: 50 });
        socket.emit('chatHistory', {
          channelId,
          messages: recentMessages.map(msg => msg.toJSON())
        });

      } catch (error) {
        console.error('Join channel error:', error);
        socket.emit('error', { message: 'Failed to join channel / 加入频道失败' });
      }
    });

    // 离开频道 / Leave channel
    socket.on('leaveChannel', (data) => {
      try {
        const { channelId } = data;

        if (channelId) {
          socket.leave(channelId);

          // 通知其他用户有用户离开频道 / Notify other users of user leaving channel
          socket.to(channelId).emit('userLeftChannel', {
            userId: socket.userId,
            channelId,
            userData: socket.user.toSafeJSON()
          });

          // 更新用户当前频道 / Update user current channel
          const userInfo = onlineUsers.get(socket.userId);
          if (userInfo && userInfo.currentChannelId === channelId) {
            userInfo.currentChannelId = null;
          }

          console.log(`📤 User ${socket.user.username || socket.user.email} left channel ${channelId}`);
        }
      } catch (error) {
        console.error('Leave channel error:', error);
      }
    });

    // 发送消息 / Send message
    socket.on('sendMessage', async (data) => {
      try {
        const { channelId, content, type = 'text', imageUrl = null, fileUrl = null, fileName = null } = data;

        if (!channelId || !content?.trim()) {
          socket.emit('error', { message: 'Channel ID and content are required / 需要频道ID和内容' });
          return;
        }

        // 验证频道权限 / Verify channel permission
        const channel = await Channel.findById(channelId);
        if (!channel || !channel.isMember(socket.userId)) {
          socket.emit('error', { message: 'No permission to send message to this channel / 无权限向该频道发送消息' });
          return;
        }

        // 创建消息 / Create message
        const message = await Message.create({
          content: content.trim(),
          type,
          userId: socket.userId,
          username: socket.user.username || socket.user.email,
          userAvatar: socket.user.avatar,
          channelId,
          imageUrl,
          fileUrl,
          fileName
        });

        const messageData = message.toJSON();

        // 广播消息给频道内的所有用户 / Broadcast message to all users in the channel
        io.to(channelId).emit('newMessage', messageData);

        console.log(`💬 Message sent to channel ${channelId} by ${socket.user.username || socket.user.email}: ${content.substring(0, 50)}...`);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message / 发送消息失败' });
      }
    });

    // 编辑消息 / Edit message
    socket.on('editMessage', async (data) => {
      try {
        const { messageId, content } = data;

        if (!messageId || !content?.trim()) {
          socket.emit('error', { message: 'Message ID and content are required / 需要消息ID和内容' });
          return;
        }

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found / 消息不存在' });
          return;
        }

        // 检查权限：只有消息发送者可以编辑 / Check permission: only message sender can edit
        if (message.userId !== socket.userId) {
          socket.emit('error', { message: 'No permission to edit this message / 无权限编辑该消息' });
          return;
        }

        // 更新消息 / Update message
        await message.update({ content: content.trim() });

        // 广播编辑的消息 / Broadcast edited message
        io.to(message.channelId).emit('messageEdited', {
          messageId: message._id.toString(),
          content: content.trim(),
          edited: true,
          editedAt: message.editedAt
        });

      } catch (error) {
        console.error('Edit message error:', error);
        socket.emit('error', { message: 'Failed to edit message / 编辑消息失败' });
      }
    });

    // 删除消息 / Delete message
    socket.on('deleteMessage', async (data) => {
      try {
        const { messageId } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found / 消息不存在' });
          return;
        }

        // 检查权限：只有消息发送者或管理员可以删除 / Check permission: only sender or admin can delete
        const channel = await Channel.findById(message.channelId);
        const isMessageOwner = message.userId === socket.userId;
        const isChannelAdmin = socket.user.roles.includes('super') || socket.user.roles.includes('groupAdmin');

        if (!isMessageOwner && !isChannelAdmin) {
          socket.emit('error', { message: 'No permission to delete this message / 无权限删除该消息' });
          return;
        }

        // 删除消息 / Delete message
        await message.delete();

        // 广播消息删除 / Broadcast message deletion
        io.to(message.channelId).emit('messageDeleted', {
          messageId: message._id.toString(),
          deletedBy: socket.userId
        });

      } catch (error) {
        console.error('Delete message error:', error);
        socket.emit('error', { message: 'Failed to delete message / 删除消息失败' });
      }
    });

    // 正在输入状态 / Typing status
    socket.on('typing', (data) => {
      const { channelId, isTyping } = data;
      if (channelId) {
        socket.to(channelId).emit('userTyping', {
          userId: socket.userId,
          username: socket.user.username || socket.user.email,
          channelId,
          isTyping
        });
      }
    });

    // 视频通话信号 / Video call signaling
    socket.on('videoCall', (data) => {
      const { targetUserId, type, payload } = data;

      const targetUser = onlineUsers.get(targetUserId);
      if (targetUser) {
        io.to(targetUser.socketId).emit('videoCall', {
          fromUserId: socket.userId,
          fromUserData: socket.user.toSafeJSON(),
          type,
          payload
        });
      }
    });

    // 断开连接处理 / Disconnect handling
    socket.on('disconnect', (reason) => {
      console.log(`👋 User disconnected: ${socket.user.username || socket.user.email} (${socket.id}) - ${reason}`);

      // 从在线用户列表中移除 / Remove from online users list
      const userInfo = onlineUsers.get(socket.userId);
      if (userInfo) {
        // 通知当前频道其他用户该用户离开 / Notify other users in current channel that user left
        if (userInfo.currentChannelId) {
          socket.to(userInfo.currentChannelId).emit('userLeftChannel', {
            userId: socket.userId,
            channelId: userInfo.currentChannelId,
            userData: socket.user.toSafeJSON()
          });
        }

        onlineUsers.delete(socket.userId);
      }

      userSockets.delete(socket.id);

      // 通知用户下线 / Notify user offline
      socket.broadcast.emit('userOffline', {
        userId: socket.userId,
        userData: socket.user.toSafeJSON()
      });
    });
  });

  // 获取在线用户数量 / Get online users count
  function getOnlineUsersCount() {
    return onlineUsers.size;
  }

  // 获取在线用户列表 / Get online users list
  function getOnlineUsers() {
    return Array.from(onlineUsers.values()).map(user => user.userData);
  }

  // 向特定用户发送消息 / Send message to specific user
  function sendToUser(userId, event, data) {
    const userInfo = onlineUsers.get(userId);
    if (userInfo) {
      io.to(userInfo.socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // 向特定频道发送消息 / Send message to specific channel
  function sendToChannel(channelId, event, data) {
    io.to(channelId).emit(event, data);
  }

  // 导出功能函数 / Export utility functions
  return {
    getOnlineUsersCount,
    getOnlineUsers,
    sendToUser,
    sendToChannel
  };
}

module.exports = socketManager;