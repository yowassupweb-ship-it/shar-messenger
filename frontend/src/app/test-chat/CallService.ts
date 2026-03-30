/**
 * CallService — WebRTC peer-to-peer call management
 *
 * Inspired by Signal Desktop's call architecture:
 *  - ICE gathering via STUN (Google + Cloudflare)
 *  - SDP offer/answer exchange via in-app signaling server (/api/calls)
 *  - Polling-based signaling (no persistent WS connection required)
 *  - Proper cleanup on hangup / page unload
 */

import { getIceServers } from './webrtcConfig';

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ending';
export type CallType = 'voice' | 'video';

export interface IncomingCall {
  callId: string;
  fromUserId: string;
  fromUserName: string;
  chatId: string;
  callType: CallType;
  offer: RTCSessionDescriptionInit;
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
  iceConnectionState?: string | null;
  signalingState?: string | null;
  stats?: {
    inboundAudioPackets?: number;
    inboundAudioBytes?: number;
    outboundAudioPackets?: number;
    outboundAudioBytes?: number;
    audioLevel?: number;
  };
}

interface SignalResponse {
  ok?: boolean;
  accepted?: boolean;
  conflicts?: Array<{ toUserId: string; activeCallId: string }>;
  error?: string;
}

const ICE_SERVERS = getIceServers();

const POLL_INTERVAL_MS = 1_200;

export class CallService {
  private localUserId: string;
  private cbs: CallServiceCallbacks;

  private state: CallState = 'idle';
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  private currentCallId: string | null = null;
  private currentRemoteUserId: string | null = null;
  private currentChatId: string | null = null;

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isAcceptingIncoming = false;
  private pendingRemoteIceCandidates: RTCIceCandidateInit[] = [];
  private pendingIncomingCall: IncomingCall | null = null;
  private remoteIceUfrag: string | null = null;
  private connectWatchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionRepairAttempts = 0;

  private extractIceUfragFromSdp(sdp?: string): string | null {
    if (!sdp) return null;
    const match = sdp.match(/a=ice-ufrag:([^\r\n]+)/);
    return match?.[1]?.trim() || null;
  }

  private clearConnectWatchdog() {
    if (this.connectWatchdogTimer) {
      clearTimeout(this.connectWatchdogTimer);
      this.connectWatchdogTimer = null;
    }
  }

  private armConnectWatchdog() {
    this.clearConnectWatchdog();
    this.connectWatchdogTimer = setTimeout(async () => {
      if (!this.pc || this.state !== 'calling') return;

      const waitingForAnswer =
        this.pc.signalingState === 'have-local-offer' &&
        this.pc.localDescription?.type === 'offer';

      const stalledOnStable =
        (this.pc.iceConnectionState === 'new' || this.pc.iceConnectionState === 'checking') &&
        this.pc.signalingState === 'stable';

      if (!waitingForAnswer && !stalledOnStable) return;
      if (!this.currentRemoteUserId || !this.currentChatId) return;

      // Controlled retry while waiting for answer: only one deterministic side resends.
      if (waitingForAnswer) {
        const mayRetryOffer =
          !!this.currentRemoteUserId && String(this.localUserId) < String(this.currentRemoteUserId);

        if (mayRetryOffer) {
          if (this.connectionRepairAttempts >= 3) {
            console.warn('[CallService] Offer retry skipped: max attempts reached');
            this.cbs.onError('Не удалось установить соединение. Попробуйте еще раз.');
            this.cbs.onCallEnded();
            this.reset();
            return;
          }

          this.connectionRepairAttempts += 1;
          try {
            await this.signal({
              type: 'offer',
              toUserId: this.currentRemoteUserId,
              chatId: this.currentChatId,
              payload: this.pc.localDescription,
              callType: (this.localStream?.getVideoTracks().length || 0) > 0 ? 'video' : 'voice',
            });
            console.log('[CallService] Offer retry sent while awaiting answer');
          } catch (e) {
            console.error('[CallService] Offer retry failed', e);
          }
        }

        this.armConnectWatchdog();
        return;
      }

      // Stable-but-stalled path: try controlled ICE restart.
      if (this.connectionRepairAttempts >= 5) {
        console.warn('[CallService] ICE restart skipped: max attempts reached');
        this.cbs.onError('Не удалось установить соединение. Попробуйте еще раз.');
        this.cbs.onCallEnded();
        this.reset();
        return;
      }

      this.connectionRepairAttempts += 1;
      try {
        const wantsVideo = (this.localStream?.getVideoTracks().length || 0) > 0;
        const offer = await this.pc.createOffer({
          iceRestart: true,
          offerToReceiveAudio: true,
          offerToReceiveVideo: wantsVideo,
        });
        await this.pc.setLocalDescription(offer);
        // A new local offer expects fresh remote ICE credentials in the answer.
        this.remoteIceUfrag = null;
        await this.signal({
          type: 'offer',
          toUserId: this.currentRemoteUserId,
          chatId: this.currentChatId,
          payload: offer,
          callType: wantsVideo ? 'video' : 'voice',
        });
        console.log('[CallService] ICE restart offer sent');
        this.armConnectWatchdog();
      } catch (e) {
        console.error('[CallService] ICE restart failed', e);
      }
    }, 4500);
  }

