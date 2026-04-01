import { Room, RoomEvent } from 'livekit-client';

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ending';
export type CallType = 'voice' | 'video';

export interface IncomingCall {
  callId: string;
  fromUserId: string;
  fromUserName: string;
  chatId: string;
  callType: CallType;
  roomName: string;
}

export interface CallServiceCallbacks {
  onStateChange: (state: CallState) => void;
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onIncomingCall: (call: IncomingCall) => void;
  onCallEnded: () => void;
  onError: (err: string) => void;
}

export interface CallDebugDump {
  state: CallState;
  localTracks: Array<{ kind: string; enabled: boolean; muted: boolean; readyState: string; label: string }>;
  remoteTracks: Array<{ kind: string; enabled: boolean; muted: boolean; readyState: string; label: string }>;
  connectionState: string | null;
  signalingState?: string | null;
  stats?: Record<string, unknown>;
}

interface SignalResponse {
  ok?: boolean;
  accepted?: boolean;
  conflicts?: Array<{ toUserId: string; activeCallId: string }>;
  error?: string;
}

const POLL_INTERVAL_MS = 1200;

export class CallService {
  private localUserId: string;
  private cbs: CallServiceCallbacks;

  private state: CallState = 'idle';
  private room: Room | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  private currentCallId: string | null = null;
  private currentRemoteUserId: string | null = null;
  private currentChatId: string | null = null;
  private currentRoomName: string | null = null;
  private currentCallType: CallType = 'voice';

  private pendingIncomingCall: IncomingCall | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(localUserId: string, callbacks: CallServiceCallbacks) {
    this.localUserId = localUserId;
    this.cbs = callbacks;
  }

  startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => {
      void this.poll();
    }, POLL_INTERVAL_MS);
  }

  stopPolling() {
    if (!this.pollTimer) return;
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  getState() {
    return this.state;
  }

  getLocalStream() {
    return this.localStream;
  }

  async startCall(remoteUserId: string, chatId: string, callType: CallType, fromUserName?: string) {
    if (this.state !== 'idle') return;

    this.currentCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.currentRemoteUserId = String(remoteUserId);
    this.currentChatId = String(chatId);
    this.currentCallType = callType;
    this.currentRoomName = `p2p_${chatId}_${this.currentCallId}`;

    this.setState('calling');

    try {
      const signalResult = await this.signal({
        type: 'offer',
        toUserId: this.currentRemoteUserId,
        chatId: this.currentChatId,
        callType,
        fromUserName,
        payload: {
          roomName: this.currentRoomName,
          protocol: 'livekit',
        },
      });

      if (!signalResult || signalResult.ok === false || signalResult.accepted === false || signalResult.error) {
        throw new Error(signalResult?.error || 'Failed to send outgoing call signal');
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start call';
      this.cbs.onError(message);
      this.reset(false);
    }
  }

  async acceptCall(call: IncomingCall) {
    this.pendingIncomingCall = null;
    this.currentCallId = call.callId;
    this.currentRemoteUserId = call.fromUserId;
    this.currentChatId = call.chatId;
    this.currentCallType = call.callType;
    this.currentRoomName = call.roomName;

    try {
      await this.connectLiveKitRoom(call.roomName, call.callType, this.localUserId);
      await this.signal({
        type: 'answer',
        toUserId: call.fromUserId,
        chatId: call.chatId,
        callType: call.callType,
        payload: {
          roomName: call.roomName,
          protocol: 'livekit',
        },
      });
      this.setState('connected');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to accept call';
      this.cbs.onError(message);
      this.reset(false);
    }
  }

  async rejectCall(call: IncomingCall) {
    await this.signal({
      type: 'reject',
      toUserId: call.fromUserId,
      chatId: call.chatId,
      callType: call.callType,
      payload: { protocol: 'livekit' },
    }).catch(() => {});

    if (this.currentCallId === call.callId || this.state === 'ringing') {
      this.reset(false);
    }
  }

  hangup() {
    if (this.currentRemoteUserId && this.currentChatId) {
      void this.signal({
        type: 'hangup',
        toUserId: this.currentRemoteUserId,
        chatId: this.currentChatId,
        callType: this.currentCallType,
        payload: { protocol: 'livekit' },
      }).catch(() => {});
    }

    this.reset(false);
  }

  toggleMute(): boolean {
    const audioTrack = this.localStream?.getAudioTracks()[0];
    if (!audioTrack) return false;
    audioTrack.enabled = !audioTrack.enabled;
    return !audioTrack.enabled;
  }

  toggleCamera(): boolean {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    if (!videoTrack) return false;
    videoTrack.enabled = !videoTrack.enabled;
    return !videoTrack.enabled;
  }

  async listAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audioinput');
  }

  async listAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audiooutput');
  }

  async switchAudioInput(_deviceId: string): Promise<void> {
    // LiveKit handles device switching via dedicated APIs; keep as no-op for now.
    return Promise.resolve();
  }

  async getDebugDump(): Promise<CallDebugDump> {
    const localTracks = (this.localStream?.getTracks() || []).map(t => ({
      kind: t.kind,
      enabled: t.enabled,
      muted: t.muted,
      readyState: t.readyState,
      label: t.label,
    }));

    const remoteTracks = (this.remoteStream?.getTracks() || []).map(t => ({
      kind: t.kind,
      enabled: t.enabled,
      muted: t.muted,
      readyState: t.readyState,
      label: t.label,
    }));

    return {
      state: this.state,
      localTracks,
      remoteTracks,
      connectionState: this.room ? this.room.state : null,
      signalingState: null,
    };
  }

  destroy() {
    this.reset(false);
    this.stopPolling();
  }

  private async poll() {
    try {
      const response = await fetch(`/api/calls?userId=${encodeURIComponent(this.localUserId)}&scope=p2p`, {
        cache: 'no-store',
      });
      if (!response.ok) return;

      const signals = await response.json();
      if (!Array.isArray(signals)) return;

      for (const sig of signals) {
        await this.handleSignal(sig);
      }
    } catch {
      // transient
    }
  }

  private async handleSignal(sig: any) {
    switch (sig?.type) {
      case 'offer': {
        if (!sig.callId || String(sig.fromUserId) === String(this.localUserId)) return;
        if (this.state === 'connected' || this.state === 'ending') return;

        const roomName = String(sig?.payload?.roomName || '');
        if (!roomName) return;

        this.currentCallId = String(sig.callId);
        this.currentRemoteUserId = String(sig.fromUserId);
        this.currentChatId = String(sig.chatId || '');
        this.currentCallType = (sig.callType || 'voice') as CallType;
        this.currentRoomName = roomName;

        this.pendingIncomingCall = {
          callId: String(sig.callId),
          fromUserId: String(sig.fromUserId),
          fromUserName: String(sig.fromUserName || 'Собеседник'),
          chatId: String(sig.chatId || ''),
          callType: (sig.callType || 'voice') as CallType,
          roomName,
        };

        this.cbs.onIncomingCall(this.pendingIncomingCall);
        this.setState('ringing');
        break;
      }

      case 'answer': {
        if (this.currentCallId && String(sig.callId) !== String(this.currentCallId)) return;
        if (this.state === 'calling') {
          if (this.currentRoomName) {
            try {
              await this.connectLiveKitRoom(this.currentRoomName, this.currentCallType, this.localUserId);
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : 'Failed to connect caller room';
              this.cbs.onError(message);
              this.reset(false);
              return;
            }
          }

          this.setState('connected');
        }
        break;
      }

      case 'reject':
      case 'hangup': {
        if (this.currentCallId && String(sig.callId) !== String(this.currentCallId)) return;
        this.cbs.onCallEnded();
        this.reset(false);
        break;
      }

      default:
        break;
    }
  }

  private async connectLiveKitRoom(roomName: string, callType: CallType, displayName: string) {
    const tokenResponse = await fetch('/api/livekit/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName,
        userId: this.localUserId,
        userName: displayName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        metadata: {
          callType,
          chatId: this.currentChatId,
          callId: this.currentCallId,
        },
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenData?.detail || tokenData?.error || 'Failed to create LiveKit token');
    }

    const wsUrl = String(tokenData?.url || '');
    const token = String(tokenData?.token || '');
    if (!wsUrl || !token) {
      throw new Error('Invalid LiveKit token response');
    }

    const room = new Room({ adaptiveStream: true, dynacast: true });
    this.bindRoomEvents(room);

    await room.connect(wsUrl, token, { autoSubscribe: true });

    await room.localParticipant.setMicrophoneEnabled(true);
    if (callType === 'video') {
      await room.localParticipant.setCameraEnabled(true);
    }

    this.room = room;
    this.updateLocalStreamFromRoom();
    this.updateRemoteStreamFromRoom();
  }

  private bindRoomEvents(room: Room) {
    room.on(RoomEvent.TrackSubscribed, () => {
      this.updateRemoteStreamFromRoom();
      if (this.state === 'calling' || this.state === 'ringing') {
        this.setState('connected');
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, () => {
      this.updateRemoteStreamFromRoom();
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      if (this.state === 'calling' || this.state === 'ringing') {
        this.setState('connected');
      }
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      this.updateRemoteStreamFromRoom();
      if (room.remoteParticipants.size === 0 && this.state !== 'idle') {
        this.cbs.onCallEnded();
        this.reset(true);
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      if (this.state !== 'idle') {
        this.cbs.onCallEnded();
      }
      this.reset(true);
    });
  }

  private updateLocalStreamFromRoom() {
    if (!this.room) return;
    const tracks: MediaStreamTrack[] = [];

    for (const publication of this.room.localParticipant.trackPublications.values()) {
      const track = publication.track;
      if (track?.mediaStreamTrack) {
        tracks.push(track.mediaStreamTrack);
      }
    }

    this.localStream = new MediaStream(tracks);
    this.cbs.onLocalStream(this.localStream);
  }

  private updateRemoteStreamFromRoom() {
    if (!this.room) return;
    const tracks: MediaStreamTrack[] = [];

    for (const participant of this.room.remoteParticipants.values()) {
      for (const publication of participant.trackPublications.values()) {
        const track = publication.track;
        if (track?.mediaStreamTrack) {
          tracks.push(track.mediaStreamTrack);
        }
      }
    }

    this.remoteStream = new MediaStream(tracks);
    this.cbs.onRemoteStream(this.remoteStream);
  }

  private async signal(payload: Record<string, unknown>): Promise<SignalResponse | null> {
    const response = await fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        callId: this.currentCallId,
        fromUserId: this.localUserId,
      }),
    });

    try {
      return (await response.json()) as SignalResponse;
    } catch {
      return null;
    }
  }

  private setState(next: CallState) {
    this.state = next;
    this.cbs.onStateChange(next);
  }

  private reset(skipDisconnect = false) {
    if (!skipDisconnect && this.room) {
      try {
        this.room.disconnect();
      } catch {
        // ignore
      }
    }

    this.room = null;
    this.localStream?.getTracks().forEach(t => t.stop());
    this.remoteStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.remoteStream = null;

    this.currentCallId = null;
    this.currentRemoteUserId = null;
    this.currentChatId = null;
    this.currentRoomName = null;
    this.pendingIncomingCall = null;

    this.setState('idle');
  }
}
