import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import fs from 'fs';
import multer from 'multer';

import authRouter, { authMiddleware } from './routes/auth.js';
import usersRouter from './routes/users.js';
import groupsRouter from './routes/groups.js';
import channelsRouter from './routes/channels.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const DB_NAME   = process.env.DB_NAME   || 'chat3813';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// --- 静态上传目录 ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// --- 连接 MongoDB（原生驱动） ---
export const client = new MongoClient(MONGO_URL);
await client.connect();
console.log('[mongo] connected:', MONGO_URL);
export const db = client.db(DB_NAME);

export const colUsers    = db.collection('users');
export const colGroups   = db.collection('groups');
export const colChannels = db.collection('channels');
export const colMessages = db.collection('messages'); // { channelId, ts, type, text?, imageUrl?, meta? }

// --- 默认用户 super / 123（若不存在则创建） ---
const superExists = await colUsers.findOne({ username: 'super' });
if (!superExists) {
  const hash = await bcrypt.hash('123', 10);
  await colUsers.insertOne({
    username: 'super',
    password: hash,             // 存哈希，不存明文
    email: 'super@example.com',
    roles: ['super'],
    groups: []
  });
  console.log('[seed] created default user: super / 123');
}

// --- Multer 上传中间件（供 channels 路由使用） ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = Date.now() + '-' + Math.random().toString(36).slice(2);
    cb(null, base + ext);
  }
});
export const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

// --- 路由 ---
app.use('/api/auth', authRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/groups', authMiddleware, groupsRouter);
app.use('/api/channels', authMiddleware, channelsRouter);

// --- Socket.IO 在线与消息广播 ---
const online = new Map(); // username -> socketId

io.on('connection', (socket) => {
  socket.on('hello', (username) => {
    online.set(username, socket.id);
    io.emit('presence', Array.from(online.keys()));
  });

  socket.on('joinChannel', ({ channelId, username }) => {
    socket.join(channelId);
    socket.to(channelId).emit('system', `${username} joined`);
  });

  socket.on('leaveChannel', ({ channelId, username }) => {
    socket.leave(channelId);
    socket.to(channelId).emit('system', `${username} left`);
  });

  socket.on('sendMessage', ({ channelId, message }) => {
    io.to(channelId).emit('message', message);
  });

  socket.on('disconnect', () => {
    for (const [name, sid] of online.entries()) {
      if (sid === socket.id) online.delete(name);
    }
    io.emit('presence', Array.from(online.keys()));
  });
});

// --- 启动 ---
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`HTTP: http://localhost:${PORT}`);
});
