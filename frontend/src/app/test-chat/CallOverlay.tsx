'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import type { CallState, CallType, IncomingCall, CallDebugDump } from './LiveKitCallService';

export interface CallOverlayProps {
  /** Current call state from CallService */
  callState: CallState;
  /** Type of call */
  callType: CallType;
  /** Name/title of the remote party */
  remoteUserName: string;
  /** Avatar initials */
  remoteInitials: string;
  /** Avatar gradient colour class */
  remoteAvatarColor: string;
  /** Incoming call details (present only when state === 'ringing') */
  incomingCall?: IncomingCall | null;
  /** Remote audio stream to play */
  remoteStream: MediaStream | null;
  /** Local stream (for video preview) */
  localStream: MediaStream | null;
  onAccept: () => void;
  onReject: () => void;
  onHangup: () => void;
  onToggleMute: () => boolean;
  onToggleCamera: () => boolean;
  onRequestDump?: () => Promise<CallDebugDump>;
  onListAudioInputs?: () => Promise<MediaDeviceInfo[]>;
  onSwitchAudioInput?: (deviceId: string) => Promise<void>;
  onListAudioOutputs?: () => Promise<MediaDeviceInfo[]>;
}

/** Format hh:mm:ss or mm:ss */
function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const AVATAR_COLORS: Record<string, string> = {
  'from-blue-400 to-blue-600': '#2563eb',
  'from-green-400 to-green-600': '#16a34a',
  'from-purple-400 to-purple-600': '#9333ea',
  'from-pink-400 to-pink-600': '#ec4899',
  'from-orange-400 to-orange-600': '#ea580c',
};

