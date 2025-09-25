/**
 * 视频通话服务：使用PeerJS进行点对点视频通话，集成Socket.IO信令
 * Video call service: P2P video calling using PeerJS with Socket.IO signaling
 */
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Peer, DataConnection, MediaConnection } from 'peerjs';
import { SocketsService } from './sockets.service';
import { AuthService } from './auth.service';

export interface CallState {
  isInCall: boolean;
  isInitiator: boolean;
  remoteUserId?: string;
  remoteUserName?: string;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'error';
}

export interface IncomingCall {
  fromUserId: string;
  fromUserName: string;
  peerId: string;
}

@Injectable({
  providedIn: 'root'
})
export class VideoCallService implements OnDestroy {
  private peer: Peer | null = null;
  private currentCall: MediaConnection | null = null;
  private destroy$ = new Subject<void>();

  // 呼叫状态管理 / Call state management
  private callStateSubject = new BehaviorSubject<CallState>({
    isInCall: false,
    isInitiator: false,
    callStatus: 'idle'
  });
  public callState$ = this.callStateSubject.asObservable();

  // 来电通知 / Incoming call notifications
  private incomingCallSubject = new Subject<IncomingCall>();
  public incomingCall$ = this.incomingCallSubject.asObservable();

  // 错误处理 / Error handling
  private errorSubject = new Subject<string>();
  public error$ = this.errorSubject.asObservable();

  constructor(
    private socketService: SocketsService,
    private authService: AuthService
  ) {
    this.initializePeer();
    this.setupSocketListeners();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }

  // 初始化PeerJS连接 / Initialize PeerJS connection
  private initializePeer() {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        console.warn('No authenticated user for video call service');
        return;
      }

      // 使用用户ID作为Peer ID，确保唯一性 / Use user ID as Peer ID for uniqueness
      this.peer = new Peer(currentUser._id, {
        host: 'localhost', // 在生产环境中应该使用实际的PeerJS服务器 / Should use actual PeerJS server in production
        port: 9000,
        path: '/peerjs',
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        console.log('✅ PeerJS connected with ID:', id);
      });

      this.peer.on('call', (incomingCall) => {
        console.log('📞 Receiving incoming call from:', incomingCall.peer);
        this.handleIncomingCall(incomingCall);
      });

      this.peer.on('error', (error) => {
        console.error('🔥 PeerJS error:', error);
        this.errorSubject.next(`PeerJS error: ${error.message || 'Unknown error'} / PeerJS错误：${error.message || '未知错误'}`);
      });

