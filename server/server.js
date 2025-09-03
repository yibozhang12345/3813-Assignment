// server/server.js
// -------------------------------
// Phase 1: Express + Socket.IO (rooms by channel)
// 仅为演示/作业使用：没有数据库与鉴权
// -------------------------------

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || 'http://localhost:4200';

const app = express();
app.use(cors({ origin: FRONT_ORIGIN })); // 允许 Angular 前端跨域
app.use(express.json());

// ---------------- Mock APIs（可选） ----------------

// 示例：简单登录（密码=123 则通过），返回一个“用户对象”用于前端显示
app.post('/api/auth/login', (req, res) => {
  const { username, email, password } = req.body || {};
  if (password !== '123') return res.status(401).json({ error: 'invalid credentials' });

  // 最简用户对象（Phase 1）
  const name = (username && username.trim()) || (email && email.trim()) || 'user';
  const mock = {
    id: 'u_mock',
    username: name,
    email: email || `${name}@example.com`,
    roles: name === 'super' ? ['super'] : ['user'],
    groups: ['g1'], // 示例：默认在 g1
  };
  return res.json(mock);
});

// 示例：返回群组
app.get('/api/groups', (_req, res) => {
  res.json([{ id: 'g1', name: 'General' }, { id: 'g2', name: 'Tech' }]);
});

// -------------------------------------------------

// 创建 HTTP + Socket.IO 服务器
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: FRONT_ORIGIN, methods: ['GET', 'POST'] },
});

// ---- Socket.IO：按频道分房间分发消息 ---- //
// 事件命名：
// - joinChannel:  客户端选择频道后调用，加入对应房间
// - leaveChannel: 客户端切换/离开频道（可选）
// - newmsg:       发送消息，要求 payload.channelId 存在
io.on('connection', (socket) => {
  console.log('[io] connected:', socket.id);

  // 加入频道（房间）
  socket.on('joinChannel', ({ channelId }) => {
    // 先离开除自身默认房间外的所有房间，避免收到其它频道消息
    for (const room of socket.rooms) {
      if (room !== socket.id) socket.leave(room);
    }

    if (channelId) {
      socket.join(channelId);
      console.log(`[io] ${socket.id} joined room ${channelId}`);
      // 也可回发一个确认
      socket.emit('joined', { channelId });
    }
  });

  // 可选：主动离开频道
  socket.on('leaveChannel', ({ channelId }) => {
    if (channelId) {
      socket.leave(channelId);
      console.log(`[io] ${socket.id} left room ${channelId}`);
    }
  });

  // 收到前端消息：{ user, roles?, text, groupId?, channelId }
  socket.on('newmsg', (payload = {}) => {
    const { channelId, user, roles, text } = payload;

    // 基本校验：必须带 channelId
    if (!channelId) {
      console.warn('[io] newmsg dropped: missing channelId');
      return;
    }
    if (!text || !String(text).trim()) {
      console.warn('[io] newmsg dropped: empty text');
      return;
    }

    // 规范化消息（服务器时间戳等可附加）
    const out = {
      user: user || 'Anonymous',
      roles: Array.isArray(roles) ? roles : [],
      text: String(text),
      channelId,
      ts: Date.now(),
    };

    // 仅广播给该频道房间
    io.to(channelId).emit('newmsg', out);
    console.log(`[io] msg -> room ${channelId}:`, `${out.user}(${out.roles.join(',')})`, out.text);
  });

  socket.on('disconnect', () => {
    console.log('[io] disconnected:', socket.id);
  });
});

// 启动
server.listen(PORT, () => {
  console.log(`Phase 1 server listening on http://localhost:${PORT}`);
  console.log(`CORS allowed origin: ${FRONT_ORIGIN}`);
});
