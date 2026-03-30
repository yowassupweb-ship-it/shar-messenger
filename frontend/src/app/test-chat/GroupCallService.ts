/**
 * GroupCallService — WebRTC mesh voice/video for group chats
 *
 * Architecture (Telegram Voice Chat style):
 *  - The caller broadcasts a "group-invite" to all chat participants
 *  - Each joiner creates independent RTCPeerConnections to all current participants
 *  - ICE/SDP exchange is handled per-pair via the existing /api/calls signaling server
 *  - Group state (who is in the call) is tracked in /api/calls/group
 *
 * Scales to ~8 participants in a mesh. For larger groups, integrate an SFU
 * such as LiveKit (livekit.io) or mediasoup.
 */

import { CallType } from './CallService';
import { getIceServers } from './webrtcConfig';

export interface GroupParticipant {
  userId: string;
  userName: string;
  stream: MediaStream | null;
  isMuted: boolean;
  isSpeaking: boolean;
  joinedAt: number;
}

export interface GroupCallState {
  callId: string;
  chatId: string;
  isActive: boolean;
  localUserId: string;
  participants: GroupParticipant[];
}

export interface GroupCallCallbacks {
  onStateChange: (state: GroupCallState | null) => void;
  onLocalStream: (stream: MediaStream) => void;
  onParticipantStream: (userId: string, stream: MediaStream) => void;
  onParticipantLeft: (userId: string) => void;
  onError: (err: string) => void;
}

const ICE_SERVERS = getIceServers();

const POLL_MS = 1_500;

type PeerEntry = {
  pc: RTCPeerConnection;
  remoteUserId: string;
  isOfferer: boolean; // true = we created the offer
};

export class GroupCallService {
  private localUserId: string;
  private localUserName: string;
  private cbs: GroupCallCallbacks;

  private callId: string | null = null;
  private chatId: string | null = null;
  private callType: CallType = 'voice';

  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerEntry> = new Map(); // remoteUserId → PeerEntry

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private groupPollTimer: ReturnType<typeof setInterval> | null = null;

  private speakingDetector: AudioContext | null = null;

  constructor(localUserId: string, localUserName: string, callbacks: GroupCallCallbacks) {
    this.localUserId = localUserId;
    this.localUserName = localUserName;
    this.cbs = callbacks;
  }

  /* ─── Public API ─────────────────────────────────────────── */

  /**
   * Start a new group voice/video call in a chat.
   * Broadcasts invitations to all provided participantIds.
   */
  async startGroupCall(chatId: string, participantIds: string[], callType: CallType = 'voice') {
    if (this.callId) return; // already in a call

    this.callId = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.chatId = chatId;
    this.callType = callType;

    await this.acquireMedia();

    // Register ourselves in the group call state
    await this.updateGroupState('start');

    // Invite all participants
    const others = participantIds.filter(id => id !== this.localUserId);
    if (others.length > 0) {
      await this.broadcast('group-invite', others, {
        groupParticipants: [this.localUserId],
        callType,
      });
    }

    this.startPolling();
    this.startGroupPolling(chatId);
    this.emitState();
  }

  /**
   * Join an existing group call (received via group-invite signal).
   */
  async joinGroupCall(callId: string, chatId: string, existingParticipants: string[], callType: CallType = 'voice') {
    if (this.callId) return;

    this.callId = callId;
    this.chatId = chatId;
    this.callType = callType;

    await this.acquireMedia();

    // Register join
    await this.updateGroupState('join');

    // Create offers to all current participants
    const others = existingParticipants.filter(id => id !== this.localUserId);
    for (const remoteId of others) {
      await this.createOffer(remoteId, chatId);
    }

    this.startPolling();
    this.startGroupPolling(chatId);
    this.emitState();
  }

  /** Leave the group call gracefully. */
  async leaveGroupCall() {
    if (!this.callId || !this.chatId) return;

    // Notify all peers
    const peerIds = [...this.peers.keys()];
    if (peerIds.length > 0) {
      await this.broadcast('group-leave', peerIds, {}).catch(() => {});
    }

    // Update group state
    await this.updateGroupState('leave').catch(() => {});

    this.cleanup();
  }

  /** Toggle microphone. Returns true if now muted. */
  toggleMute(): boolean {
    const track = this.localStream?.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return !track.enabled;
  }

  /** Get current call state. */
  getCallId() { return this.callId; }
  getChatId() { return this.chatId; }

  destroy() {
    this.cleanup();
  }

  /* ─── Private: peer management ───────────────────────────── */