export default function CallOverlay({
  callState,
  callType,
  remoteUserName,
  remoteInitials,
  remoteAvatarColor,
  incomingCall,
  remoteStream,
  localStream,
  onAccept,
  onReject,
  onHangup,
  onToggleMute,
  onToggleCamera,
  onRequestDump,
  onListAudioInputs,
  onSwitchAudioInput,
  onListAudioOutputs,
}: CallOverlayProps) {
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedInputId, setSelectedInputId] = useState('');
  const [selectedOutputId, setSelectedOutputId] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = (line: string) => {
    setLogLines(prev => {
      const next = [...prev, line];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  };

  useEffect(() => {
    if (!showLogs) return;
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const stringify = (args: any[]) =>
      args
        .map(a => {
          if (typeof a === 'string') return a;
          try { return JSON.stringify(a); } catch { return String(a); }
        })
        .join(' ');

    console.log = (...args: any[]) => {
      originalLog(...args);
      addLog(`[LOG] ${stringify(args)}`);
    };
    console.warn = (...args: any[]) => {
      originalWarn(...args);
      addLog(`[WARN] ${stringify(args)}`);
    };
    console.error = (...args: any[]) => {
      originalError(...args);
      addLog(`[ERR] ${stringify(args)}`);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, [showLogs]);

  useEffect(() => {
    if (!showLogs) return;
    let mounted = true;
    const loadDevices = async () => {
      try {
        if (onListAudioInputs) {
          const ins = await onListAudioInputs();
          if (mounted) {
            setAudioInputs(ins);
            if (!selectedInputId && ins[0]?.deviceId) setSelectedInputId(ins[0].deviceId);
          }
        }
        if (onListAudioOutputs) {
          const outs = await onListAudioOutputs();
          if (mounted) {
            setAudioOutputs(outs);
            if (!selectedOutputId && outs[0]?.deviceId) setSelectedOutputId(outs[0].deviceId);
          }
        }
      } catch (e) {
        addLog(`[ERR] Device list load failed: ${String(e)}`);
      }
    };
    loadDevices();
    return () => { mounted = false; };
  }, [showLogs, onListAudioInputs, onListAudioOutputs, selectedInputId, selectedOutputId]);

  useEffect(() => {
    if (!showLogs || !onRequestDump || callState === 'idle') return;
    const tick = async () => {
      try {
        const dump = await onRequestDump();
        addLog(`[DUMP] ${JSON.stringify(dump)}`);
      } catch (e) {
        addLog(`[ERR] Dump failed: ${String(e)}`);
      }
    };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, [showLogs, onRequestDump, callState]);

  // Play remote audio (and video)
  useEffect(() => {
    if (!remoteStream) return;
    let retryId: number | null = null;
    let audioEl: HTMLAudioElement | null = null;
    let webAudioCtx: AudioContext | null = null;
    let webAudioSource: MediaStreamAudioSourceNode | null = null;
    let webAudioGain: GainNode | null = null;
    
    console.log('[CallOverlay] Remote stream received:', {
      id: remoteStream.id,
      active: remoteStream.active,
      audioTracks: remoteStream.getAudioTracks().length,
      videoTracks: remoteStream.getVideoTracks().length
    });
    
    if (remoteAudioRef.current) {
      console.log('[CallOverlay] Setting remote audio stream');
      const audioElement = remoteAudioRef.current;
      audioEl = audioElement;
      audioElement.volume = 1.0;
      audioElement.muted = false;
      audioElement.autoplay = true;
      
      // Проверяем треки
      remoteStream.getAudioTracks().forEach((track, i) => {
        console.log(`[CallOverlay] Audio track ${i}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
      });
      
      const tryPlayAudio = (reason: string) => {
        audioElement.play()
          .then(() => console.log(`[CallOverlay] ✓ Audio playback started (${reason})`))
          .catch(err => {
            // Normal race when a new media load replaces the previous play request.
            if (err?.name === 'AbortError') {
              console.warn(`[CallOverlay] Audio play interrupted (${reason}):`, err?.message || err);
              return;
            }
            console.error(`[CallOverlay] ✗ Audio playback failed (${reason}):`, err);
          });
      };

      // Set handlers before srcObject to avoid missing early events.
      audioElement.onloadedmetadata = () => {
        console.log('[CallOverlay] Audio metadata loaded');
        tryPlayAudio('loadedmetadata');
      };
      audioElement.oncanplay = () => {
        console.log('[CallOverlay] Audio canplay');
        tryPlayAudio('canplay');
      };

      if (audioElement.srcObject !== remoteStream) {
        audioElement.srcObject = remoteStream;
      }

      // Immediate attempt + delayed retry (helps with autoplay/timing races)
      tryPlayAudio('immediate');
      retryId = window.setTimeout(() => tryPlayAudio('retry-250ms'), 250);

      // If track unmutes later, attempt playback again.
      remoteStream.getAudioTracks().forEach((track) => {
        track.onunmute = () => {
          console.log('[CallOverlay] Remote audio track unmuted, replay attempt');
          tryPlayAudio('track-onunmute');
        };
      });

      // WebAudio fallback: some environments report play() success but remain silent.
      // Routing stream through AudioContext destination makes playback more reliable.
      if (remoteStream.getAudioTracks().length > 0) {
        try {
          webAudioCtx = new AudioContext();
          webAudioSource = webAudioCtx.createMediaStreamSource(remoteStream);
          webAudioGain = webAudioCtx.createGain();
          webAudioGain.gain.value = 1.0;
          webAudioSource.connect(webAudioGain);
          webAudioGain.connect(webAudioCtx.destination);
          webAudioCtx.resume().catch(() => {});
          console.log('[CallOverlay] WebAudio fallback connected');
        } catch (err) {
          console.warn('[CallOverlay] WebAudio fallback failed:', err);
        }
      }
    }
    
    if (remoteVideoRef.current && callType === 'video') {
      console.log('[CallOverlay] Setting remote video stream');
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      remoteVideoRef.current.onloadedmetadata = () => {
        remoteVideoRef.current?.play()
          .then(() => console.log('[CallOverlay] ✓ Video playback started'))
          .catch(err => {
            if (err?.name === 'AbortError') {
              console.warn('[CallOverlay] Video play interrupted:', err?.message || err);
              return;
            }
            console.error('[CallOverlay] ✗ Video playback failed:', err);
          });
      };
    }

      return () => {
        if (retryId !== null) {
          window.clearTimeout(retryId);
        }
        if (audioEl) {
          audioEl.onloadedmetadata = null;
          audioEl.oncanplay = null;
        }
        if (webAudioSource) {
          try { webAudioSource.disconnect(); } catch {}
        }
        if (webAudioGain) {
          try { webAudioGain.disconnect(); } catch {}
        }
        if (webAudioCtx) {
          webAudioCtx.close().catch(() => {});
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.onloadedmetadata = null;
        }
      };
  }, [remoteStream, callType]);

  // Play local video preview
  useEffect(() => {
    if (localStream && localVideoRef.current && callType === 'video') {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callType]);

  // Call duration timer
  useEffect(() => {
    if (callState === 'connected') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  // Incoming call ringtone - приятная мелодия
  const isIncoming = callState === 'ringing' && incomingCall;
  useEffect(() => {
    if (!isIncoming) return;

    const audioCtx = new AudioContext();
    let timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let oscRefs: OscillatorNode[] = [];

    // Мелодичный рингтон: восходящая последовательность с паузами
    // C5-E5-G5 (мажорное трезвучие)
    const melodyPattern = [
      { delay: 0, duration: 300, freq: 523.25 },      // C5
      { delay: 400, duration: 300, freq: 659.25 },    // E5
      { delay: 800, duration: 400, freq: 783.99 },    // G5
      { delay: 1400, duration: 200, freq: 523.25 },   // C5 (короткий)
      { delay: 1700, duration: 200, freq: 659.25 },   // E5 (короткий)
      { delay: 2000, duration: 500, freq: 783.99 },   // G5 (длинный)
    ];

    const playNote = (freq: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.frequency.value = freq;
      osc.type = 'sine';
      
      // Плавное нарастание и затухание
      const now = audioCtx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.setValueAtTime(0.15, now + duration / 1000 - 0.05);
      gain.gain.linearRampToValueAtTime(0, now + duration / 1000);

      osc.start(now);
      osc.stop(now + duration / 1000);
      oscRefs.push(osc);
    };

    // Повторяем мелодию каждые 4 секунды
    const playPattern = () => {
      melodyPattern.forEach(({ delay, duration, freq }) => {
        const tid = setTimeout(() => playNote(freq, duration), delay);
        timeoutIds.push(tid);
      });
      const repeatTid = setTimeout(() => playPattern(), 4000);
      timeoutIds.push(repeatTid);
    };

    playPattern();

    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      oscRefs.forEach(osc => {
        try { osc.stop(); } catch {}
      });
      audioCtx.close();
    };
  }, [isIncoming]);

  // Outgoing call tone - пульсирующий гудок
  useEffect(() => {
    if (callState !== 'calling') return;

    const audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.frequency.value = 425; // стандартная частота телефонного гудка
    osc.type = 'sine';

    // Создаем пульсацию: 1 сек звук, 4 сек тишина
    const now = audioCtx.currentTime;
    const cycleDuration = 5; // 1s on + 4s off
    
    for (let i = 0; i < 20; i++) { // 20 циклов = 100 секунд
      const cycleStart = now + i * cycleDuration;
      gain.gain.setValueAtTime(0, cycleStart);
      gain.gain.linearRampToValueAtTime(0.08, cycleStart + 0.05);
      gain.gain.setValueAtTime(0.08, cycleStart + 1);
      gain.gain.linearRampToValueAtTime(0, cycleStart + 1.05);
    }

    osc.start();

    return () => {
      osc.stop();
      audioCtx.close();
    };
  }, [callState]);

  if (callState === 'idle') return null;

  const statusLabel =
    callState === 'calling'
      ? 'Вызов…'
      : callState === 'ringing'
      ? `Входящий ${callType === 'video' ? 'видео' : 'голосовой'} вызов`
      : callState === 'connected'
      ? formatDuration(elapsed)
      : 'Завершение…';

  const handleMute = () => setIsMuted(onToggleMute());
  const handleCamera = () => setIsCameraOff(onToggleCamera());

  const handleChangeInput = async (deviceId: string) => {
    setSelectedInputId(deviceId);
    if (!onSwitchAudioInput) return;
    try {
      await onSwitchAudioInput(deviceId);
      addLog(`[LOG] Switched microphone to ${deviceId}`);
    } catch (e) {
      addLog(`[ERR] Failed to switch microphone: ${String(e)}`);
    }
  };

  const handleChangeOutput = async (deviceId: string) => {
    setSelectedOutputId(deviceId);
    const audioEl = remoteAudioRef.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!audioEl?.setSinkId) {
      addLog('[WARN] setSinkId is not supported in this browser');
      return;
    }
    try {
      await audioEl.setSinkId(deviceId);
      addLog(`[LOG] Switched output to ${deviceId}`);
    } catch (e) {
      addLog(`[ERR] Failed to switch output: ${String(e)}`);
    }
  };

  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[320px] rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      {/* Hidden audio player for remote stream */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        preload="auto"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />

      {/* Subtle glow accent at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: AVATAR_COLORS[remoteAvatarColor] || '#6366f1' }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-3 px-5 py-5">
        {/* Avatar + name row */}
        <div className="flex items-center gap-3 w-full">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${remoteAvatarColor} text-white font-bold text-lg shadow-lg flex-shrink-0`}
          >
            {remoteInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-[15px] leading-tight truncate">{remoteUserName}</p>
            <p className="text-white/55 text-xs mt-0.5 animate-pulse">{statusLabel}</p>
          </div>
        </div>

        {/* Video preview for video calls */}
        {callType === 'video' && callState === 'connected' && (
          <div className="relative w-full rounded-xl overflow-hidden bg-black/40" style={{ aspectRatio: '16/9' }}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Local PiP */}
            <div className="absolute bottom-1.5 right-1.5 w-16 rounded-lg overflow-hidden border border-white/20 shadow-md" style={{ aspectRatio: '4/3' }}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            </div>
          </div>
        )}

        {/* Control buttons */}
        {callState === 'ringing' ? (
          /* Incoming call — accept / reject */
          <div className="flex items-center justify-center gap-10 w-full pt-1">
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={onReject}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
              <span className="text-white/50 text-[10px]">Отклонить</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={onAccept}
                className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg transition-all active:scale-95"
              >
                <Phone className="w-5 h-5" />
              </button>
              <span className="text-white/50 text-[10px]">Принять</span>
            </div>
          </div>
        ) : (
          /* Calling / connected */
          <div className="flex items-center justify-center gap-3 w-full pt-1">
            {/* Mute */}
            <button
              onClick={handleMute}
              title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                isMuted ? 'bg-white/25 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Camera (video only) */}
            {callType === 'video' && (
              <button
                onClick={handleCamera}
                title={isCameraOff ? 'Включить камеру' : 'Выключить камеру'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  isCameraOff ? 'bg-white/25 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>
            )}

            {/* Speaker */}
            <button
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95"
              title="Громкость"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Logs toggle */}
            <button
              onClick={() => setShowLogs(v => !v)}
              className={`w-10 h-10 rounded-full text-white text-[10px] font-mono flex items-center justify-center transition-all active:scale-95 ${showLogs ? 'bg-blue-500/70' : 'bg-white/10 hover:bg-white/20'}`}
              title="Логи"
            >
              LOG
            </button>

            {/* End call */}
            <button
              onClick={onHangup}
              className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              title="Завершить"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        )}

        {showLogs && (
          <div className="w-full mt-1 rounded-xl border border-white/15 bg-black/50 backdrop-blur-md p-2 text-white">
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <label className="text-[10px] text-white/60 flex flex-col gap-0.5">
                Микрофон
                <select
                  value={selectedInputId}
                  onChange={(e) => handleChangeInput(e.target.value)}
                  className="bg-black/40 border border-white/15 rounded px-1.5 py-0.5 text-[10px]"
                >
                  {audioInputs.map((d, i) => (
                    <option key={d.deviceId || String(i)} value={d.deviceId}>
                      {d.label || `Микрофон ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[10px] text-white/60 flex flex-col gap-0.5">
                Вывод
                <select
                  value={selectedOutputId}
                  onChange={(e) => handleChangeOutput(e.target.value)}
                  className="bg-black/40 border border-white/15 rounded px-1.5 py-0.5 text-[10px]"
                >
                  {audioOutputs.map((d, i) => (
                    <option key={d.deviceId || String(i)} value={d.deviceId}>
                      {d.label || `Вывод ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="h-32 overflow-y-auto rounded border border-white/10 bg-black/40 p-1.5 font-mono text-[9px] leading-3.5 whitespace-pre-wrap">
              {logLines.length === 0 ? 'Логи появятся здесь…' : logLines.join('\n')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
