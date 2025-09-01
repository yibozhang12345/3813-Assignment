//占位
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketsService {
  private socket!: Socket;
  constructor() { this.socket = io('http://localhost:3000'); }

  joinChannel(channelId: string) {
    this.socket.emit('joinChannel', { channelId });
  }

  sendMessage(payload: { user: string; text: string; groupId?: string; channelId?: string }) {
    this.socket.emit('newmsg', payload);
  }

  onMessage(): Observable<any> {
    return new Observable(obs => {
      this.socket.on('newmsg', (m: any) => obs.next(m));
    });
  }
}
