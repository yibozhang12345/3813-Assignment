/**
 * Socket.IO 客户端封装（Phase 1 占位）
 * - sendMessage: 发送消息到后端
 * - onMessage:   订阅消息流
 * - joinChannel: 加入频道（如果 server.js 使用房间机制）
 */
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AppConfig } from '../../app.config';

@Injectable({ providedIn: 'root' })
export class SocketsService {
  private socket!: Socket;

  constructor() {
    // 建立与后端 Socket 服务连接
    this.socket = io(AppConfig.apiUrl);
  }

  /** 加入频道：与 server.js 的“房间”机制配合（可选） */
  joinChannel(channelId: string) {
    this.socket.emit('joinChannel', { channelId });
  }

  /** 发送消息：包含发言人显示名、文本、群组与频道（可选） */
  sendMessage(payload: { user: string; text: string; groupId?: string; channelId?: string }) {
    this.socket.emit('newmsg', payload);
  }

  /** 订阅消息：返回 Observable 方便组件订阅 */
  onMessage(): Observable<any> {
    return new Observable(obs => {
      this.socket.on('newmsg', (m: any) => obs.next(m));
    });
  }
}
