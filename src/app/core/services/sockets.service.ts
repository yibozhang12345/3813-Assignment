import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AppConfig } from '../../app.config';

@Injectable({ providedIn: 'root' })
export class SocketsService {
  private socket!: Socket;

  constructor() {
    this.socket = io(AppConfig.apiUrl);
  }

  /** 加入频道（让 server.js 把此 socket 加入指定“房间”） */
  joinChannel(channelId: string) {
    this.socket.emit('joinChannel', { channelId });
  }

  /** 发送消息，必须携带 channelId 才能按频道分发 */
  sendMessage(payload: { user: string; text: string; groupId?: string; channelId?: string }) {
    this.socket.emit('newmsg', payload);
  }

  /** 订阅消息流 */
  onMessage(): Observable<any> {
    return new Observable(obs => {
      this.socket.on('newmsg', (m: any) => obs.next(m));
    });
  }
}
