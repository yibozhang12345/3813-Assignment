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
  console.log('socket connected:', socket.id);

  // 监听前端发送的消息事件，并广播给所有客户端
  socket.on('newmsg', (msg) => {
    console.log('recv:', msg);
    io.emit('newmsg', msg); // 广播给所有客户端
  });

  socket.on('disconnect', () => console.log('socket disconnected:', socket.id));
});

// 启动服务器
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Phase1 server listening on http://localhost:${PORT}`);
});
