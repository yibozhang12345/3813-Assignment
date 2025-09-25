/**
 * 视频通话组件：提供完整的视频通话界面和功能
 * Video call component: Provides complete video call interface and functionality
 */
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VideoCallService, CallState, IncomingCall } from '../../core/services/video-call.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-video-call',
  template: `
  <!-- 视频通话主界面 / Main video call interface -->
  <div class="video-call-container" *ngIf="callState.isInCall">
    <div class="video-area">
      <!-- 远程视频 / Remote video -->
      <div class="remote-video-container">
        <video
          #remoteVideo
          class="remote-video"
          autoplay
          playsinline
          [muted]="false">
        </video>
        <div class="remote-user-info" *ngIf="callState.remoteUserName">
          <span>{{ callState.remoteUserName }}</span>
        </div>
        <div class="call-status" *ngIf="callState.callStatus !== 'connected'">
          {{ getCallStatusText(callState.callStatus) }}
        </div>
      </div>

      <!-- 本地视频 / Local video -->
      <div class="local-video-container">
        <video
          #localVideo
          class="local-video"
          autoplay
          playsinline
          muted
          [class.hidden]="!videoEnabled">
        </video>
        <div class="local-video-placeholder" *ngIf="!videoEnabled">
          <span>📹</span>
        </div>
      </div>
    </div>

    <!-- 通话控制按钮 / Call control buttons -->
    <div class="call-controls">
      <button
        class="control-btn audio-btn"
        [class.disabled]="!audioEnabled"
        (click)="toggleAudio()"
        title="{{ audioEnabled ? 'Mute / 静音' : 'Unmute / 取消静音' }}">
        {{ audioEnabled ? '🎤' : '🔇' }}
      </button>

      <button
        class="control-btn video-btn"
        [class.disabled]="!videoEnabled"
        (click)="toggleVideo()"
        title="{{ videoEnabled ? 'Turn off camera / 关闭摄像头' : 'Turn on camera / 打开摄像头' }}">
        {{ videoEnabled ? '📹' : '📷' }}
      </button>

      <button
        class="control-btn end-btn"
        (click)="endCall()"
        title="End call / 结束通话">
        📞
      </button>
    </div>
  </div>

  <!-- 来电通知 / Incoming call notification -->
  <div class="incoming-call-modal" *ngIf="incomingCall && !callState.isInCall">
    <div class="modal-content">
      <div class="caller-info">
        <h3>{{ 'Incoming call from / 来自以下用户的来电' }}</h3>
        <div class="caller-name">{{ incomingCall.fromUserName }}</div>
      </div>

      <div class="call-actions">
        <button class="answer-btn" (click)="answerCall()">
          <span class="btn-icon">📞</span>
          <span>{{ 'Answer / 接听' }}</span>
        </button>
        <button class="reject-btn" (click)="rejectCall()">
          <span class="btn-icon">📞</span>
          <span>{{ 'Reject / 拒绝' }}</span>
        </button>
      </div>
    </div>
  </div>

  <!-- 错误提示 / Error notification -->
  <div class="error-notification" *ngIf="errorMessage">
    <div class="error-content">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ errorMessage }}</span>
      <button class="error-close" (click)="clearError()">❌</button>
    </div>
  </div>
  `,
  styles: [`
    .video-call-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #000;
      z-index: 1000;
      display: flex;
      flex-direction: column;
    }

    .video-area {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .remote-video-container {
      width: 100%;
      height: 100%;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a1a1a;
    }

    .remote-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .remote-user-info {
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
    }

    .call-status {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      font-size: 1.1rem;
      text-align: center;
    }

    .local-video-container {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 200px;
      height: 150px;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid #333;
      background: #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .local-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .local-video.hidden {
      display: none;
    }

    .local-video-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-size: 2rem;
      color: #666;
    }

    .call-controls {
      display: flex;
      justify-content: center;
      gap: 1rem;
      padding: 2rem;
      background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
    }

    .control-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .audio-btn, .video-btn {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .audio-btn:hover, .video-btn:hover {
      background: rgba(255,255,255,0.3);
      transform: scale(1.1);
    }

    .audio-btn.disabled, .video-btn.disabled {
      background: rgba(255,0,0,0.7);
    }

    .end-btn {
      background: #dc3545;
      color: white;
      transform: rotate(225deg);
    }

    .end-btn:hover {
      background: #c82333;
      transform: rotate(225deg) scale(1.1);
    }

    .incoming-call-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.9);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .caller-info h3 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1.2rem;
    }

    .caller-name {
      font-size: 1.5rem;
      font-weight: bold;
      color: #007bff;
      margin-bottom: 2rem;
    }

    .call-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .answer-btn, .reject-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      border: none;
      border-radius: 8px;
      font-size: 0.9rem;
      cursor: pointer;
      min-width: 100px;
      transition: all 0.3s ease;
    }

    .answer-btn {
      background: #28a745;
      color: white;
    }

    .answer-btn:hover {
      background: #218838;
      transform: translateY(-2px);
    }

    .reject-btn {
      background: #dc3545;
      color: white;
    }

    .reject-btn:hover {
      background: #c82333;
      transform: translateY(-2px);
    }

    .btn-icon {
      font-size: 1.5rem;
    }

    .error-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 3000;
      background: #dc3545;
      color: white;
      border-radius: 8px;
      padding: 1rem;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .error-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .error-text {
      flex: 1;
      font-size: 0.9rem;
    }

    .error-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 1rem;
    }

    @media (max-width: 768px) {
      .local-video-container {
        width: 120px;
        height: 90px;
        top: 10px;
        right: 10px;
      }

      .call-controls {
        padding: 1rem;
        gap: 0.5rem;
      }

      .control-btn {
        width: 50px;
        height: 50px;
        font-size: 1.2rem;
      }

      .modal-content {
        padding: 1.5rem;
      }

      .call-actions {
        flex-direction: column;
        gap: 1rem;
      }

      .answer-btn, .reject-btn {
        width: 100%;
      }
    }
  `],
  imports: [CommonModule],
})
export class VideoCallComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;

  private destroy$ = new Subject<void>();

  callState: CallState = {
    isInCall: false,
    isInitiator: false,
    callStatus: 'idle'
  };

  incomingCall: IncomingCall | null = null;
  errorMessage = '';
  audioEnabled = true;
  videoEnabled = true;

  constructor(
    private videoCallService: VideoCallService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // 订阅通话状态变化 / Subscribe to call state changes
    this.videoCallService.callState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.callState = state;
        this.updateVideoStreams();
      });

    // 订阅来电通知 / Subscribe to incoming calls
    this.videoCallService.incomingCall$
      .pipe(takeUntil(this.destroy$))
      .subscribe(call => {
        this.incomingCall = call;
      });

    // 订阅错误消息 / Subscribe to error messages
    this.videoCallService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.errorMessage = error;
        // 3秒后自动清除错误消息 / Auto clear error after 3 seconds
        setTimeout(() => this.clearError(), 3000);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 更新视频流 / Update video streams
  private updateVideoStreams() {
    if (this.localVideoRef && this.callState.localStream) {
      this.localVideoRef.nativeElement.srcObject = this.callState.localStream;
    }

    if (this.remoteVideoRef && this.callState.remoteStream) {
      this.remoteVideoRef.nativeElement.srcObject = this.callState.remoteStream;
    }
  }

  // 接听来电 / Answer incoming call
  async answerCall() {
    if (!this.incomingCall) return;

    try {
      await this.videoCallService.answerCall(this.incomingCall);
      this.incomingCall = null;
    } catch (error) {
      console.error('Failed to answer call:', error);
    }
  }

  // 拒绝来电 / Reject incoming call
  rejectCall() {
    if (!this.incomingCall) return;

    this.videoCallService.rejectCall(this.incomingCall);
    this.incomingCall = null;
  }

  // 结束通话 / End call
  endCall() {
    this.videoCallService.endCall();
  }

  // 切换音频 / Toggle audio
  toggleAudio() {
    this.audioEnabled = this.videoCallService.toggleAudio();
  }

  // 切换视频 / Toggle video
  toggleVideo() {
    this.videoEnabled = this.videoCallService.toggleVideo();
  }

  // 清除错误消息 / Clear error message
  clearError() {
    this.errorMessage = '';
  }

  // 获取通话状态文本 / Get call status text
  getCallStatusText(status: string): string {
    const statusTexts: { [key: string]: string } = {
      'calling': 'Calling... / 呼叫中...',
      'ringing': 'Ringing... / 响铃中...',
      'connected': 'Connected / 已连接',
      'ended': 'Call ended / 通话结束',
      'error': 'Call error / 通话错误'
    };
    return statusTexts[status] || status;
  }

  // 发起通话到指定用户 / Initiate call to specific user
  async initiateCall(targetUserId: string, targetUserName: string) {
    try {
      await this.videoCallService.initiateCall(targetUserId, targetUserName);
    } catch (error) {
      console.error('Failed to initiate call:', error);
    }
  }

  // 检查是否在通话中 / Check if in call
  get isInCall(): boolean {
    return this.callState.isInCall;
  }
}