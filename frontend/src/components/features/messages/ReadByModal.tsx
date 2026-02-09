import React from 'react';
import { X, Check } from 'lucide-react';
import Avatar from '@/components/common/data-display/Avatar';
import type { Message, Chat, User } from './types';

interface ReadByModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  chat: Chat | null;
  users: User[];
}

export default function ReadByModal({
  isOpen,
  onClose,
  message,
  chat,
  users,
}: ReadByModalProps) {
  if (!isOpen || !message || !chat) return null;

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="font-semibold">Информация о прочтении</h3>
          <button
            onClick={handleClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {chat.participantIds
              .filter(id => id !== (message.authorId || 'system'))
              .filter(participantId => {
                const lastReadTime = chat.readMessagesByUser?.[participantId];
                return lastReadTime && new Date(lastReadTime) >= new Date(message.createdAt);
              })
              .map(participantId => {
                const participant = users.find(u => u.id === participantId);
                const lastReadTime = chat.readMessagesByUser?.[participantId];
                const hasRead = lastReadTime && new Date(lastReadTime) >= new Date(message.createdAt);
                
                return (
                  <div key={participantId} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-tertiary)]">
                    <Avatar
                      src={participant?.avatar}
                      name={participant?.name || participant?.username || 'Пользователь'}
                      size="lg"
                      type="user"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)] truncate">
                        {participant?.name || participant?.username || 'Пользователь'}
                      </p>
                      {hasRead ? (
                        <p className="text-xs text-cyan-400">
                          Прочитано {new Date(lastReadTime!).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--text-muted)]">Не прочитано</p>
                      )}
                    </div>
                    {hasRead ? (
                      <Check className="w-5 h-5 text-cyan-400" />
                    ) : (
                      <Check className="w-5 h-5 text-[var(--text-muted)]" />
                    )}
                  </div>
                );
              })}
          </div>
        </div>
        
        <div className="flex gap-2 p-4 border-t border-[var(--border-color)]">
          <button
            onClick={handleClose}
            className="flex-1 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:bg-[var(--bg-primary)]"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
