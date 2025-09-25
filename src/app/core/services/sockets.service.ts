import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';
import { AppConfig } from '../../app.config';
import { AuthService } from './auth.service';

// Socket.IO服务：处理实时通信，包括聊天消息、用户状态、视频通话信令
// Socket.IO service: Handle real-time communication including chat, user status, video call signaling
@Injectable({ providedIn: 'root' })
export class SocketsService {
  private socket: Socket | null = null;
  private connectedSubject = new BehaviorSubject<boolean>(false);
  public connected$ = this.connectedSubject.asObservable();

  constructor(private authService: AuthService) {
    // 监听认证状态变化 / Listen to authentication status changes
    this.authService.currentUser$.subscribe(user => {
      if (user && this.authService.getToken()) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  // 连接到Socket.IO服务器 / Connect to Socket.IO server
  private connect(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.warn('No auth token available for socket connection');
      return;
    }

    // 如果已连接，先断开 / Disconnect if already connected
    if (this.socket?.connected) {
      this.socket.disconnect();
    }

    // 建立新连接 / Establish new connection
    this.socket = io(AppConfig.apiUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    // 连接事件处理 / Connection event handlers
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.connectedSubject.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.connectedSubject.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔥 Socket connection error:', error);
      this.connectedSubject.next(false);
    });

    // 认证错误处理 / Authentication error handling
    this.socket.on('error', (error) => {
      console.error('🔒 Socket authentication error:', error);
      if (error.message?.includes('Authentication')) {
        // 认证失败，可能需要重新登录 / Auth failed, might need re-login
        this.authService.refreshToken().subscribe({
          next: () => {
            // 令牌刷新成功，重新连接 / Token refreshed, reconnect
            this.connect();
          },
          error: () => {
            // 令牌刷新失败，清除认证信息 / Token refresh failed, clear auth
            console.log('Token refresh failed, logging out...');
          }
        });
      }
    });
  }

  // 断开Socket.IO连接 / Disconnect from Socket.IO server
  private disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectedSubject.next(false);
      console.log('🔌 Socket disconnected manually');
    }
  }

  // 检查是否已连接 / Check if connected
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // 加入频道 / Join channel
  joinChannel(channelId: string): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot join channel');
      return;
    }

    this.socket.emit('joinChannel', { channelId });
    console.log(`📢 Joining channel: ${channelId}`);
  }

  // 离开频道 / Leave channel
  leaveChannel(channelId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('leaveChannel', { channelId });
    console.log(`📤 Leaving channel: ${channelId}`);
  }

  // 发送消息 / Send message
  sendMessage(payload: {
    channelId: string;
    content: string;
    type?: string;
    imageUrl?: string;
    fileUrl?: string;
    fileName?: string;
  }): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot send message');
      return;
    }

    this.socket.emit('sendMessage', payload);
  }

  // 编辑消息 / Edit message
  editMessage(messageId: string, content: string): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('editMessage', { messageId, content });
  }

  // 删除消息 / Delete message
  deleteMessage(messageId: string): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('deleteMessage', { messageId });
  }

  // 发送输入状态 / Send typing status
  sendTypingStatus(channelId: string, isTyping: boolean): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('typing', { channelId, isTyping });
  }

  // 发送视频通话信令 / Send video call signaling
  sendVideoCallSignal(targetUserId: string, type: string, payload: any): void {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('videoCall', { targetUserId, type, payload });
  }

  // 监听新消息 / Listen for new messages
  onNewMessage(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on('newMessage', (message: any) => {
        observer.next(message);
      });

      // 清理函数 / Cleanup function
      return () => {
        this.socket?.off('newMessage');
      };
    });
  }

  // 监听消息编辑 / Listen for message edits
  onMessageEdited(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on('messageEdited', (data: any) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off('messageEdited');
      };
    });
  }

  // 监听消息删除 / Listen for message deletions
  onMessageDeleted(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on('messageDeleted', (data: any) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off('messageDeleted');
      };
    });
  }

  // 监听聊天历史 / Listen for chat history
  onChatHistory(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on('chatHistory', (data: any) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off('chatHistory');
      };
    });
  }

  // 监听用户加入频道 / Listen for user joining channel
  onUserJoinedChannel(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on('userJoinedChannel', (data: any) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off('userJoinedChannel');
      };
    });
  }

  // 监听用户离开频道 / Listen for user leaving channel
  onUserLeftChannel(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on('userLeftChannel', (data: any) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off('userLeftChannel');
      };
    });
  }

  // 监听用户输入状态 / Listen for user typing status
  onUserTyping(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on('userTyping', (data: any) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off('userTyping');
      };
    });
  }

  // 监听在线用户列表 / Listen for online users list
  onOnlineUsers(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on('onlineUsers', (users: any[]) => {
        observer.next(users);
      });

      return () => {
        this.socket?.off('onlineUsers');
      };
    });
  }

  // 监听用户上线 / Listen for user online
  onUserOnline(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on('userOnline', (data: any) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off('userOnline');
      };
    });
  }

  // 监听用户下线 / Listen for user offline
  onUserOffline(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on('userOffline', (data: any) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off('userOffline');
      };
    });
  }

  // 监听视频通话信令 / Listen for video call signals
  onVideoCall(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on('videoCall', (data: any) => {
        observer.next(data);
      });

      return () => {
        this.socket?.off('videoCall');
      };
    });
  }

  // 监听错误事件 / Listen for error events
  onError(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) {
        observer.error('Socket not initialized');
        return;
      }

      this.socket.on('error', (error: any) => {
        observer.next(error);
      });

      return () => {
        this.socket?.off('error');
      };
    });
  }
}
