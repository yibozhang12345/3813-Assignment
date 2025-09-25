/**
 * 聊天页面：群组和频道聊天，支持文本、图片消息，使用MongoDB后端API和Socket.IO实时通信
 * Chat page: Group and channel chat with text and image support, using MongoDB backend API and Socket.IO real-time communication
 */
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { GroupService } from '../../core/services/group.service';
import { SocketsService } from '../../core/services/sockets.service';
import { VideoCallService } from '../../core/services/video-call.service';
import { VideoCallComponent } from '../../components/video-call/video-call.component';
import { Group, Channel, User } from '../../core/models';

interface Message {
  _id: string;
  content: string;
  type: 'text' | 'image' | 'file';
  user: User;
  channelId: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  timestamp: Date;
  edited?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-chat',
  template: `
  <div class="chat-container" *ngIf="auth.isLoggedIn(); else needLogin">
    <h3>{{ 'Chat / 聊天' }}</h3>

    <div class="chat-layout">
      <!-- 左侧：群组和频道列表 / Left side: Groups and channels list -->
      <div class="sidebar">
        <div class="section">
          <h4>{{ 'My Groups / 我的群组' }}</h4>
          <div class="loading" *ngIf="loadingGroups">{{ 'Loading... / 加载中...' }}</div>
          <ul class="group-list">
            <li *ngFor="let g of myGroups"
                [class.active]="g._id === activeGroupId"
                (click)="selectGroup(g)">
              {{ g.name }}
            </li>
          </ul>
        </div>

        <div class="section" *ngIf="activeGroupId">
          <h4>{{ 'Channels / 频道' }}</h4>
          <div class="loading" *ngIf="loadingChannels">{{ 'Loading... / 加载中...' }}</div>
          <ul class="channel-list">
            <li *ngFor="let c of channels"
                [class.active]="c._id === activeChannelId"
                (click)="selectChannel(c)">
              #{{ c.name }}
            </li>
          </ul>
        </div>
      </div>

      <!-- 右侧：聊天区域 / Right side: Chat area -->
      <div class="chat-area">
        <div class="chat-header" *ngIf="activeChannel">
          <div class="header-info">
            <h4>#{{ activeChannel.name }}</h4>
            <div class="small">{{ activeChannel.description }}</div>
          </div>
          <div class="header-actions">
            <button
              class="video-call-btn"
              (click)="showOnlineUsersModal()"
              [disabled]="videoCallService.isInCall()"
              title="Start video call / 开始视频通话">
              📹 {{ 'Video Call / 视频通话' }}
            </button>
          </div>
        </div>

        <div class="messages-container" #messagesContainer>
          <div class="no-channel" *ngIf="!activeChannelId">
            {{ 'Select a channel to start chatting / 选择频道开始聊天' }}
          </div>

          <div class="loading" *ngIf="loadingMessages">
            {{ 'Loading messages... / 加载消息中...' }}
          </div>

          <div class="message" *ngFor="let msg of messages; trackBy: trackMessage">
            <div class="message-header">
              <img
                [src]="msg.user.avatarUrl || '/assets/default-avatar.svg'"
                alt="Avatar"
                class="message-avatar"
                (error)="onAvatarError($event)">
              <span class="message-user">{{ msg.user.username }}</span>
              <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
              <span class="edited" *ngIf="msg.edited">{{ '(edited / 已编辑)' }}</span>
            </div>
            <div class="message-content">
              <div *ngIf="msg.type === 'text'" class="text-content">
                {{ msg.content }}
              </div>
              <div *ngIf="msg.type === 'image'" class="image-content">
                <img [src]="msg.imageUrl" alt="Image" class="message-image" (click)="openImageModal(msg.imageUrl!)">
                <div class="small" *ngIf="msg.content">{{ msg.content }}</div>
              </div>
              <div *ngIf="msg.type === 'file'" class="file-content">
                <a [href]="msg.fileUrl" target="_blank" class="file-link">
                  📎 {{ msg.fileName }}
                </a>
                <div class="small" *ngIf="msg.content">{{ msg.content }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 消息输入区域 / Message input area -->
        <div class="message-input" *ngIf="activeChannelId">
          <div class="input-row">
            <button type="button" class="attachment-btn" (click)="fileInput.click()" title="Upload image / 上传图片">
              📷
            </button>
            <input
              class="text-input"
              [(ngModel)]="messageText"
              name="messageText"
              placeholder="Type a message... / 输入消息..."
              (keydown.enter)="sendMessage()"
              [disabled]="sending">
            <button
              class="send-btn"
              (click)="sendMessage()"
              [disabled]="(!messageText.trim() && !selectedFile) || sending">
              {{ sending ? 'Sending... / 发送中...' : 'Send / 发送' }}
            </button>
          </div>

          <!-- 文件上传预览 / File upload preview -->
          <div class="file-preview" *ngIf="selectedFile">
            <div class="preview-content">
              <img *ngIf="previewUrl" [src]="previewUrl" alt="Preview" class="preview-image">
              <div class="file-info">
                <div class="file-name">{{ selectedFile.name }}</div>
                <div class="file-size">{{ formatFileSize(selectedFile.size) }}</div>
              </div>
              <button type="button" class="remove-btn" (click)="removeFile()">❌</button>
            </div>
          </div>

          <input
            #fileInput
            type="file"
            accept="image/*"
            (change)="onFileSelected($event)"
            style="display: none;">
        </div>
      </div>
    </div>
  </div>

  <!-- 图片模态框 / Image modal -->
  <div class="modal" *ngIf="modalImageUrl" (click)="closeImageModal()">
    <div class="modal-content">
      <img [src]="modalImageUrl" alt="Full size image">
      <button class="modal-close" (click)="closeImageModal()">❌</button>
    </div>
  </div>

  <!-- 在线用户模态框 / Online users modal -->
  <div class="modal" *ngIf="showUsersModal" (click)="closeUsersModal()">
    <div class="modal-content users-modal" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <h3>{{ 'Start Video Call / 开始视频通话' }}</h3>
        <button class="modal-close" (click)="closeUsersModal()">❌</button>
      </div>

      <div class="modal-body">
        <div class="loading" *ngIf="loadingUsers">{{ 'Loading users... / 加载用户中...' }}</div>

        <div class="user-list" *ngIf="!loadingUsers">
          <div class="user-item" *ngFor="let user of onlineUsers" (click)="startVideoCall(user)">
            <img
              [src]="user.avatarUrl || '/assets/default-avatar.svg'"
              alt="Avatar"
              class="user-avatar"
              (error)="onAvatarError($event)">
            <div class="user-info">
              <div class="user-name">{{ user.username }}</div>
              <div class="user-status">{{ 'Online / 在线' }}</div>
            </div>
            <div class="call-btn">📞</div>
          </div>

          <div class="no-users" *ngIf="onlineUsers.length === 0">
            {{ 'No online users available for video call / 没有在线用户可进行视频通话' }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 视频通话组件 / Video call component -->
  <app-video-call></app-video-call>

  <ng-template #needLogin>
    <div class="card">
      {{ 'Please' }} <a routerLink="/login">{{ 'login / 登录' }}</a> {{ 'to use chat / 使用聊天功能' }}
    </div>
  </ng-template>
  `,
  styles: [`
    .chat-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 1rem;
    }
    .chat-layout {
      display: flex;
      flex: 1;
      gap: 1rem;
      min-height: 0;
    }
    .sidebar {
      width: 250px;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
      background: #f8f9fa;
      overflow-y: auto;
    }
    .section {
      margin-bottom: 1.5rem;
    }
    .section h4 {
      margin: 0 0 0.5rem 0;
      color: #495057;
      font-size: 0.9rem;
      text-transform: uppercase;
    }
    .group-list, .channel-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .group-list li, .channel-list li {
      padding: 0.5rem;
      margin: 0.2rem 0;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .group-list li:hover, .channel-list li:hover {
      background-color: #e9ecef;
    }
    .group-list li.active, .channel-list li.active {
      background-color: #007bff;
      color: white;
    }
    .chat-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: white;
      min-height: 0;
    }
    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #ddd;
      background: #f8f9fa;
    }
    .header-info h4 {
      margin: 0 0 0.25rem 0;
    }
    .header-actions {
      display: flex;
      gap: 0.5rem;
    }
    .video-call-btn {
      padding: 0.5rem 1rem;
      background-color: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .video-call-btn:hover:not(:disabled) {
      background-color: #218838;
    }
    .video-call-btn:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }
    .messages-container {
      flex: 1;
      padding: 1rem;
      overflow-y: auto;
      min-height: 0;
    }
    .no-channel {
      text-align: center;
      color: #6c757d;
      margin-top: 2rem;
    }
    .loading {
      text-align: center;
      color: #6c757d;
      padding: 1rem;
    }
    .message {
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #f1f3f4;
    }
    .message:last-child {
      border-bottom: none;
    }
    .message-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }
    .message-user {
      font-weight: bold;
      color: #495057;
    }
    .message-time {
      color: #6c757d;
      font-size: 0.8rem;
    }
    .edited {
      color: #6c757d;
      font-size: 0.75rem;
      font-style: italic;
    }
    .message-content {
      margin-left: 42px;
    }
    .text-content {
      white-space: pre-wrap;
    }
    .image-content {
      margin-top: 0.5rem;
    }
    .message-image {
      max-width: 300px;
      max-height: 200px;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid #ddd;
    }
    .file-content {
      margin-top: 0.5rem;
    }
    .file-link {
      color: #007bff;
      text-decoration: none;
      padding: 0.5rem;
      border: 1px solid #007bff;
      border-radius: 4px;
      display: inline-block;
    }
    .file-link:hover {
      background-color: #007bff;
      color: white;
    }
    .message-input {
      border-top: 1px solid #ddd;
      padding: 1rem;
    }
    .input-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .attachment-btn {
      background: none;
      border: 1px solid #ddd;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      font-size: 1.2rem;
    }
    .attachment-btn:hover {
      background-color: #f8f9fa;
    }
    .text-input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      outline: none;
    }
    .send-btn {
      padding: 0.75rem 1.5rem;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .send-btn:hover:not(:disabled) {
      background-color: #0056b3;
    }
    .send-btn:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }
    .file-preview {
      margin-top: 0.5rem;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #f8f9fa;
    }
    .preview-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .preview-image {
      width: 50px;
      height: 50px;
      object-fit: cover;
      border-radius: 4px;
    }
    .file-info {
      flex: 1;
    }
    .file-name {
      font-weight: bold;
    }
    .file-size {
      font-size: 0.8rem;
      color: #6c757d;
    }
    .remove-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
    }
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
    }
    .modal-content img {
      max-width: 100%;
      max-height: 100%;
      border-radius: 8px;
    }
    .modal-close {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.5);
      color: white;
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      cursor: pointer;
    }
    .small {
      font-size: 0.8rem;
      color: #6c757d;
    }
    .card {
      max-width: 400px;
      margin: 2rem auto;
      padding: 2rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      text-align: center;
    }
    a {
      color: #007bff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .users-modal {
      max-width: 500px;
      width: 90%;
      max-height: 600px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #ddd;
      margin: -1rem -1rem 1rem -1rem;
      background: #f8f9fa;
    }
    .modal-header h3 {
      margin: 0;
      color: #495057;
    }
    .modal-body {
      max-height: 400px;
      overflow-y: auto;
    }
    .user-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .user-item {
      display: flex;
      align-items: center;
      padding: 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .user-item:hover {
      background-color: #f8f9fa;
      border-color: #007bff;
      transform: translateY(-1px);
    }
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      margin-right: 1rem;
    }
    .user-info {
      flex: 1;
    }
    .user-name {
      font-weight: bold;
      color: #495057;
    }
    .user-status {
      font-size: 0.8rem;
      color: #28a745;
    }
    .call-btn {
      font-size: 1.2rem;
      color: #007bff;
    }
    .no-users {
      text-align: center;
      color: #6c757d;
      padding: 2rem;
      font-style: italic;
    }
  `],
  imports: [CommonModule, FormsModule, RouterModule, VideoCallComponent],
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  private destroy$ = new Subject<void>();

