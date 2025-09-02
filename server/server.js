const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(cors({ origin: 'http://localhost:4200' })); // 允许来自 Angular 前端的跨域请求
app.use(express.json()); // 支持 JSON 格式的请求体

// ---- Mock APIs (Phase 1) ---- //

// 一个模拟用户（Phase 1 阶段不接数据库，直接写死数据）
const MOCK_USER = { username: 'super', email: 'super@x.com', roles: ['super'] };

// 登录接口：用户名=super 且密码=123 时返回成功；其他情况返回 401
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if ((username === 'super' && password === '123') || password === '123') {
    return res.json({ ...MOCK_USER, username });
  }
  return res.status(401).json({ error: 'invalid credentials' });
});

// 群组接口（仅返回一个示例组）
app.get('/api/groups', (_req, res) => {
  res.json([{ id: 'g1', name: 'General' }]);
});

// ---- Socket.IO (Phase 1 占位) ---- //
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:4200', methods: ['GET', 'POST'] }
});

// 监听客户端连接
io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  // 客户端选中频道时调用：{ channelId }
  socket.on('joinChannel', ({ channelId }) => {
    // 离开之前所有房间（默认房间除外）
    for (const room of socket.rooms) {
      if (room !== socket.id) socket.leave(room);
    }
    if (channelId) {
      socket.join(channelId);
      console.log(`${socket.id} joined room ${channelId}`);
    }
  });

  // 发消息：{ user, text, groupId?, channelId? }
  socket.on('newmsg', (payload) => {
    const { channelId } = payload || {};
    if (channelId) {
      // 只发给该频道房间
      io.to(channelId).emit('newmsg', payload);
    } else {
      // 兜底：未带频道则全局广播
      io.emit('newmsg', payload);
    }
  });

  socket.on('disconnect', () => console.log('disconnected:', socket.id));
});

