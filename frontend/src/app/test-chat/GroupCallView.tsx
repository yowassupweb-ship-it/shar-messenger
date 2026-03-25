'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff, Users } from 'lucide-react';
import type { GroupCallState } from './GroupCallService';

export interface GroupParticipantUI {
  userId: string;
  userName: string;
  initials: string;
  avatarColor: string;
  stream: MediaStream | null;
  isMuted?: boolean;
  isSpeaking?: boolean;
}

export interface LocalUserInfo {
  userId: string;
  userName: string;
  initials: string;
  avatarColor: string;
}

export interface GroupCallViewProps {
  groupCallState: GroupCallState | null;
  participants: GroupParticipantUI[];
  localStream: MediaStream | null;
  localUser?: LocalUserInfo | null;
  onLeave: () => void;
  onToggleMute: () => boolean;
}

function Avatar({ participant }: { participant: GroupParticipantUI }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (participant.stream && videoRef.current) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const hasVideo = !!participant.stream?.getVideoTracks().find(t => t.enabled);

  return (
    <div
      className={`relative flex flex-col items-center gap-2 transition-all duration-200 ${
        participant.isSpeaking ? 'scale-105' : 'scale-100'
      }`}
    >
      {/* Speaking ring */}
      {participant.isSpeaking && (
        <div
          className={`absolute inset-0 rounded-full animate-ping opacity-30 bg-gradient-to-br ${participant.avatarColor}`}
          style={{ transform: 'scale(1.15)' }}
        />
      )}

      <div
        className={`relative w-20 h-20 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br ${participant.avatarColor} text-white font-bold text-2xl border-2 border-white/20 shadow-lg ${
          participant.isSpeaking ? 'border-blue-400/60 shadow-blue-400/30' : ''
        }`}
      >
        {hasVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          participant.initials
        )}
        {participant.isMuted && (
          <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center border border-white/30">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <span className="text-white/80 text-xs text-center max-w-[80px] truncate">
        {participant.userName}
      </span>
    </div>
  );
}

export default function GroupCallView({
  groupCallState,
  participants,
  localStream,
  localUser,
  onLeave,
  onToggleMute,
}: GroupCallViewProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isSpeakingSelf, setIsSpeakingSelf] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const speakingRafRef = useRef<number | null>(null);

  // Hidden audio elements for each remote participant
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (groupCallState?.isActive) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [groupCallState?.isActive]);

  // Detect own speaking via AnalyserNode
  useEffect(() => {
    if (!localStream) {
      setIsSpeakingSelf(false);
      return;
    }
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyserRef.current = analyser;
    const source = audioCtx.createMediaStreamSource(localStream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const THRESHOLD = 20;
    let speaking = false;

    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const nowSpeaking = avg > THRESHOLD;
      if (nowSpeaking !== speaking) {
        speaking = nowSpeaking;
        setIsSpeakingSelf(nowSpeaking);
      }
      speakingRafRef.current = requestAnimationFrame(tick);
    };
    speakingRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (speakingRafRef.current) cancelAnimationFrame(speakingRafRef.current);
      source.disconnect();
      audioCtx.close();
    };
  }, [localStream]);

  // Play remote audio streams
  useEffect(() => {
    participants.forEach(p => {
      if (!p.stream) return;
      let el = audioRefs.current.get(p.userId);
      if (!el) {
        el = new Audio();
        el.autoplay = true;
        audioRefs.current.set(p.userId, el);
      }
      if (el.srcObject !== p.stream) {
        el.srcObject = p.stream;
      }
    });
    // Cleanup removed participants
    audioRefs.current.forEach((el, uid) => {
      if (!participants.find(p => p.userId === uid)) {
        el.srcObject = null;
        audioRefs.current.delete(uid);
      }
    });
  }, [participants]);

  if (!groupCallState?.isActive) return null;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleMute = () => setIsMuted(onToggleMute());

  return (
    <div className="fixed inset-0 z-[200] flex flex-col">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f1729 100%)' }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-white/60" />
          <span className="text-white/60 text-sm font-medium">Голосовой чат</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/80 text-sm">{fmt(elapsed)}</span>
        </div>
      </div>

      {/* Participants grid */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div
          className={`flex flex-wrap gap-6 justify-center ${
            participants.length <= 4 ? 'gap-8' : 'gap-5'
          }`}
        >
          {/* Own avatar — always first */}
          {localUser && (
            <Avatar
              key="self"
              participant={{
                userId: localUser.userId,
                userName: localUser.userName + ' (вы)',
                initials: localUser.initials,
                avatarColor: localUser.avatarColor,
                stream: null,
                isMuted: isMuted,
                isSpeaking: isSpeakingSelf,
              }}
            />
          )}
          {participants.map(p => (
            <Avatar key={p.userId} participant={p} />
          ))}
        </div>

        {/* Empty state */}
        {participants.length === 0 && (
          <div className="text-center">
            <p className="text-white/40 text-base">Ожидание участников…</p>
            <p className="text-white/25 text-sm mt-1">Пригласите участников в чат</p>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="relative z-10 flex items-center justify-center gap-5 pb-14 pt-4">
        {/* Mute */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={handleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              isMuted ? 'bg-red-500/30 text-red-400 border border-red-400/30' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <span className="text-white/50 text-[10px]">{isMuted ? 'Размкр.' : 'Микрофон'}</span>
        </div>

        {/* Leave */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={onLeave}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-500/30 transition-all active:scale-95"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
          <span className="text-white/50 text-[10px]">Покинуть</span>
        </div>
      </div>
    </div>
  );
}
