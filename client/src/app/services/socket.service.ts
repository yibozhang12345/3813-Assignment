import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Message } from '../models/group.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private readonly SERVER_URL = 'http://localhost:3000';

  constructor(private authService: AuthService) {}

  connect(): void {
    if (this.socket && this.socket.connected) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('User not logged in, cannot connect to Socket.IO');
      return;
    }

    this.socket = io(this.SERVER_URL, {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO connected successfully:', this.socket?.id);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinChannel(channelId: string): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    console.log('Joining channel with currentUser:', currentUser);
    if (!currentUser) {
      console.error('User not logged in');
      return;
    }

    console.log('CurrentUser ID:', currentUser.id);
    console.log('CurrentUser _id:', currentUser._id);

    this.socket.emit('join-channel', {
      channelId,
      user: {
        id: currentUser.id || currentUser._id,
        username: currentUser.username,
        roles: currentUser.roles
      }
    });
    console.log('Joined channel:', channelId);
  }

  leaveChannel(channelId: string): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('User not logged in');
      return;
    }

    this.socket.emit('leave-channel', {
      channelId,
      user: {
        id: currentUser.id,
        username: currentUser.username,
        roles: currentUser.roles
      }
    });
    console.log('Left channel:', channelId);
  }

  sendMessage(channelId: string, message: string, type: 'text' | 'image' | 'file' = 'text', fileUrl?: string, fileSize?: number, mimeType?: string): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    console.log('Sending message with currentUser:', currentUser);
    if (!currentUser) {
      console.error('User not logged in');
      return;
    }

    console.log('CurrentUser ID:', currentUser.id);
    console.log('CurrentUser _id:', currentUser._id);

    this.socket.emit('send-message', {
      channelId,
      message,
      user: {
        id: currentUser.id || currentUser._id,
        username: currentUser.username,
        roles: currentUser.roles
      },
      type,
      fileUrl,
      fileSize,
      mimeType
    });
  }

  onMessageReceived(callback: (message: Message) => void): void {
    if (!this.socket) {
      console.error('Socket not connected');
      return;
    }

    this.socket.on('receive-message', (data: any) => {
      console.log('Message received:', data);

      // Convert to Message object
      const message: Message = {
        id: data.id,
        content: data.content,
        senderId: data.senderId,
        senderUsername: data.senderUsername,
        channelId: data.channelId,
        type: data.type,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        timestamp: data.timestamp
      };

      callback(message);
    });
  }

  onError(callback: (error: any) => void): void {
    if (!this.socket) {
      console.error('Socket未连接');
      return;
    }

    this.socket.on('error', (error: any) => {
      callback(error);
    });
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }
}