  myGroups: Group[] = [];
  channels: Channel[] = [];
  messages: Message[] = [];

  activeGroupId?: string;
  activeChannelId?: string;
  activeChannel?: Channel;

  messageText = '';
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  modalImageUrl: string | null = null;

  // 视频通话相关属性 / Video call related properties
  showUsersModal = false;
  onlineUsers: User[] = [];
  loadingUsers = false;

  loadingGroups = false;
  loadingChannels = false;
  loadingMessages = false;
  sending = false;

  constructor(
    public auth: AuthService,
    private groupService: GroupService,
    private sockets: SocketsService,
    public videoCallService: VideoCallService
  ) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      return;
    }

    this.loadMyGroups();
    this.setupSocketListeners();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMyGroups() {
    this.loadingGroups = true;
    this.groupService.getUserGroups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (groups) => {
          this.myGroups = groups;
          this.loadingGroups = false;
        },
        error: (error) => {
          console.error('Failed to load groups:', error);
          this.loadingGroups = false;
        }
      });
  }

  selectGroup(group: Group) {
    this.activeGroupId = group._id;
    this.activeChannelId = undefined;
    this.activeChannel = undefined;
    this.messages = [];

    this.loadGroupChannels(group._id);
  }

  loadGroupChannels(groupId: string) {
    this.loadingChannels = true;
    this.groupService.getGroupChannels(groupId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (channels) => {
          this.channels = channels;
          this.loadingChannels = false;
        },
        error: (error) => {
          console.error('Failed to load channels:', error);
          this.loadingChannels = false;
        }
      });
  }

  selectChannel(channel: Channel) {
    // 离开之前的频道 / Leave previous channel
    if (this.activeChannelId) {
      this.sockets.leaveChannel(this.activeChannelId);
    }

    this.activeChannelId = channel._id;
    this.activeChannel = channel;
    this.messages = [];

    // 加入新频道 / Join new channel
    this.sockets.joinChannel(channel._id);
    this.loadChannelMessages(channel._id);
  }

  loadChannelMessages(channelId: string) {
    this.loadingMessages = true;
    this.groupService.getChannelMessages(channelId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.messages = result.messages;
          this.loadingMessages = false;
          this.scrollToBottom();
        },
        error: (error) => {
          console.error('Failed to load messages:', error);
          this.loadingMessages = false;
        }
      });
  }

  setupSocketListeners() {
    // 监听新消息 / Listen for new messages
    this.sockets.onNewMessage()
      .pipe(takeUntil(this.destroy$))
      .subscribe((message: Message) => {
        if (message.channelId === this.activeChannelId) {
          this.messages.push(message);
          this.scrollToBottom();
        }
      });

    // 监听消息编辑 / Listen for message edits
    this.sockets.onMessageEdited()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: {messageId: string, content: string}) => {
        const message = this.messages.find(m => m._id === data.messageId);
        if (message) {
          message.content = data.content;
          message.edited = true;
        }
      });

    // 监听消息删除 / Listen for message deletions
    this.sockets.onMessageDeleted()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: {messageId: string}) => {
        this.messages = this.messages.filter(m => m._id !== data.messageId);
      });
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    // 文件类型验证 / File type validation
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file / 请选择图片文件');
      return;
    }

    // 文件大小验证 (10MB) / File size validation (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file must be less than 10MB / 图片文件必须小于10MB');
      return;
    }

    this.selectedFile = file;

    // 创建预览 / Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeFile() {
    this.selectedFile = null;
    this.previewUrl = null;
  }

  sendMessage() {
    if (!this.activeChannelId || this.sending) return;
    if (!this.messageText.trim() && !this.selectedFile) return;

    this.sending = true;

    if (this.selectedFile) {
      // 上传图片并发送消息 / Upload image and send message
      this.groupService.uploadFile(this.selectedFile, 'image').subscribe({
        next: (uploadResult) => {
          this.sockets.sendMessage({
            channelId: this.activeChannelId!,
            content: this.messageText.trim(),
            type: 'image',
            imageUrl: uploadResult.url
          });

          this.messageText = '';
          this.removeFile();
          this.sending = false;
        },
        error: (error) => {
          console.error('Failed to upload image:', error);
          alert('Failed to upload image / 图片上传失败');
          this.sending = false;
        }
      });
    } else {
      // 发送文本消息 / Send text message
      this.sockets.sendMessage({
        channelId: this.activeChannelId!,
        content: this.messageText.trim(),
        type: 'text'
      });

      this.messageText = '';
      this.sending = false;
    }
  }

  trackMessage(index: number, message: Message): string {
    return message._id;
  }

  formatTime(timestamp: Date): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onAvatarError(event: any) {
    event.target.src = '/assets/default-avatar.svg';
  }

  openImageModal(imageUrl: string) {
    this.modalImageUrl = imageUrl;
  }

  closeImageModal() {
    this.modalImageUrl = null;
  }

  // 显示在线用户模态框 / Show online users modal
  showOnlineUsersModal() {
    this.showUsersModal = true;
    this.loadOnlineUsers();
  }

  // 关闭用户模态框 / Close users modal
  closeUsersModal() {
    this.showUsersModal = false;
    this.onlineUsers = [];
  }

  // 加载在线用户 / Load online users
  loadOnlineUsers() {
    this.loadingUsers = true;
    // 监听在线用户列表 / Listen for online users list
    this.sockets.onOnlineUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe((users: User[]) => {
        const currentUser = this.auth.getCurrentUser();
        // 过滤掉当前用户 / Filter out current user
        this.onlineUsers = users.filter(user => user._id !== currentUser?._id);
        this.loadingUsers = false;
      });
  }

  // 开始视频通话 / Start video call
  async startVideoCall(targetUser: User) {
    try {
      await this.videoCallService.initiateCall(targetUser._id, targetUser.username);
      this.closeUsersModal();
    } catch (error) {
      console.error('Failed to start video call:', error);
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }
}
