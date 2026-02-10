'use client';

import React from 'react';
import { Pin, Users } from 'lucide-react';
import Avatar from '@/components/common/data-display/Avatar';
import type { User, Message, Chat } from './types';

interface ChatItemProps {
  chat: Chat;
  isSelected: boolean;
  isHovered?: boolean;
  onSelect: (chat: Chat) => void;
  onHover?: (chatId: string | null) => void;
  onContextMenu: (e: React.MouseEvent, chat: Chat) => void;
  getChatTitle: (chat: Chat) => string;
  getChatAvatarData: (chat: Chat) => { type: "user" | "group" | "favorites" | "notifications"; name: string; avatar?: string };
  currentUser: User | null;
  users: User[];
  chatDrafts: Record<string, string>;
  variant: 'collapsed-icon' | 'mobile' | 'desktop';
  isPinned?: boolean;
}

const ChatItem = React.memo<ChatItemProps>(({
  chat,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onContextMenu,
  getChatTitle,
  getChatAvatarData,
  currentUser,
  users,
  chatDrafts,
  variant,
  isPinned
}) => {
  const avatarData = getChatAvatarData(chat);
  const otherParticipantId = !chat.isGroup ? chat.participantIds?.find(id => id !== currentUser?.id) : undefined;
  const otherUser = otherParticipantId ? users.find(u => u.id === otherParticipantId) : undefined;
  const hasUnread = !chat.isFavoritesChat && (chat.unreadCount || 0) > 0;

  // Collapsed icon view (только desktop)
  if (variant === 'collapsed-icon') {
    return (
      <div
        key={chat.id}
        className="relative"
        onMouseEnter={() => onHover?.(chat.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        <button
          onClick={() => onSelect(chat)}
          className={`w-full flex justify-center py-2 relative ${isSelected ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-tertiary)]/50'}`}
        >
          <div className="relative">
            <Avatar
              src={avatarData.avatar || ''}
              name={avatarData.name}
              type={avatarData.type}
              size="lg"
              isOnline={otherUser?.isOnline}
            />
            {hasUnread && (
              <div className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-[#007aff]/80 to-[#007aff]/60 backdrop-blur-sm border-2 border-[var(--bg-secondary)] text-white text-[10px] font-bold flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,122,255,0.3)]">
                {chat.unreadCount! > 9 ? '9+' : chat.unreadCount}
              </div>
            )}
            {isSelected && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-1 h-8 bg-cyan-500 rounded-r-full" />
            )}
          </div>
        </button>
        {isHovered && (
          <div 
            className="absolute left-[72px] top-0 z-50 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px]"
            style={{ pointerEvents: 'none' }}
          >
            <div className="flex items-center gap-2 mb-2">
              {chat.pinnedByUser?.[currentUser?.id || ''] && <Pin className="w-3 h-3 text-cyan-400 flex-shrink-0" />}
              {chat.isGroup && <Users className="w-3 h-3 text-purple-400 flex-shrink-0" />}
              <span className="font-medium text-sm text-[var(--text-primary)] truncate select-none">{getChatTitle(chat)}</span>
            </div>
            {chat.lastMessage && (
              <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-1">
                <span className="text-[var(--text-secondary)]">{chat.lastMessage.authorName}:</span> {chat.lastMessage.content}
              </p>
            )}
            {hasUnread && (
              <div className="flex items-center gap-1.5 mt-2">
                <div className="min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-br from-[#007aff]/80 to-[#007aff]/60 backdrop-blur-sm border border-white/20 text-white text-[9px] font-bold flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,122,255,0.3)]">
                  {chat.unreadCount! > 9 ? '9+' : chat.unreadCount}
                </div>
                <span className="text-[10px] text-cyan-400">непрочитанных</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Mobile view (простой список)
  if (variant === 'mobile') {
    return (
      <div
        key={chat.id}
        className={`relative group ${isSelected ? 'bg-[var(--bg-tertiary)]' : ''}`}
        onContextMenu={(e) => onContextMenu(e, chat)}
      >
        <button
          onClick={() => onSelect(chat)}
          className="w-full px-3 py-2 hover:bg-[var(--bg-tertiary)] transition-all text-left"
        >
          <div className="flex gap-2 items-center">
            <Avatar
              src={avatarData.avatar || ''}
              name={avatarData.name}
              type={avatarData.type}
              size="md"
              isOnline={otherUser?.isOnline}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                {isPinned && !chat.isFavoritesChat && !chat.isSystemChat && !chat.isNotificationsChat && (
                  <Pin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                )}
                {chat.isGroup && (
                  <Users className="w-3 h-3 text-purple-400 flex-shrink-0" />
                )}
                <h3 className="font-medium text-sm truncate select-none">{getChatTitle(chat)}</h3>
              </div>
              {chatDrafts[chat.id] ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-red-400 truncate flex-1">
                    <span className="font-medium">Черновик:</span> {chatDrafts[chat.id]}
                  </p>
                </div>
              ) : chat.lastMessage ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-[var(--text-secondary)] truncate flex-1">
                    {chat.lastMessage.authorName}: {chat.lastMessage.content}
                  </p>
                  {hasUnread && (
                    <div className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-[#007aff]/80 to-[#007aff]/60 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,122,255,0.3)]">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            {chat.lastMessage && (
              <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap self-center">
                {new Date(chat.lastMessage.createdAt).toLocaleTimeString('ru-RU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            )}
          </div>
        </button>
      </div>
    );
  }

  // Desktop view (с градиентами)
  return (
    <div
      key={chat.id}
      className={`relative group mx-2 rounded-[50px] overflow-hidden backdrop-blur-xl transition-all duration-300 ${
        isSelected 
          ? 'bg-gradient-to-br from-[#007aff]/30 to-[#007aff]/10 border border-[#007aff]/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_3px_8px_rgba(59,130,246,0.2)]' 
          : 'bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/8 border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_2px_8px_rgba(0,0,0,0.2)]'
      }`}
      onContextMenu={(e) => onContextMenu(e, chat)}
    >
      <button
        onClick={() => onSelect(chat)}
        className="w-full px-2 py-2 transition-all text-left"
      >
        <div className="flex gap-2 items-center">
          <Avatar
            src={avatarData.avatar || ''}
            name={avatarData.name}
            type={avatarData.type}
            size="md"
            isOnline={otherUser?.isOnline}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isPinned && !chat.isFavoritesChat && !chat.isSystemChat && !chat.isNotificationsChat && (
                <Pin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
              )}
              {chat.isGroup && (
                <Users className="w-3 h-3 text-purple-400 flex-shrink-0" />
              )}
              <h3 className="font-medium text-sm truncate">{getChatTitle(chat)}</h3>
            </div>
            {chatDrafts[chat.id] ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-red-400 truncate flex-1">
                  <span className="font-medium">Черновик:</span> {chatDrafts[chat.id]}
                </p>
              </div>
            ) : chat.lastMessage ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-[var(--text-secondary)] truncate flex-1">
                  {chat.lastMessage.authorName}: {chat.lastMessage.content}
                </p>
                {hasUnread && (
                  <div className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-[#007aff]/80 to-[#007aff]/60 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,122,255,0.3)]">
                    {chat.unreadCount}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          {chat.lastMessage && (
            <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap self-center">
              {new Date(chat.lastMessage.createdAt).toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  // Оптимизация: перерендериваем только если изменились важные пропсы
  return (
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.unreadCount === nextProps.chat.unreadCount &&
    prevProps.chat.lastMessage?.id === nextProps.chat.lastMessage?.id &&
    prevProps.chat.lastMessage?.content === nextProps.chat.lastMessage?.content &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.chatDrafts[prevProps.chat.id] === nextProps.chatDrafts[nextProps.chat.id] &&
    prevProps.variant === nextProps.variant &&
    prevProps.isPinned === nextProps.isPinned
  );
});

ChatItem.displayName = 'ChatItem';

export default ChatItem;
