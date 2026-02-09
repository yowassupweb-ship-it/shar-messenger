import React from 'react';
import { X, Users, Search, Plus } from 'lucide-react';
import Avatar from '@/components/common/data-display/Avatar';
import type { User, Chat } from './types';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddParticipant: (userId: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  users: User[];
  currentUser: User | null;
  selectedChat: Chat | null;
}

export default function AddParticipantModal({
  isOpen,
  onClose,
  onAddParticipant,
  searchQuery,
  setSearchQuery,
  users,
  currentUser,
  selectedChat,
}: AddParticipantModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setSearchQuery('');
  };

  const availableUsers = users.filter(u => {
    // Исключаем уже добавленных в группу
    if (selectedChat?.participantIds?.includes(u.id)) return false;
    // Исключаем самого себя
    if (u.id === currentUser?.id) return false;
    // Фильтруем по поиску
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] flex-shrink-0">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Добавить участника
          </h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {/* Search users */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Поиск пользователей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-[25px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-light)]"
            />
          </div>

          {/* Users list */}
          <div className="space-y-2">
            {availableUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
                <Users className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Нет доступных пользователей</p>
              </div>
            ) : (
              availableUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => onAddParticipant(user.id)}
                  className="w-full flex items-center gap-3 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                >
                  <Avatar
                    src={user.avatar}
                    name={user.name || user.username || 'Пользователь'}
                    size="sm"
                    type="user"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {user.name || user.username || 'Без имени'}
                    </p>
                    {user.email && (
                      <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
                    )}
                  </div>
                  <Plus className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-[var(--border-color)] flex-shrink-0">
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
