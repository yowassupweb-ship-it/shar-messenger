import { Search, Archive, Plus, Moon, Sun, Star, Bell, Pin, MoreVertical } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { Chat, User } from '@/components/features/messages/types';
import React, { useState } from 'react';
import { getAvatarGradient, getChatAvatarUrl, getInitials, isFavoritesChat, isNotificationsChat } from './avatarUtils';

function ChatAvatar({ src, name, chatId, isGroup }: { src?: string; name: string; chatId: string; isGroup?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const dicebearUrl = !isGroup
    ? `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
    : undefined;

  const finalSrc = src && !imgError ? src : (!imgError && dicebearUrl ? dicebearUrl : undefined);

  if (finalSrc) {
    return (
      <img
        src={finalSrc}
        alt={name}
        className="w-11 h-11 max-md:w-13 max-md:h-13 rounded-full object-cover flex-shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`w-11 h-11 max-md:w-13 max-md:h-13 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${getAvatarGradient(chatId)} text-white font-semibold text-sm max-md:text-base shadow-sm`}>
      {getInitials(name)}
    </div>
  );
}

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  searchQuery: string;
  showArchivedChats: boolean;
  onSearchQueryChange: (value: string) => void;
  onToggleArchivedChats: () => void;
  onOpenNewChat: () => void;
  onChatContextMenu: (chatId: string, position: { top: number; left: number }) => void;
  onSelectChat: (chatId: string) => void;
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

function ChatSidebar({
  chats,
  currentChatId,
  currentUser,
  users,
  isLoading,
  searchQuery,
  showArchivedChats,
  onSearchQueryChange,
  onToggleArchivedChats,
  onOpenNewChat,
  onChatContextMenu,
  onSelectChat,
}: ChatSidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const [showToolsMenu, setShowToolsMenu] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [notificationPermission, setNotificationPermission] = React.useState<'default' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });
  const toolsMenuRef = React.useRef<HTMLDivElement>(null);

  const requestNotificationPermission = React.useCallback(async () => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  React.useEffect(() => {
    if (!showToolsMenu) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(target)) {
        setShowToolsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showToolsMenu]);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    if (notificationPermission === 'default') {
      void requestNotificationPermission();
    }
  }, [notificationPermission, requestNotificationPermission]);

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const statusTitle = 'Shar';
  
  return (
    <div className="w-80 h-full min-h-0 flex flex-col bg-slate-50 dark:bg-[#0f1f3d] rounded-t-[26px] rounded-b-2xl shadow-lg overflow-hidden relative max-md:w-full max-md:rounded-none max-md:flex-1 max-md:overflow-x-hidden">
      {/* Хедер - поиск */}
      <div className="absolute top-0 left-0 right-0 z-10 px-0 pt-0 pb-2 bg-transparent border-0">
        <div className="grid grid-cols-[auto_1fr_auto] gap-1 w-full px-0">
          {/* Островок статуса */}
          <div className="h-10 max-md:h-12 mt-[2px] ml-[5px] px-5 max-md:px-6 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-[0_3px_10px_rgba(0,0,0,0.09)] dark:shadow-[0_3px_10px_rgba(0,0,0,0.45)] flex items-center justify-center min-w-[112px] max-md:min-w-[128px]">
            <div className="inline-flex items-center justify-center gap-2 text-[15px] max-md:text-[17px] leading-none font-semibold text-gray-900 dark:text-gray-100 text-center tracking-[0.01em]">
              <span className="relative -top-[1px]">{statusTitle}</span>
              <span
                className={`w-2 h-2 max-md:w-2.5 max-md:h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                aria-label={isOnline ? 'online' : 'offline'}
                title={isOnline ? 'Онлайн' : 'Оффлайн'}
              />
            </div>
          </div>

          {/* Островок поиска */}
          <div className="h-10 max-md:h-12 mt-[2px] px-3 max-md:px-4 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 shadow-[0_3px_10px_rgba(0,0,0,0.09)] dark:shadow-[0_3px_10px_rgba(0,0,0,0.45)] inline-flex items-center gap-2 min-w-0">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Поиск"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full min-w-0 py-0 bg-transparent border-0 rounded-full text-sm max-md:text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0"
            />
          </div>

          {/* Отдельная кнопка меню */}
          <div ref={toolsMenuRef} className="h-10 max-md:h-12 mt-[2px] mr-[5px] relative">
            <button
              onClick={() => setShowToolsMenu(prev => !prev)}
              className="w-10 h-10 max-md:w-12 max-md:h-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-slate-700/80 transition-colors flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.09)] dark:shadow-[0_3px_10px_rgba(0,0,0,0.45)]"
              title="Меню"
            >
              <MoreVertical className="w-4 h-4 max-md:w-5 max-md:h-5" />
            </button>

            {showToolsMenu && (
              <div className="absolute right-0 top-12 min-w-[220px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl p-1.5 shadow-2xl z-30">
                <button
                  onClick={() => {
                    toggleTheme();
                    setShowToolsMenu(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
                </button>
                <button
                  onClick={() => {
                    onToggleArchivedChats();
                    setShowToolsMenu(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  {showArchivedChats ? 'Показать активные чаты' : 'Показать архив'}
                </button>
                <button
                  onClick={() => {
                    onOpenNewChat();
                    setShowToolsMenu(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Новый чат
                </button>
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={() => {
                      void requestNotificationPermission();
                      setShowToolsMenu(false);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Разрешить уведомления
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-[#0f1f3d] scrollbar-hide pt-[50px] max-md:pt-[58px] pb-[calc(env(safe-area-inset-bottom)+124px)] md:pb-[96px]">
        {chats.length === 0 ? (
          isLoading ? (
            <div className="space-y-0">
              {/* Скелетоны загрузки чатов */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 max-md:gap-3.5 p-3 max-md:p-4 animate-pulse">
                  {/* Аватар скелетон */}
                  <div className="w-12 h-12 max-md:w-14 max-md:h-14 rounded-full bg-gray-300/50 dark:bg-slate-600/50 flex-shrink-0" />

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
            <div className="h-full w-full flex items-center justify-center px-6">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  {showArchivedChats ? 'Архив пуст' : 'Чаты не найдены'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {showArchivedChats ? 'Переместите чат в архив, и он появится здесь' : 'Попробуйте изменить поиск'}
                </div>
              </div>
            </div>
          )
        ) : (
          chats.map(chat => {
            const displayTitle = (chat as any).displayTitle || chat.title || 'Чат';
            const isActive = currentChatId === chat.id;
            const pinMap = (chat as any).pinnedByUser || (chat as any).pinned_by_user || {};
            const isPinned = currentUser
              ? (pinMap[String(currentUser.id)] === true || String(pinMap[String(currentUser.id)]).toLowerCase() === 'true')
              : false;
            const avatarUrl = getChatAvatarUrl(chat, currentUser, users);
            const unreadIncomingRaw =
              (chat as any).incomingUnreadCount ??
              (chat as any).incoming_unread_count ??
              (chat as any).unreadCount ??
              (chat as any).unread_count ??
              0;
            const unreadIncoming = Number(unreadIncomingRaw) || 0;
            
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
                  w-full px-3 py-2.5 max-md:px-4 max-md:py-3.5 text-left border-b border-gray-100 dark:border-gray-700/60
                  active:bg-gray-100 dark:active:bg-slate-700 transition-colors duration-100 cursor-pointer select-none
                  ${isActive ? 'bg-blue-50 dark:bg-slate-700' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}
                `}
              >
                <div className="flex items-center gap-3 max-md:gap-3.5 min-w-0">
                  {/* Avatar */}
                  {isFavoritesChat(chat) ? (
                    <div className="w-11 h-11 max-md:w-13 max-md:h-13 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-sm">
                      <Star className="w-5 h-5 max-md:w-6 max-md:h-6" fill="currentColor" strokeWidth={0} />
                    </div>
                  ) : isNotificationsChat(chat) ? (
                    <div className="w-11 h-11 max-md:w-13 max-md:h-13 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-sm">
                      <Bell className="w-5 h-5 max-md:w-6 max-md:h-6" />
                    </div>
                  ) : (
                    <ChatAvatar
                      src={avatarUrl}
                      name={displayTitle}
                      chatId={chat.id}
                      isGroup={chat.isGroup}
                    />
                  )}
                  
                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-[15px] leading-[18px] max-md:text-[17px] max-md:leading-[22px] min-w-0">
                        {displayTitle}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isPinned && (
                          <Pin className="w-3 h-3 text-blue-400" />
                        )}
                        {timeDisplay && (
                          <span className="text-[12px] max-md:text-[13px] text-gray-400 dark:text-gray-500 leading-[18px] max-md:leading-[20px]">
                            {timeDisplay}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[13px] max-md:text-[15px] truncate leading-[16px] max-md:leading-[20px] min-w-0 ${
                        draft 
                          ? 'text-red-500 dark:text-red-400 italic' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {lastMessage}
                      </p>
                      {unreadIncoming > 0 && (
                        <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 max-md:min-w-[24px] max-md:h-6 max-md:px-2 rounded-full bg-blue-500 text-white text-[11px] max-md:text-[12px] font-semibold flex items-center justify-center">
                          {unreadIncoming}
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

export default React.memo(ChatSidebar);
