import { X, Search, Users, MessageSquare } from 'lucide-react';
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

  const initialsFromUser = (user: User): string => {
    const title = user.name || user.username || user.email || '?';
    const words = title.trim().split(/\s+/);
    if (words.length === 1) return (words[0][0] || '?').toUpperCase();
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  };

  const handleClose = () => {
    onClose();
    setSelectedUsers([]);
    setIsGroupChat(false);
    setGroupTitle('');
    setSearchQuery('');
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-[2px] flex items-end md:items-center justify-center">
      <div className="w-full md:max-w-[560px] h-[86vh] md:h-[78vh] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 bg-gray-50/90 dark:bg-slate-800/80">
          <div className="flex items-center gap-2">
            {isGroupChat ? <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" /> : <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Новый чат</h3>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200/70 dark:hover:bg-slate-700 flex items-center justify-center"
            title="Закрыть"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="p-4 space-y-3 border-b border-gray-200 dark:border-slate-700">
          <label className="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
            <input
              type="checkbox"
              checked={isGroupChat}
              onChange={(e) => {
                setIsGroupChat(e.target.checked);
                if (!e.target.checked) {
                  setGroupTitle('');
                }
              }}
              className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            />
            Групповой чат
          </label>

          {isGroupChat && (
            <input
              type="text"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder="Название группы"
              className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-400"
            />
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск участников"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredUsers.map(user => {
            const selected = selectedUsers.includes(user.id);
            const label = user.name || user.username || user.email || 'Без имени';
            return (
              <label
                key={user.id}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                  selected
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500/60'
                    : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type={isGroupChat ? 'checkbox' : 'radio'}
                  name="chatUser"
                  checked={selected}
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-[11px] font-semibold flex items-center justify-center">
                  {initialsFromUser(user)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-gray-900 dark:text-gray-100 truncate">{label}</div>
                  {user.email && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</div>}
                </div>
              </label>
            );
          })}
          {!filteredUsers.length && (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Никого не найдено</div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50/90 dark:bg-slate-800/80 flex items-center gap-2">
          <button
            onClick={handleClose}
            className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Отмена
          </button>
          <button
            onClick={onCreateChat}
            disabled={selectedUsers.length === 0 || (isGroupChat && !groupTitle.trim())}
            className="flex-1 h-10 rounded-xl border border-blue-400/40 bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Создать чат
          </button>
        </div>
      </div>
    </div>
  );
}
