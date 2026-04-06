import { useEffect, useRef } from 'react';
import { MoreVertical, ArrowLeft, Phone, Video, Users, Star, Bell, Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import type { Message } from '@/components/features/messages/types';
import PinnedMessageBar from './PinnedMessageBar';

interface ChatHeaderProps {
  title: string;
  isLoading: boolean;
  isTyping?: boolean;
  messageCount: number;
  chatId: string;
  isGroupChat?: boolean;
  hasActiveGroupCall?: boolean;
  groupCallParticipants?: number;
  onBack?: () => void;
  isMobile?: boolean;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
  onStartGroupCall?: () => void;
  onOpenProfile?: () => void;
  onOpenMenu?: () => void;
  subtitle?: string;
  pinnedMessages?: Message[];
  onGoToMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  canUnpin?: boolean;
  onOpenSearch?: () => void;
  // Message search
  showMessageSearch?: boolean;
  messageSearchQuery?: string;
  onMessageSearchQueryChange?: (q: string) => void;
  searchMatchCount?: number;
  searchMatchIndex?: number;
  onSearchPrev?: () => void;
  onSearchNext?: () => void;
  onCloseSearch?: () => void;
  /** URL аватарки чата (реальное фото пользователя или группы) */
  avatarSrc?: string;
}

// Градиенты аватаров
const AVATAR_COLORS = [
  'from-blue-400 to-blue-600',
  'from-green-400 to-green-600',
  'from-purple-400 to-purple-600',
  'from-pink-400 to-pink-600',
  'from-orange-400 to-orange-600',
  'from-red-400 to-red-600',
  'from-teal-400 to-teal-600',
  'from-indigo-400 to-indigo-600',
];

function getInitials(title: string): string {
  const words = title.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0][0]?.toUpperCase() || '?';
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getAvatarColor(chatId: string): string {
  const hash = chatId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function ChatHeader({
  title,
  isLoading,
  isTyping = false,
  messageCount,
  chatId,
  isGroupChat,
  hasActiveGroupCall,
  groupCallParticipants,
  onBack,
  isMobile,
  onStartVoiceCall,
  onStartVideoCall,
  onStartGroupCall,
  onOpenProfile,
  onOpenMenu,
  subtitle,
  pinnedMessages = [],
  onGoToMessage,
  onUnpinMessage,
  canUnpin = true,
  onOpenSearch,
  showMessageSearch = false,
  messageSearchQuery = '',
  onMessageSearchQueryChange,
  searchMatchCount = 0,
  searchMatchIndex = 0,
  onSearchPrev,
  onSearchNext,
  onCloseSearch,
  avatarSrc,
}: ChatHeaderProps) {
  const hasPinnedMessages = pinnedMessages.length > 0;
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showMessageSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showMessageSearch]);

  // ── Search bar (overlay): same for mobile and desktop ───────────────────
  if (showMessageSearch) {
    const counter = searchMatchCount > 0
      ? `${searchMatchIndex + 1} / ${searchMatchCount}`
      : (messageSearchQuery.trim() ? '0 результатов' : '');

    if (isMobile) {
      return (
        <div className="px-0 pt-0 pb-1 bg-transparent border-0 shadow-none">
          <div className="mx-0 w-full h-14 px-3 rounded-none border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 flex items-center gap-2 min-w-0">
            <button
              onClick={onCloseSearch}
              className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 text-gray-600 dark:text-gray-300"
              title="Закрыть поиск"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 flex items-center gap-1 min-w-0 bg-gray-100 dark:bg-slate-700 rounded-full px-3 h-9">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={messageSearchQuery}
                onChange={(e) => onMessageSearchQueryChange?.(e.target.value)}
                placeholder="Поиск в чате..."
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none min-w-0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.shiftKey ? onSearchPrev?.() : onSearchNext?.(); }
                  if (e.key === 'Escape') onCloseSearch?.();
                }}
              />
              {messageSearchQuery && (
                <button onClick={() => onMessageSearchQueryChange?.('')} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {counter && <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 min-w-[52px] text-center">{counter}</span>}
            <button onClick={onSearchPrev} disabled={searchMatchCount === 0} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 text-gray-600 dark:text-gray-300 disabled:opacity-40">
              <ChevronUp className="w-4 h-4" />
            </button>
            <button onClick={onSearchNext} disabled={searchMatchCount === 0} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 text-gray-600 dark:text-gray-300 disabled:opacity-40">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="px-0 pt-2 pb-2 flex items-center bg-transparent border-0 shadow-none">
        <div className="flex items-center gap-1 w-full px-0">
          <div className="h-10 mt-[2px] ml-[5px] flex-1 px-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-[0_3px_10px_rgba(0,0,0,0.09)] dark:shadow-[0_3px_10px_rgba(0,0,0,0.45)] flex items-center gap-2 min-w-0">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={messageSearchQuery}
              onChange={(e) => onMessageSearchQueryChange?.(e.target.value)}
              placeholder="Поиск по сообщениям..."
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none min-w-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.shiftKey ? onSearchPrev?.() : onSearchNext?.(); }
                if (e.key === 'Escape') onCloseSearch?.();
              }}
            />
            {messageSearchQuery && (
              <button onClick={() => onMessageSearchQueryChange?.('')} className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {counter && <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 pr-1 min-w-[64px] text-right">{counter}</span>}
          </div>
          <div className="h-10 mt-[2px] mr-[5px] px-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-[0_3px_10px_rgba(0,0,0,0.09)] dark:shadow-[0_3px_10px_rgba(0,0,0,0.45)] flex items-center gap-1 flex-shrink-0">
            <button onClick={onSearchPrev} disabled={searchMatchCount === 0} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-40" title="Предыдущее (Shift+Enter)">
              <ChevronUp className="w-[14px] h-[14px]" />
            </button>
            <button onClick={onSearchNext} disabled={searchMatchCount === 0} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-40" title="Следующее (Enter)">
              <ChevronDown className="w-[14px] h-[14px]" />
            </button>
            <button onClick={onCloseSearch} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300" title="Закрыть поиск">
              <X className="w-[14px] h-[14px]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="px-0 pt-0 pb-1 bg-transparent border-0 shadow-none">
        <div className="mx-0 w-full h-14 px-3 rounded-none border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 text-gray-600 dark:text-gray-300"
              title="Назад к чатам"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Аватарка */}
          {chatId.startsWith('favorites_') ? (
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-sm flex-shrink-0">
              <Star className="w-5 h-5" fill="currentColor" strokeWidth={0} />
            </div>
          ) : (chatId.startsWith('notifications-') || chatId.startsWith('notifications_')) ? (
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-sm flex-shrink-0">
              <Bell className="w-5 h-5" />
            </div>
          ) : avatarSrc ? (
            <img
              src={avatarSrc}
              alt={title}
              className="w-10 h-10 rounded-full object-cover shadow-sm flex-shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${getAvatarColor(chatId)} text-white font-semibold text-sm shadow-sm flex-shrink-0`}
            >
              {getInitials(title)}
            </div>
          )}

          <button
            onClick={onOpenProfile}
            className="flex-1 min-w-0 flex flex-col items-start cursor-pointer hover:opacity-80 transition-opacity"
            title="Открыть профиль"
          >
            <div className="font-semibold text-[16px] text-gray-900 dark:text-gray-100 leading-tight truncate w-full text-left">{title}</div>
            <div className="text-[13px] text-gray-500 dark:text-gray-400 leading-tight truncate w-full text-left">
              {hasActiveGroupCall
                ? `🔊 Голосовой чат · ${groupCallParticipants ?? 0} уч.`
                : isTyping
                ? 'печатает...'
                : isGroupChat
                ? (subtitle || 'Групповой чат')
                : (subtitle || 'был(а) в сети недавно')}
            </div>
          </button>

          {isGroupChat ? (
            <button
              onClick={onStartGroupCall}
              title={hasActiveGroupCall ? 'Войти в голосовой чат' : 'Начать голосовой чат'}
              className={`relative w-9 h-9 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${
                hasActiveGroupCall
                  ? 'border-green-400/60 bg-green-500/20 text-green-700 dark:text-green-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              {hasActiveGroupCall && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {groupCallParticipants}
                </span>
              )}
            </button>
          ) : (
            <>
              {onStartVideoCall && (
                <button
                  onClick={onStartVideoCall}
                  className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 text-gray-600 dark:text-gray-300"
                  title="Видеозвонок"
                >
                  <Video className="w-4 h-4" />
                </button>
              )}
              {onStartVoiceCall && (
                <button
                  onClick={onStartVoiceCall}
                  className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 text-gray-600 dark:text-gray-300"
                  title="Позвонить"
                >
                  <Phone className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 text-gray-600 dark:text-gray-300"
              title="Поиск"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
        </div>
        {hasPinnedMessages && onGoToMessage && onUnpinMessage && (
          <PinnedMessageBar
            pinnedMessages={pinnedMessages}
            onGoToMessage={onGoToMessage}
            onUnpinMessage={onUnpinMessage}
            canUnpin={canUnpin}
            isMobile={true}
          />
        )}
      </div>
    );
  }

  return (
    <div className="px-0 pt-2 pb-2 flex items-center bg-transparent border-0 shadow-none">
      <div className="flex items-center gap-1 w-full px-0">
        {isMobile && onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 text-gray-600 dark:text-gray-300"
            title="Назад к чатам"
          >
            <ArrowLeft className="w-[14px] h-[14px]" />
          </button>
        )}

        {/* Островок 1: аватар + имя + статус (фиксированный размер) */}
        <div className="h-10 mt-[2px] ml-[5px] px-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-[0_3px_10px_rgba(0,0,0,0.09)] dark:shadow-[0_3px_10px_rgba(0,0,0,0.45)] inline-flex items-center gap-2 flex-shrink-0 min-w-0">
          {chatId.startsWith('favorites_') ? (
            <div className="-ml-1 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-sm">
              <Star className="w-4 h-4" fill="currentColor" strokeWidth={0} />
            </div>
          ) : (chatId.startsWith('notifications-') || chatId.startsWith('notifications_')) ? (
            <div className="-ml-1 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-sm">
              <Bell className="w-4 h-4" />
            </div>
          ) : avatarSrc ? (
            <img
              src={avatarSrc}
              alt={title}
              className="-ml-1 w-8 h-8 rounded-full object-cover shadow-sm flex-shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div
              className={`-ml-1 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${getAvatarColor(chatId)} text-white font-semibold text-xs shadow-sm`}
            >
              {getInitials(title)}
            </div>
          )}

          <div className="flex flex-col justify-center min-w-0">
            <div className="font-semibold text-[13px] text-gray-900 dark:text-gray-100 leading-tight truncate">{title}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight truncate">
              {hasActiveGroupCall
                ? `🔊 Голосовой чат · ${groupCallParticipants ?? 0} уч.`
                : isTyping
                ? 'печатает...'
                : isGroupChat
                ? (subtitle || 'Групповой чат')
                : (subtitle || 'был(а) в сети недавно')}
            </div>
          </div>

          {/* Inline phone button inside the name pill for quick access */}
          {!isGroupChat && onStartVoiceCall && (
            <button
              onClick={(e) => { e.stopPropagation(); onStartVoiceCall(); }}
              className="ml-1 shrink-0 w-7 h-7 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300"
              title="Позвонить"
            >
              <Phone className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Pinned messages pill - гибкий элемент, сжимается при нехватке места */}
        {hasPinnedMessages && onGoToMessage && onUnpinMessage && (
          <div className="flex-1 min-w-0 max-w-[300px] flex items-center justify-center mt-[2px] px-1">
            <PinnedMessageBar
              pinnedMessages={pinnedMessages}
              onGoToMessage={onGoToMessage}
              onUnpinMessage={onUnpinMessage}
              canUnpin={canUnpin}
              isMobile={false}
            />
          </div>
        )}

        {/* Островок 2: кнопки действий (фиксированный размер) */}
        <div className="h-10 mt-[2px] mr-[5px] px-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-[0_3px_10px_rgba(0,0,0,0.09)] dark:shadow-[0_3px_10px_rgba(0,0,0,0.45)] flex items-center gap-1.5 flex-shrink-0 ml-auto">
          {isGroupChat ? (
            <button
              onClick={onStartGroupCall}
              title={hasActiveGroupCall ? 'Войти в голосовой чат' : 'Начать голосовой чат'}
              className={`relative w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                hasActiveGroupCall
                  ? 'border-green-400/60 bg-green-500/20 text-green-700 dark:text-green-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <Users className="w-[14px] h-[14px]" />
              {hasActiveGroupCall && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {groupCallParticipants}
                </span>
              )}
            </button>
          ) : (
            <>
              {onStartVideoCall && (
                <button
                  onClick={onStartVideoCall}
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300"
                  title="Видеозвонок"
                >
                  <Video className="w-[14px] h-[14px]" />
                </button>
              )}
              {onStartVoiceCall && (
                <button
                  onClick={onStartVoiceCall}
                  className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300"
                  title="Позвонить"
                >
                  <Phone className="w-[14px] h-[14px]" />
                </button>
              )}
            </>
          )}

          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300"
              title="Поиск"
            >
              <Search className="w-[14px] h-[14px]" />
            </button>
          )}

          <button
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-gray-300"
            title="Меню"
          >
            <MoreVertical className="w-[14px] h-[14px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