      this.peer.on('disconnected', () => {
        console.log('🔌 PeerJS disconnected, attempting to reconnect...');
        this.peer?.reconnect();
      });

    } catch (error) {
      console.error('Failed to initialize PeerJS:', error);
      this.errorSubject.next('Failed to initialize video call service / 视频通话服务初始化失败');
    }
  }

  // 设置Socket.IO信令监听器 / Setup Socket.IO signaling listeners
  private setupSocketListeners() {
    this.socketService.onVideoCall().subscribe((signal: any) => {
      console.log('📡 Received video call signal:', signal);
      this.handleVideoCallSignal(signal);
    });
  }

  // 处理视频通话信令 / Handle video call signaling
  private handleVideoCallSignal(signal: any) {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || signal.targetUserId !== currentUser._id) {
      return;
    }

    switch (signal.type) {
      case 'call-request':
        this.incomingCallSubject.next({
          fromUserId: signal.fromUserId,
          fromUserName: signal.fromUserName,
          peerId: signal.peerId
        });
        break;

      case 'call-accepted':
        console.log('✅ Call accepted by remote user');
        break;

      case 'call-rejected':
        console.log('❌ Call rejected by remote user');
        this.endCall();
        break;

      case 'call-ended':
        console.log('📞 Call ended by remote user');
        this.endCall();
        break;
    }
  }

  // 发起视频通话 / Initiate video call
  async initiateCall(targetUserId: string, targetUserName: string): Promise<void> {
    if (!this.peer || !this.peer.open) {
      throw new Error('PeerJS not connected / PeerJS未连接');
    }

    if (this.callStateSubject.value.isInCall) {
      throw new Error('Already in a call / 已在通话中');
    }

    try {
      // 获取本地媒体流 / Get local media stream
      const localStream = await this.getLocalStream();

      // 更新呼叫状态 / Update call state
      this.updateCallState({
        isInCall: true,
        isInitiator: true,
        remoteUserId: targetUserId,
        remoteUserName: targetUserName,
        localStream: localStream,
        callStatus: 'calling'
      });

      // 发送呼叫请求信令 / Send call request signal
      const currentUser = this.authService.getCurrentUser();
      this.socketService.sendVideoCallSignal(targetUserId, 'call-request', {
        fromUserId: currentUser?._id,
        fromUserName: currentUser?.username,
        peerId: this.peer.id
      });

      // 发起PeerJS呼叫 / Make PeerJS call
      this.currentCall = this.peer.call(targetUserId, localStream);
      this.setupCallEventHandlers(this.currentCall);

    } catch (error) {
      console.error('Failed to initiate call:', error);
      this.errorSubject.next(`Failed to start call / 无法发起通话: ${error}`);
      this.endCall();
      throw error;
    }
  }

  // 接听来电 / Answer incoming call
  async answerCall(incomingCall: IncomingCall): Promise<void> {
    if (!this.peer || !this.peer.open) {
      throw new Error('PeerJS not connected / PeerJS未连接');
    }

    try {
      // 获取本地媒体流 / Get local media stream
      const localStream = await this.getLocalStream();

      // 更新呼叫状态 / Update call state
      this.updateCallState({
        isInCall: true,
        isInitiator: false,
        remoteUserId: incomingCall.fromUserId,
        remoteUserName: incomingCall.fromUserName,
        localStream: localStream,
        callStatus: 'connected'
      });

      // 发送接受信令 / Send accept signal
      this.socketService.sendVideoCallSignal(incomingCall.fromUserId, 'call-accepted', {
        peerId: this.peer.id
      });

    } catch (error) {
      console.error('Failed to answer call:', error);
      this.errorSubject.next(`Failed to answer call / 无法接听通话: ${error}`);
      this.rejectCall(incomingCall);
      throw error;
    }
  }

  // 拒绝来电 / Reject incoming call
  rejectCall(incomingCall: IncomingCall): void {
    this.socketService.sendVideoCallSignal(incomingCall.fromUserId, 'call-rejected', {});
  }

  // 结束通话 / End call
  endCall(): void {
    const currentState = this.callStateSubject.value;

    if (currentState.remoteUserId) {
      // 发送结束通话信令 / Send call end signal
      this.socketService.sendVideoCallSignal(currentState.remoteUserId, 'call-ended', {});
    }

    // 关闭PeerJS连接 / Close PeerJS connection
    if (this.currentCall) {
      this.currentCall.close();
      this.currentCall = null;
    }

    // 停止本地媒体流 / Stop local media stream
    if (currentState.localStream) {
      currentState.localStream.getTracks().forEach(track => track.stop());
    }

    // 重置呼叫状态 / Reset call state
    this.updateCallState({
      isInCall: false,
      isInitiator: false,
      remoteUserId: undefined,
      remoteUserName: undefined,
      localStream: undefined,
      remoteStream: undefined,
      callStatus: 'ended'
    });

    setTimeout(() => {
      this.updateCallState({ ...this.callStateSubject.value, callStatus: 'idle' });
    }, 2000);
  }

  // 处理来电 / Handle incoming call
  private handleIncomingCall(incomingCall: MediaConnection) {
    // 如果已经在通话中，拒绝新的来电 / Reject new calls if already in call
    if (this.callStateSubject.value.isInCall) {
      incomingCall.close();
      return;
    }

    this.currentCall = incomingCall;
    this.setupCallEventHandlers(incomingCall);

    // 更新呼叫状态为响铃 / Update call state to ringing
    this.updateCallState({
      ...this.callStateSubject.value,
      callStatus: 'ringing'
    });
  }

  // 设置通话事件处理器 / Setup call event handlers
  private setupCallEventHandlers(call: MediaConnection) {
    call.on('stream', (remoteStream) => {
      console.log('📹 Received remote stream');
      this.updateCallState({
        ...this.callStateSubject.value,
        remoteStream: remoteStream,
        callStatus: 'connected'
      });
    });

    call.on('close', () => {
      console.log('📞 Call closed by remote peer');
      this.endCall();
    });

    call.on('error', (error) => {
      console.error('🔥 Call error:', error);
      this.errorSubject.next(`Call error / 通话错误: ${error.message || 'Unknown error'}`);
      this.endCall();
    });
  }

  // 获取本地媒体流 / Get local media stream
  private async getLocalStream(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      return stream;
    } catch (error) {
      console.error('Failed to get local media stream:', error);
      throw new Error('Cannot access camera and microphone / 无法访问摄像头和麦克风');
    }
  }

  // 更新呼叫状态 / Update call state
  private updateCallState(newState: Partial<CallState>) {
    const currentState = this.callStateSubject.value;
    this.callStateSubject.next({ ...currentState, ...newState });
  }

  // 清理资源 / Cleanup resources
  private cleanup() {
    this.endCall();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  // 获取当前呼叫状态 / Get current call state
  getCurrentCallState(): CallState {
    return this.callStateSubject.value;
  }

  // 检查是否在通话中 / Check if in call
  isInCall(): boolean {
    return this.callStateSubject.value.isInCall;
  }

  // 切换音频 / Toggle audio
  toggleAudio(): boolean {
    const localStream = this.callStateSubject.value.localStream;
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0];
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // 切换视频 / Toggle video
  toggleVideo(): boolean {
    const localStream = this.callStateSubject.value.localStream;
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }
}