  private async acquireMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: this.callType === 'video',
      });
      this.cbs.onLocalStream(this.localStream);
    } catch (e) {
      this.cbs.onError('Нет доступа к микрофону');
      throw e;
    }
  }

  private createPeer(remoteUserId: string, isOfferer: boolean): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    this.localStream?.getTracks().forEach(t => pc.addTrack(t, this.localStream!));

    pc.onicecandidate = async (e) => {
      if (e.candidate && this.callId && this.chatId) {
        await this.signalTo(remoteUserId, 'ice-candidate', { payload: e.candidate.toJSON() }).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.cbs.onParticipantLeft(remoteUserId);
        this.peers.delete(remoteUserId);
        this.emitState();
      }
    };

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (stream) {
        this.cbs.onParticipantStream(remoteUserId, stream);
        this.emitState();
      }
    };

    this.peers.set(remoteUserId, { pc, remoteUserId, isOfferer });
    return pc;
  }

  private async createOffer(remoteUserId: string, chatId: string) {
    const pc = this.createPeer(remoteUserId, true);
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: this.callType === 'video' });
    await pc.setLocalDescription(offer);
    await this.signalTo(remoteUserId, 'offer', { payload: offer });
  }

  /* ─── Private: signaling ─────────────────────────────────── */

  private startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.poll(), POLL_MS);
  }

  private startGroupPolling(chatId: string) {
    if (this.groupPollTimer) return;
    this.groupPollTimer = setInterval(() => this.pollGroupState(chatId), 5_000);
  }

  private async poll() {
    try {
      const res = await fetch(`/api/calls?userId=${encodeURIComponent(this.localUserId)}&scope=group`);
      if (!res.ok) return;
      const signals: any[] = await res.json();
      for (const sig of signals) {
        await this.handleSignal(sig);
      }
    } catch {
      // transient
    }
  }

  private async pollGroupState(chatId: string) {
    if (!this.callId) return;
    try {
      const res = await fetch(`/api/calls/group?callId=${encodeURIComponent(this.callId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data) {
        // Call was ended by everyone else
        this.cleanup();
        return;
      }
      // Connect to any newly-joined participants we don't have a peer for
      const newParticipants: string[] = (data.participants || [])
        .map((p: any) => p.userId as string)
        .filter((uid: string) => uid !== this.localUserId && !this.peers.has(uid));
      for (const uid of newParticipants) {
        await this.createOffer(uid, chatId);
      }
      this.emitState();
    } catch {
      // ignore
    }
  }

  private async handleSignal(sig: any) {
    if (!this.callId) return;

    switch (sig.type) {
      case 'group-invite':
        // We already joined; ignore re-invites
        break;

      case 'group-leave':
        this.cbs.onParticipantLeft(sig.fromUserId);
        this.peers.get(sig.fromUserId)?.pc.close();
        this.peers.delete(sig.fromUserId);
        this.emitState();
        break;

      case 'offer': {
        const pc = this.createPeer(sig.fromUserId, false);
        await pc.setRemoteDescription(sig.payload);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await this.signalTo(sig.fromUserId, 'answer', { payload: answer });
        break;
      }

      case 'answer': {
        const entry = this.peers.get(sig.fromUserId);
        if (entry) {
          try {
            await entry.pc.setRemoteDescription(sig.payload);
          } catch (e) {
            console.error('[GroupCallService] setRemoteDescription failed', e);
          }
        }
        break;
      }

      case 'ice-candidate': {
        const entry = this.peers.get(sig.fromUserId);
        if (entry && sig.payload) {
          try {
            await entry.pc.addIceCandidate(sig.payload);
          } catch {
            // non-fatal
          }
        }
        break;
      }
    }
  }

  private async signalTo(toUserId: string, type: string, extra: Record<string, any>) {
    return fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        toUserId,
        callId: this.callId,
        chatId: this.chatId,
        fromUserId: this.localUserId,
        fromUserName: this.localUserName,
        ...extra,
      }),
    });
  }

  private async broadcast(type: string, userIds: string[], extra: Record<string, any>) {
    return fetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        toUserIds: userIds,
        callId: this.callId,
        chatId: this.chatId,
        fromUserId: this.localUserId,
        fromUserName: this.localUserName,
        ...extra,
      }),
    });
  }

  private async updateGroupState(action: 'start' | 'join' | 'leave') {
    if (!this.callId || !this.chatId) return;
    await fetch('/api/calls/group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        callId: this.callId,
        chatId: this.chatId,
        userId: this.localUserId,
        userName: this.localUserName,
      }),
    });
  }

  private emitState() {
    if (!this.callId || !this.chatId) {
      this.cbs.onStateChange(null);
      return;
    }
    this.cbs.onStateChange({
      callId: this.callId,
      chatId: this.chatId,
      isActive: true,
      localUserId: this.localUserId,
      participants: [],
    });
  }

  private cleanup() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    if (this.groupPollTimer) { clearInterval(this.groupPollTimer); this.groupPollTimer = null; }

    this.peers.forEach(({ pc }) => pc.close());
    this.peers.clear();

    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;

    this.callId = null;
    this.chatId = null;

    this.cbs.onStateChange(null);
  }
}
