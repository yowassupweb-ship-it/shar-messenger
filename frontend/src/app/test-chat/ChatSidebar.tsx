import { Search, Archive, Plus, Moon, Sun, Star, Bell, Pin } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { Chat, User } from '@/components/features/messages/types';
import { useState } from 'react';

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  currentUser: User | null;
  searchQuery: string;
  showArchivedChats: boolean;
  onSearchQueryChange: (value: string) => void;
  onToggleArchivedChats: () => void;
  onOpenNewChat: () => void;
  onChatContextMenu: (chatId: string, position: { top: number; left: number }) => void;
  onSelectChat: (chatId: string) => void;
}

// Функция для получения первой буквы имени для аватара
function getInitials(title: string): string {
  const words = title.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0][0]?.toUpperCase() || '?';
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Градиенты аватаров как в Signal
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

function getAvatarColor(chatId: string): string {
  const hash = chatId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// Функция для получения черновика из localStorage
function getDraft(chatId: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(`draft_${chatId}`) || '';
  } catch {
    return '';
  }
}

export default function ChatSidebar({
  chats,
  currentChatId,
  currentUser,
  searchQuery,
  showArchivedChats,
  onSearchQueryChange,
  onToggleArchivedChats,
  onOpenNewChat,
  onChatContextMenu,
  onSelectChat,
}: ChatSidebarProps) {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="w-80 h-full min-h-0 flex flex-col bg-transparent rounded-t-[26px] rounded-b-2xl shadow-lg overflow-hidden relative max-md:w-full max-md:rounded-none max-md:flex-1 max-md:overflow-x-hidden">
      {/* Хедер - поиск */}
      <div className="absolute top-0 left-0 right-0 z-10 px-0 pt-0 pb-2 bg-transparent border-0">
        <div className="flex items-center gap-1 w-full px-0">
          {/* Островок поиска */}
          <div className="h-10 mt-[2px] ml-[5px] px-3 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-[0_3px_10px_rgba(0,0,0,0.09)] dark:shadow-[0_3px_10px_rgba(0,0,0,0.45)] inline-flex items-center gap-2 flex-1 min-w-0">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Поиск"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full min-w-0 py-0 bg-transparent border-0 rounded-full text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0"
            />
          </div>
          
          {/* Островок кнопок */}
          <div className="h-10 mt-[2px] mr-[5px] px-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-[0_3px_10px_rgba(0,0,0,0.09)] dark:shadow-[0_3px_10px_rgba(0,0,0,0.45)] flex items-center gap-1.5 flex-shrink-0 ml-auto">
            <button
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
              title={theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="w-[14px] h-[14px]" /> : <Moon className="w-[14px] h-[14px]" />}
            </button>
            <button
              onClick={onToggleArchivedChats}
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
              title={showArchivedChats ? 'Показать активные чаты' : 'Показать архив'}
            >
              <Archive className={`w-[14px] h-[14px] ${showArchivedChats ? 'text-blue-500 dark:text-blue-400' : ''}`} />
            </button>
            <button
              onClick={onOpenNewChat}
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
              title="Новый чат"
            >
              <Plus className="w-[14px] h-[14px]" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-transparent scrollbar-hide pt-[50px] max-md:pt-[50px] pb-8 md:pb-[96px]">
        {chats.length === 0 ? (
          <div className="space-y-0">
            {/* Скелетоны загрузки чатов */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                {/* Аватар скелетон */}
                <div className="w-12 h-12 rounded-full bg-gray-300/50 dark:bg-slate-600/50 flex-shrink-0" />
                
                {/* Контент скелетон */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    {/* Имя */}
                    <div className="h-3.5 bg-gray-300/50 dark:bg-slate-600/50 rounded w-1/3" />
                    {/* Время */}
                    <div className="h-3 bg-gray-300/50 dark:bg-slate-600/50 rounded w-10" />
                  </div>
                  {/* Последнее сообщение */}
                  <div className="h-3 bg-gray-300/50 dark:bg-slate-600/50 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          chats.map(chat => {
            const displayTitle = (chat as any).displayTitle || chat.title || 'Чат';
            const isActive = currentChatId === chat.id;
            const isPinned = currentUser && (chat as any).pinned_by_user?.[currentUser.id];
            
            // Черновик показываем только если это НЕ активный чат
            const draft = isActive ? '' : getDraft(chat.id);
            const lastMessage = draft 
              ? `Черновик: ${draft}` 
              : ((chat as any).lastMessageContent || 'Нет сообщений');
            const timestamp = (chat as any).lastMessageTimestamp;
            
            // Форматирование времени: точное время всегда, год только если не текущий
            let timeDisplay = '';
            if (timestamp) {
              const msgDate = new Date(timestamp);
              const today = new Date();
              const isToday = msgDate.toDateString() === today.toDateString();
              const currentYear = today.getFullYear();
              const msgYear = msgDate.getFullYear();
              
              if (isToday) {
                timeDisplay = msgDate.toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
              } else if (msgYear === currentYear) {
                timeDisplay = msgDate.toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit'
                });
              } else {
                timeDisplay = msgDate.toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });
              }
            }
            
            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onChatContextMenu(chat.id, { top: e.clientY, left: e.clientX });
                }}
                className={`
                  w-full px-3 py-2.5 text-left border-b border-gray-100 dark:border-gray-700/60
                  active:bg-gray-100 dark:active:bg-slate-700 transition-colors duration-100 cursor-pointer select-none
                  ${isActive ? 'bg-blue-50 dark:bg-slate-700' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  {(chat.isFavoritesChat || String(chat.id).startsWith('favorites_')) ? (
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-sm">
                      <Star className="w-5 h-5" fill="currentColor" strokeWidth={0} />
                    </div>
                  ) : (chat.isNotificationsChat || String(chat.id).startsWith('notifications-') || String(chat.id).startsWith('notifications_')) ? (
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-sm">
                      <Bell className="w-5 h-5" />
                    </div>
                  ) : (
                    <div 
                      className={`
                        w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0
                        bg-gradient-to-br ${getAvatarColor(chat.id)} text-white font-semibold text-sm
                        shadow-sm
                      `}
                    >
                      {getInitials(displayTitle)}
                    </div>
                  )}
                  
                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-[15px] leading-[18px] min-w-0">
                        {displayTitle}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isPinned && (
                          <Pin className="w-3 h-3 text-blue-400" />
                        )}
                        {timeDisplay && (
                          <span className="text-[12px] text-gray-400 dark:text-gray-500 leading-[18px]">
                            {timeDisplay}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[13px] truncate leading-[16px] min-w-0 ${
                        draft 
                          ? 'text-red-500 dark:text-red-400 italic' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {lastMessage}
                      </p>
                      {!!(chat as any).incomingUnreadCount && (chat as any).incomingUnreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-[11px] font-semibold flex items-center justify-center">
                          {(chat as any).incomingUnreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
