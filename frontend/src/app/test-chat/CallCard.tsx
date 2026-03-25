'use client';

import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing } from 'lucide-react';

export interface CallInfo {
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing';
  status: 'completed' | 'missed' | 'declined';
  duration?: number; // в секундах (только для completed)
  timestamp: Date;
}

interface CallCardProps {
  call: CallInfo;
  isMyMessage: boolean;
}

export default function CallCard({ call, isMyMessage }: CallCardProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const getCallIcon = () => {
    if (call.status === 'missed') {
      return <PhoneMissed className="w-4 h-4" />;
    }
    if (call.direction === 'incoming') {
      return <PhoneIncoming className="w-4 h-4" />;
    }
    return <PhoneOutgoing className="w-4 h-4" />;
  };

  const getCallText = () => {
    if (call.status === 'missed') {
      return call.direction === 'incoming' ? 'Пропущенный звонок' : 'Отменённый звонок';
    }
    if (call.status === 'declined') {
      return call.direction === 'incoming' ? 'Отклонённый звонок' : 'Звонок отменён';
    }
    return call.direction === 'incoming' ? 'Входящий звонок' : 'Исходящий звонок';
  };

  const getCallTypeLabel = () => {
    return call.type === 'video' ? 'Видеозвонок' : 'Голосовой';
  };

  const isMissed = call.status === 'missed';
  const isCompleted = call.status === 'completed';

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-2xl border min-w-[200px] ${
      isMissed 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700'
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        isMissed 
          ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' 
          : call.type === 'video'
          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
          : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
      }`}>
        {call.type === 'video' ? <Video className="w-5 h-5" /> : getCallIcon()}
      </div>
      
      <div className="flex-1">
        <div className={`text-sm font-medium ${
          isMissed ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'
        }`}>
          {getCallText()}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {getCallTypeLabel()}
          </span>
          {isCompleted && call.duration !== undefined && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDuration(call.duration)}
              </span>
            </>
          )}
        </div>
      </div>

      <button 
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
          call.type === 'video'
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
        title="Перезвонить"
      >
        {call.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
      </button>
    </div>
  );
}