  private createNormalizedRemoteStream(primaryTrack?: MediaStreamTrack, sourceStream?: MediaStream): MediaStream {
    const result = new MediaStream();
    const sourceTracks = sourceStream?.getTracks() ?? [];

    const pickAudio = (): MediaStreamTrack | undefined => {
      const candidates = sourceTracks.filter(t => t.kind === 'audio');
      if (primaryTrack?.kind === 'audio') {
        candidates.unshift(primaryTrack);
      }
      return candidates.find(t => t.readyState === 'live' && !t.muted)
        ?? candidates.find(t => t.readyState === 'live')
        ?? this.remoteStream?.getAudioTracks().find(t => t.readyState === 'live');
    };

    const pickVideo = (): MediaStreamTrack | undefined => {
      const candidates = sourceTracks.filter(t => t.kind === 'video');
      if (primaryTrack?.kind === 'video') {
        candidates.unshift(primaryTrack);
      }
      return candidates.find(t => t.readyState === 'live')
        ?? this.remoteStream?.getVideoTracks().find(t => t.readyState === 'live');
    };

    const audio = pickAudio();
    const video = pickVideo();

    if (audio) result.addTrack(audio);
    if (video) result.addTrack(video);

    return result;
  }

  constructor(localUserId: string, callbacks: CallServiceCallbacks) {
    this.localUserId = localUserId;
    this.cbs = callbacks;
  }

  /* ─── Public API ─────────────────────────────────────────── */

  startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  getState() {
    return this.state;
  }

  getLocalStream() {
    return this.localStream;
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

  async switchAudioInput(deviceId: string): Promise<void> {
    if (!this.localStream) {
      throw new Error('NO_LOCAL_STREAM');
    }

    const replacement = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: deviceId },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    const newTrack = replacement.getAudioTracks()[0];
    if (!newTrack) {
      replacement.getTracks().forEach(t => t.stop());
      throw new Error('NO_AUDIO_TRACK_IN_REPLACEMENT');
    }

    const oldTrack = this.localStream.getAudioTracks()[0];

    if (this.pc) {
      const sender = this.pc.getSenders().find(s => s.track?.kind === 'audio');
      if (sender) {
        await sender.replaceTrack(newTrack);
      }
    }

    if (oldTrack) {
      this.localStream.removeTrack(oldTrack);
      oldTrack.stop();
    }
    this.localStream.addTrack(newTrack);

    replacement.getTracks().forEach(t => {
      if (t !== newTrack) t.stop();
    });

    this.cbs.onLocalStream(this.localStream);
    console.log('[CallService] Switched audio input to device:', deviceId, newTrack.label);
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

    const dump: CallDebugDump = {
      state: this.state,
      localTracks,
      remoteTracks,
      connectionState: this.pc?.connectionState ?? null,
      iceConnectionState: this.pc?.iceConnectionState ?? null,
      signalingState: this.pc?.signalingState ?? null,
    };

    if (this.pc) {
      try {
        const stats = await this.pc.getStats();
        let inboundAudioPackets: number | undefined;
        let inboundAudioBytes: number | undefined;
        let outboundAudioPackets: number | undefined;
        let outboundAudioBytes: number | undefined;
        let audioLevel: number | undefined;

        stats.forEach((report: any) => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            inboundAudioPackets = report.packetsReceived;
            inboundAudioBytes = report.bytesReceived;
          }
          if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            outboundAudioPackets = report.packetsSent;
            outboundAudioBytes = report.bytesSent;
          }
          if (report.type === 'track' && report.kind === 'audio' && typeof report.audioLevel === 'number') {
            audioLevel = report.audioLevel;
          }
        });

