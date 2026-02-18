import React from 'react';
import { X, Check } from 'lucide-react';
import Avatar from '@/components/common/data-display/Avatar';
import type { Message, Chat, User } from './types';
import { getChatTitle, getChatAvatarData } from './utils';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForward: () => void;
  message: Message | null;
  selectedMessages: Set<string>;
  isSelectionMode: boolean;
  messages: Message[];
  chats: Chat[];
  currentUser: User | null;
  users: User[];
  selectedChat: Chat | null;
  selectedChatsForForward: string[];
  setSelectedChatsForForward: (chats: string[] | ((prev: string[]) => string[])) => void;
}

export default function ForwardModal({
  isOpen,
  onClose,
  onForward,
  message,
  selectedMessages,
  isSelectionMode,
  messages,
  chats,
  currentUser,
  users,
  selectedChat,
  selectedChatsForForward,
  setSelectedChatsForForward,
}: ForwardModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setSelectedChatsForForward([]);
  };

  const firstMessage = isSelectionMode && selectedMessages.size > 0
    ? messages.find(m => selectedMessages.has(m.id))
    : message;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Переслать {isSelectionMode && selectedMessages.size > 0 
              ? `${selectedMessages.size} сообщени${selectedMessages.size === 1 ? 'е' : selectedMessages.size < 5 ? 'я' : 'й'}` 
              : 'сообщение'}
          </h3>
          <button
            onClick={handleClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          {/* Превью первого сообщения */}
          {firstMessage && (
            <div className="mb-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
              <p className="text-xs text-[var(--text-muted)] mb-1">
                {isSelectionMode && selectedMessages.size > 1 
                  ? `Первое из ${selectedMessages.size} сообщений:`
                  : 'Сообщение:'}
              </p>
              <p className="text-sm text-[var(--text-primary)] line-clamp-3">{firstMessage.content}</p>
            </div>
          )}
          
          <p className="text-sm text-[var(--text-secondary)] mb-3">Выберите чаты:</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {chats
              .filter(chat => {
                if (chat.isNotificationsChat) return false;
                if (message && selectedChat) return chat.id !== selectedChat.id;
                if (isSelectionMode && selectedChat) return chat.id !== selectedChat.id;
                return true;
              })
              .sort((a, b) => {
                if (a.isFavoritesChat) return -1;
                if (b.isFavoritesChat) return 1;
                return 0;
              })
              .map(chat => {
                const avatarData = getChatAvatarData(chat, currentUser, users);
                return (
                  <button
                    key={chat.id}
                    onClick={() => {
                      setSelectedChatsForForward(prev => 
                        prev.includes(chat.id) 
                          ? prev.filter(id => id !== chat.id)
                          : [...prev, chat.id]
                      );
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedChatsForForward.includes(chat.id)
                        ? 'bg-cyan-500/20 border border-cyan-500/30'
                        : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)]'
                    }`}
                  >
                    <Avatar
                      src={avatarData.avatar}
                      name={avatarData.name}
                      type={avatarData.type}
                      size="lg"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {getChatTitle(chat, currentUser, users)}
                      </p>
                    </div>
                    {selectedChatsForForward.includes(chat.id) && (
                      <Check className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
          </div>
        </div>
        
        <div className="flex gap-2 p-4 border-t border-[var(--border-color)]">
          <button
            onClick={handleClose}
            className="flex-1 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:bg-[var(--bg-primary)]"
          >
            Отмена
          </button>
          <button
            onClick={onForward}
            disabled={selectedChatsForForward.length === 0}
            className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] rounded-lg text-sm text-white disabled:cursor-not-allowed"
          >
            Переслать
          </button>
        </div>
      </div>
    </div>
  );
}
