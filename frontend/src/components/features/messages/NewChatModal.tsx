import React from 'react';
import { X, Search } from 'lucide-react';
import Avatar from '@/components/common/data-display/Avatar';
import type { User } from './types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat: () => void;
  isGroupChat: boolean;
  setIsGroupChat: (value: boolean) => void;
  groupTitle: string;
  setGroupTitle: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedUsers: string[];
  setSelectedUsers: (users: string[]) => void;
  filteredUsers: User[];
}

export default function NewChatModal({
  isOpen,
  onClose,
  onCreateChat,
  isGroupChat,
  setIsGroupChat,
  groupTitle,
  setGroupTitle,
  searchQuery,
  setSearchQuery,
  selectedUsers,
  setSelectedUsers,
  filteredUsers,
}: NewChatModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setSelectedUsers([]);
    setIsGroupChat(false);
    setGroupTitle('');
  };

  return (
    <div className="fixed !inset-0 !p-0 !m-0 bg-black/50 backdrop-blur-sm z-[100] !overflow-hidden md:flex md:items-center md:justify-center md:p-4">
      <div className="!w-full !h-full md:relative md:inset-auto bg-gradient-to-br from-white/96 to-white/88 dark:from-white/15 dark:to-white/5 backdrop-blur-xl md:border md:border-gray-200/80 dark:md:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_10px_32px_rgba(0,0,0,0.22)] rounded-none md:rounded-[24px] md:w-full md:max-w-md md:h-auto md:max-h-[80vh] md:min-h-0 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200/80 dark:border-white/10 shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">Новый чат</h3>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-white" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {/* Group chat toggle */}
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={isGroupChat}
              onChange={(e) => setIsGroupChat(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--bg-tertiary)]"
            />
            <span className="text-sm text-gray-800 dark:text-white">Групповой чат</span>
          </label>

          {/* Group title */}
          {isGroupChat && (
            <input
              type="text"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder="Название группы"
              className="w-full px-4 py-2.5 mb-4 bg-white/75 dark:bg-white/5 border border-gray-200/80 dark:border-white/20 rounded-[20px] text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/50 focus:outline-none focus:border-gray-300 dark:focus:border-white/40 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]"
            />
          )}

          {/* Search users */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-white/60" />
            <input
              type="text"
              placeholder="Поиск пользователей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white/75 dark:bg-white/5 border border-gray-200/80 dark:border-white/20 rounded-[25px] text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/50 focus:outline-none focus:border-gray-300 dark:focus:border-white/40 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]"
            />
          </div>

          {/* Users list */}
          <div className="space-y-2">
            {filteredUsers.map(user => (
              <label
                key={user.id}
                className="flex items-center gap-3 p-3 bg-white/70 dark:bg-white/5 rounded-[20px] border border-gray-200/80 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10 cursor-pointer transition-all backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]"
              >
                <input
                  type={isGroupChat ? 'checkbox' : 'radio'}
                  name="selectedUser"
                  checked={selectedUsers.includes(user.id)}
                  onChange={(e) => {
                    if (isGroupChat) {
                      setSelectedUsers(
                        e.target.checked
                          ? [...selectedUsers, user.id]
                          : selectedUsers.filter(id => id !== user.id)
                      );
                    } else {
                      setSelectedUsers([user.id]);
                    }
                  }}
                  className="w-4 h-4"
                />
                <Avatar
                  src={user.avatar}
                  name={user.name || user.username || 'Пользователь'}
                  size="sm"
                  type="user"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name || user.username || 'Без имени'}</p>
                  {user.email && (
                    <p className="text-xs text-gray-600 dark:text-white/60">{user.email}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-200/80 dark:border-white/10">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 bg-white/75 dark:bg-white/5 rounded-[20px] text-sm text-gray-800 dark:text-white hover:bg-white dark:hover:bg-white/10 transition-all border border-gray-200/80 dark:border-white/10"
          >
            Отмена
          </button>
          <button
            onClick={onCreateChat}
            disabled={selectedUsers.length === 0 || (isGroupChat && !groupTitle.trim())}
            className="flex-1 py-2.5 bg-[#007aff]/20 text-gray-900 dark:text-white rounded-[20px] text-sm font-medium border border-[#007aff]/30 hover:bg-[#007aff]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Создать чат
          </button>
        </div>
      </div>
    </div>
  );
}