        dump.stats = {
          inboundAudioPackets,
          inboundAudioBytes,
          outboundAudioPackets,
          outboundAudioBytes,
          audioLevel,
        };
      } catch (e) {
        console.warn('[CallService] getStats failed for debug dump:', e);
      }
    }

    return dump;
  }

  private formatMediaError(e: any, wantsVideo: boolean): string {
    const name = e?.name || 'UnknownError';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'Доступ к микрофону/камере запрещен. Разрешите доступ в браузере и обновите страницу.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return wantsVideo
        ? 'Не найден микрофон или камера. Проверьте подключение устройств.'
        : 'Не найден микрофон. Проверьте подключение устройства ввода.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Микрофон занят другим приложением. Закройте другие звонки/программы и попробуйте снова.';
    }
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
      return 'Не удалось применить параметры микрофона/камеры. Попробуйте другое устройство.';
    }
    if (e?.message === 'NO_AUDIO_INPUT_DEVICE') {
      return 'В системе не найдено ни одного устройства микрофона.';
    }
    if (e?.message === 'NO_AUDIO_TRACK_IN_STREAM') {
      return 'Браузер не передал аудиодорожку. Проверьте настройки микрофона в системе.';
    }
    return wantsVideo
      ? 'Не удалось получить доступ к микрофону/камере.'
      : 'Не удалось получить доступ к микрофону.';
  }

  private async acquireLocalMedia(wantsVideo: boolean): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('MEDIA_DEVICES_UNAVAILABLE');
    }

    let audioInputIds: string[] = [];

    // Diagnostics: check whether browser sees audio input devices.
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      audioInputIds = audioInputs.map(d => d.deviceId).filter(Boolean);
      console.log('[CallService] Media devices:', {
        audioInputs: audioInputs.length,
        videoInputs: videoInputs.length,
        audioInputIds,
      });
      if (audioInputs.length === 0) {
        const err = new Error('NO_AUDIO_INPUT_DEVICE');
        (err as any).name = 'NotFoundError';
        throw err;
      }
    } catch (deviceErr) {
      // If enumerate fails due to permissions, proceed to getUserMedia and handle there.
      console.warn('[CallService] enumerateDevices failed:', deviceErr);
    }

    const baseAudioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    } as MediaTrackConstraints;

    const tryGetStream = async (audio: MediaTrackConstraints | boolean, video: boolean): Promise<MediaStream> => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error('NO_AUDIO_TRACK_IN_STREAM');
      }
      audioTrack.enabled = true;
      console.log('[CallService] Local media acquired:', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        audioTrackLabel: audioTrack.label,
        audioTrackReadyState: audioTrack.readyState,
        audioTrackMuted: audioTrack.muted,
      });
      return stream;
    };

    const attempts: Array<{ audio: MediaTrackConstraints | boolean; video: boolean; tag: string }> = [];

    // 1) Default capture with enhancements
    attempts.push({ audio: baseAudioConstraints, video: wantsVideo, tag: 'default-device' });

    // 2) Explicit capture from each discovered audio input (helps when default device is broken/silent)
    for (const id of audioInputIds) {
      attempts.push({
        audio: { ...baseAudioConstraints, deviceId: { exact: id } },
        video: wantsVideo,
        tag: `audio-device:${id}`,
      });
    }

    // 3) Audio-only fallback path
    attempts.push({ audio: baseAudioConstraints, video: false, tag: 'audio-only-default' });
    for (const id of audioInputIds) {
      attempts.push({
        audio: { ...baseAudioConstraints, deviceId: { exact: id } },
        video: false,
        tag: `audio-only-device:${id}`,
      });
    }

    let lastError: any = null;
    for (const attempt of attempts) {
      try {
        console.log('[CallService] Trying media capture:', attempt.tag);
        return await tryGetStream(attempt.audio, attempt.video);
      } catch (e) {
        lastError = e;
        console.warn('[CallService] Media capture attempt failed:', attempt.tag, e);
      }
    }

    throw lastError ?? new Error('MEDIA_ACQUISITION_FAILED');
  }

  /**
   * Initiate an outgoing call.
   * Obtains microphone (+ camera for video), creates offer, pushes to signaling server.
   */
  async startCall(
    toUserId: string,
    chatId: string,
    callType: CallType = 'voice',
    fromUserName?: string,
  ) {
    if (this.state !== 'idle') return;

    // Same-PC two-account glare mitigation:
    // side with lexicographically larger user id yields a short window
    // for incoming offer before starting its own outgoing offer.
    if (String(this.localUserId) > String(toUserId)) {
      for (let i = 0; i < 5; i += 1) {
        await new Promise<void>(resolve => setTimeout(resolve, 300));
        await this.poll();
        if (this.pendingIncomingCall) {
          console.log('[CallService] Outgoing call cancelled due to incoming offer priority');
          return;
        }
      }
    }

    this.currentCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.currentRemoteUserId = toUserId;
    this.currentChatId = chatId;
    // Enter calling state immediately so simultaneous offers are handled by glare logic.
    this.setState('calling');

    // Acquire media
    try {
      this.localStream = await this.acquireLocalMedia(callType === 'video');
      this.cbs.onLocalStream(this.localStream);
    } catch (e: any) {
      console.error('[CallService] Failed to acquire local media (startCall):', e);
      this.cbs.onError(this.formatMediaError(e, callType === 'video'));
      this.reset();
      return;
    }

    const pc = this.createPeerConnection(toUserId, chatId);
    console.log('[CallService] Adding local tracks to peer connection');
    this.localStream.getTracks().forEach(t => {
      console.log('  - Adding track:', t.kind, 'enabled:', t.enabled);
      pc.addTrack(t, this.localStream!);
    });

    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' });
    await pc.setLocalDescription(offer);
    // Outgoing offer starts a new negotiation, remote ufrag will come from answer.
    this.remoteIceUfrag = null;

    const signalResult = await this.signal({
      type: 'offer',
      toUserId,
      chatId,
      payload: offer,
      callType,
      fromUserName,
    });

    if (signalResult?.accepted === false) {
      console.warn('[CallService] Outgoing offer rejected by signaling server', signalResult);
      this.reset();
      return;
    }

    // If state switched during async start (for example by incoming glare resolution),
    // don't force it back to outgoing calling.
    if (this.state !== 'calling') {
      console.warn('[CallService] Outgoing start aborted because call state changed:', this.state);
      return;
    }

    console.log(`[CallService] Outgoing call started to user ${toUserId}, callId=${this.currentCallId}`);
    this.connectionRepairAttempts = 0;
    this.armConnectWatchdog();
  }

  /**
   * Accept an incoming call (must be in 'ringing' state).
   * Pre-requests media permissions to avoid browser blocking issues.
   */
  async acceptCall(incoming: IncomingCall) {
    if (this.isAcceptingIncoming) return;

    const effectiveIncoming = this.pendingIncomingCall ?? incoming;
    if (!effectiveIncoming) return;
    if (this.state === 'connected' || this.state === 'ending') {
      console.warn('[CallService] Accept ignored in state:', this.state);
      return;
    }

    this.isAcceptingIncoming = true;
    this.setState('calling');

    this.currentRemoteUserId = effectiveIncoming.fromUserId;
    this.currentChatId = effectiveIncoming.chatId;

    try {
      console.log('[CallService] Requesting media permissions...');
      this.localStream = await this.acquireLocalMedia(effectiveIncoming.callType === 'video');
      console.log('[CallService] Media acquired successfully');
      this.cbs.onLocalStream(this.localStream);
    } catch (e: any) {
      console.error('[CallService] Media permission denied:', e);
      const errorMsg = this.formatMediaError(e, effectiveIncoming.callType === 'video');
      this.cbs.onError(errorMsg);
      await this.rejectCall(effectiveIncoming);
      this.isAcceptingIncoming = false;
      return;
    }

    try {
      const pc = this.createPeerConnection(effectiveIncoming.fromUserId, effectiveIncoming.chatId);
      console.log('[CallService] Adding local tracks to peer connection (accept call)');
      this.localStream.getTracks().forEach(t => {
        console.log('  - Adding track:', t.kind, 'enabled:', t.enabled);
        pc.addTrack(t, this.localStream!);
      });

      await pc.setRemoteDescription(effectiveIncoming.offer);
      this.remoteIceUfrag = this.extractIceUfragFromSdp(effectiveIncoming.offer.sdp);
      await this.flushPendingIceCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await this.signal({
        type: 'answer',
        toUserId: effectiveIncoming.fromUserId,
        chatId: effectiveIncoming.chatId,
        payload: answer,
      });

      this.pendingIncomingCall = null;
    } catch (e) {
      console.error('[CallService] Failed to accept incoming call:', e);
      this.cbs.onError('Не удалось принять звонок. Попробуйте еще раз.');
      this.cbs.onCallEnded();
      this.reset();
    } finally {
      this.isAcceptingIncoming = false;
    }
  }

  /** Reject an incoming call. */
  async rejectCall(incoming: IncomingCall) {
    await this.signal({
      type: 'reject',
      toUserId: incoming.fromUserId,
      chatId: incoming.chatId,
    });
    this.reset();
  }

  /** End current call. */
  async hangup() {
    if (this.state === 'idle') return;
    console.log('[CallService] Hanging up call, current state:', this.state, 'remote user:', this.currentRemoteUserId);
    if (this.currentRemoteUserId && this.currentChatId) {
      console.log('[CallService] Sending hangup signal to:', this.currentRemoteUserId);
      await this.signal({
        type: 'hangup',
        toUserId: this.currentRemoteUserId,
        chatId: this.currentChatId,
      }).catch((err) => {
        console.error('[CallService] Failed to send hangup signal:', err);
      });
    }
    this.reset();
    this.cbs.onCallEnded();
  }

  /** Toggle microphone mute. Returns true if now muted. */
  toggleMute(): boolean {
    const track = this.localStream?.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return !track.enabled;
  }

  /** Toggle camera (video calls). Returns true if now disabled. */
  toggleCamera(): boolean {
    const track = this.localStream?.getVideoTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return !track.enabled;
  }

  destroy() {
    this.stopPolling();
    this.reset();
  }

  /* ─── Private helpers ────────────────────────────────────── */

  private setState(s: CallState) {
    this.state = s;
    this.cbs.onStateChange(s);
  }

  private createPeerConnection(remoteUserId: string, chatId: string): RTCPeerConnection {
    if (this.pc) {
      try {
        this.pc.onicecandidate = null;
        this.pc.onconnectionstatechange = null;
        this.pc.oniceconnectionstatechange = null;
        this.pc.onsignalingstatechange = null;
        this.pc.ontrack = null;
        this.pc.close();
      } catch {
        // ignore cleanup errors from stale peer connections
      }
      this.pc = null;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc = pc;
    this.remoteStream = new MediaStream();

    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        await this.signal({
          type: 'ice-candidate',
          toUserId: remoteUserId,
          chatId,
          payload: e.candidate.toJSON(),
        }).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[CallService] connectionState changed:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        this.clearConnectWatchdog();
        this.connectionRepairAttempts = 0;
        this.setState('connected');
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        if (this.state !== 'idle') {
          this.cbs.onCallEnded();
          this.reset();
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[CallService] iceConnectionState changed:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.clearConnectWatchdog();
        this.connectionRepairAttempts = 0;
        if (this.state !== 'connected') {
          this.setState('connected');
        }
      }
    };

    pc.onsignalingstatechange = () => {
      console.log('[CallService] signalingState changed:', pc.signalingState);
    };

    pc.ontrack = (e) => {
      console.log('[CallService] ontrack event:', {
        streams: e.streams.length,
        track: e.track.kind,
        trackEnabled: e.track.enabled,
        trackReadyState: e.track.readyState,
      });
      const [stream] = e.streams;
      this.remoteStream = this.createNormalizedRemoteStream(e.track, stream);

      console.log('[CallService] Remote stream assembled, audio tracks:',
        this.remoteStream.getAudioTracks().length,
        'video tracks:',
        this.remoteStream.getVideoTracks().length
      );

      this.cbs.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));

      e.track.onunmute = () => {
        console.log('[CallService] Remote track unmuted, re-emitting stream');
        this.remoteStream = this.createNormalizedRemoteStream(e.track, stream);
        this.cbs.onRemoteStream(new MediaStream(this.remoteStream.getTracks()));
      };
    };

    return pc;
  }

  private async poll() {
    try {
      const res = await fetch(`/api/calls?userId=${encodeURIComponent(this.localUserId)}`);
      if (!res.ok) return;
      const signals: any[] = await res.json();

      // If multiple answers arrive for the same call in one poll batch,
      // apply only the newest one and ignore older stale answers.
      const lastAnswerIndexByCall = new Map<string, number>();
      signals.forEach((sig, idx) => {
        if (sig?.type === 'answer') {
          lastAnswerIndexByCall.set(String(sig.callId || ''), idx);
        }
      });

      console.log(`[CallService] Poll for user ${this.localUserId}: ${signals.length} signals`, signals);
      for (let idx = 0; idx < signals.length; idx += 1) {
        const sig = signals[idx];
        if (sig?.type === 'answer') {
          const key = String(sig.callId || '');
          if (lastAnswerIndexByCall.get(key) !== idx) {
            continue;
          }
        }
        console.log('[CallService] Processing signal:', sig.type, 'from:', sig.fromUserId);
        await this.handleSignal(sig);
      }
    } catch {
      // network transient error — ignore
    }
  }

  private async handleSignal(sig: any) {
    switch (sig.type) {
      case 'offer':
        if (!sig.callId) {
          console.warn('[CallService] Ignoring offer without callId');
          break;
        }

        if (String(sig.fromUserId || '') === String(this.localUserId)) {
          console.warn('[CallService] Ignoring self-originated offer to prevent signaling loop');
          break;
        }

        if (!sig.payload || sig.payload.type !== 'offer') {
          console.warn('[CallService] Ignoring invalid offer payload');
          break;
        }

        if (
          this.state === 'ringing' &&
          this.pendingIncomingCall &&
          this.pendingIncomingCall.fromUserId === sig.fromUserId &&
          this.pendingIncomingCall.chatId === sig.chatId &&
          this.pendingIncomingCall.callId !== sig.callId
        ) {
          // Keep first incoming offer to avoid mirrored incoming-call replacement races.
          console.warn('[CallService] Ignoring mirrored incoming offer while already ringing', {
            activeCallId: this.pendingIncomingCall.callId,
            incomingCallId: sig.callId,
            fromUserId: sig.fromUserId,
          });
          break;
        }

        if (this.state === 'connected' || this.state === 'ending') {
          // Busy in active/ending call: ignore new incoming offer.
          break;
        }

        if (this.state === 'calling' && this.currentCallId && sig.callId !== this.currentCallId) {
          // Deterministic glare resolution (important for same-PC two-account tests):
          // lexicographically smaller user id keeps outgoing call, the other side yields.
          const shouldYield = String(this.localUserId) > String(sig.fromUserId || '');
          if (shouldYield) {
            console.warn('[CallService] Glare detected: yielding outgoing call to incoming offer', {
              localUserId: this.localUserId,
              fromUserId: sig.fromUserId,
              outgoingCallId: this.currentCallId,
              incomingCallId: sig.callId,
            });
            this.reset();
          } else {
            console.warn('[CallService] Glare detected: keeping outgoing call, ignoring incoming offer', {
              localUserId: this.localUserId,
              fromUserId: sig.fromUserId,
              outgoingCallId: this.currentCallId,
              incomingCallId: sig.callId,
            });
            break;
          }
        }

        this.currentCallId = sig.callId;
        this.pendingIncomingCall = {
          callId: sig.callId,
          fromUserId: sig.fromUserId,
          fromUserName: sig.fromUserName || 'Собеседник',
          chatId: sig.chatId,
          callType: sig.callType || 'voice',
          offer: sig.payload,
        };
        this.cbs.onIncomingCall(this.pendingIncomingCall);
        if (this.state !== 'ringing') {
          this.setState('ringing');
        }
        break;

      case 'answer':
        if (this.pc) {
          try {
            if (this.currentCallId && sig.callId !== this.currentCallId) {
              console.warn('[CallService] Ignoring answer for different callId:', sig.callId, 'expected:', this.currentCallId);
              break;
            }

            if (!sig.payload || sig.payload.type !== 'answer') {
              console.warn('[CallService] Ignoring invalid answer payload');
              break;
            }

            // Prevent InvalidStateError when duplicate answers arrive.
            if (this.pc.signalingState !== 'have-local-offer') {
              console.warn('[CallService] Ignoring answer in signalingState:', this.pc.signalingState);
              break;
            }

            await this.pc.setRemoteDescription(sig.payload);
            this.remoteIceUfrag = this.extractIceUfragFromSdp(sig.payload?.sdp);
            await this.flushPendingIceCandidates();
            this.armConnectWatchdog();
            console.log('[CallService] Remote answer applied successfully');
          } catch (e) {
            console.error('[CallService] setRemoteDescription failed', e);
          }
        }
        break;

      case 'ice-candidate':
        if (sig.payload) {
          if (this.currentCallId && sig.callId !== this.currentCallId) {
            console.warn('[CallService] Ignoring ICE candidate for different callId:', sig.callId, 'expected:', this.currentCallId);
            break;
          }

          const candidateUfrag = sig.payload?.usernameFragment || null;
          if (this.remoteIceUfrag && candidateUfrag && candidateUfrag !== this.remoteIceUfrag) {
            if (this.pc?.signalingState === 'have-local-offer') {
              // During pending local offer, allow later answer to update ufrag and then retry.
              this.pendingRemoteIceCandidates.push(sig.payload);
              break;
            }
            console.warn('[CallService] Ignoring ICE candidate with foreign ufrag:', candidateUfrag, 'expected:', this.remoteIceUfrag);
            break;
          }

          if (!this.pc) {
            // Candidate arrived before peer connection creation (common while ringing).
            this.pendingRemoteIceCandidates.push(sig.payload);
            break;
          }

          try {
            await this.pc.addIceCandidate(sig.payload);
          } catch {
            // Candidate may arrive before remote description; queue for retry.
            this.pendingRemoteIceCandidates.push(sig.payload);
          }
        }
        break;

      case 'reject':
      case 'hangup':
        if (this.currentCallId && sig.callId !== this.currentCallId) {
          console.warn('[CallService] Ignoring hangup/reject for different callId:', sig.callId, 'expected:', this.currentCallId);
          break;
        }

        if (this.currentRemoteUserId && sig.fromUserId && sig.fromUserId !== this.currentRemoteUserId) {
          console.warn('[CallService] Ignoring hangup/reject from different user:', sig.fromUserId, 'expected:', this.currentRemoteUserId);
          break;
        }

        if (this.isAcceptingIncoming) {
          console.warn('[CallService] Ignoring hangup/reject while accepting call');
          break;
        }

        console.log('[CallService] Received hangup/reject signal, current state:', this.state);
        if (this.state !== 'idle') {
          console.log('[CallService] Processing hangup - ending call');
          this.cbs.onCallEnded();
          this.reset();
        } else {
          console.log('[CallService] Ignoring hangup - already idle');
        }
        break;
    }
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

    let result: SignalResponse | null = null;
    try {
      result = (await response.json()) as SignalResponse;
    } catch {
      result = null;
    }

    if (!response.ok && payload.type !== 'offer') {
      throw new Error(result?.error || `SIGNAL_FAILED_${response.status}`);
    }

    return result;
  }

  private reset() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.remoteStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.pc?.close();
    this.pc = null;
    this.currentCallId = null;
    this.currentRemoteUserId = null;
    this.currentChatId = null;
    this.pendingRemoteIceCandidates = [];
    this.pendingIncomingCall = null;
    this.remoteIceUfrag = null;
    this.clearConnectWatchdog();
    this.connectionRepairAttempts = 0;
    this.isAcceptingIncoming = false;
    this.setState('idle');
  }

  private async flushPendingIceCandidates() {
    if (!this.pc || this.pendingRemoteIceCandidates.length === 0) return;

    const queued = [...this.pendingRemoteIceCandidates];
    this.pendingRemoteIceCandidates = [];
    for (const candidate of queued) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch {
        // Keep only still-failing candidates for next retry window.
        this.pendingRemoteIceCandidates.push(candidate);
      }
    }
  }
}
