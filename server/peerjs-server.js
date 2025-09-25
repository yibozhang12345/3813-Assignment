/**
 * PeerJS信令服务器：为视频通话提供WebRTC信令支持
 * PeerJS signaling server: Provides WebRTC signaling support for video calls
 */
const { PeerServer } = require('peer');

const peerServer = PeerServer({
  port: 9000,
  path: '/peerjs',
  debug: true,
  allow_discovery: true,

  // CORS配置 / CORS configuration
  corsOptions: {
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
    credentials: true
  }
});

peerServer.on('connection', (client) => {
  console.log(`📞 PeerJS client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`📞 PeerJS client disconnected: ${client.getId()}`);
});

peerServer.on('error', (error) => {
  console.error('🔥 PeerJS server error:', error);
});

console.log('🚀 PeerJS server running on port 9000');
console.log('📍 Path: /peerjs');
console.log('🌐 WebRTC signaling ready for video calls');

module.exports = peerServer;