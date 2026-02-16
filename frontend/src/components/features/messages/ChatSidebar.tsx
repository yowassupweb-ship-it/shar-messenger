import React, { useEffect, useState } from 'react';
import { Search, Plus, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import ChatItem from './ChatItem';
import { Chat, User } from './types';

interface ChatSidebarProps {
  selectedChat: Chat | null;
  isChatListCollapsed: boolean;
  setIsChatListCollapsed: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  setShowNewChatModal: (value: boolean) => void;
  isLoadingChats: boolean;
  chats: Chat[];
  pinnedChats: Chat[];
  unpinnedChats: Chat[];
  hoveredChatId: string | null;
  selectChat: (chat: Chat) => void;
  setHoveredChatId: (id: string | null) => void;
  setContextMenuChat: (chat: Chat) => void;
  setChatContextMenuPosition: (pos: { top: number; left: number }) => void;
  setShowChatContextMenu: (show: boolean) => void;
  getChatTitle: (chat: Chat) => string;
  getChatAvatarData: (chat: Chat) => { avatar: string | undefined; name: string; type: 'user' | 'group' | 'favorites' | 'notifications' | 'system' };
  currentUser: User | null;
  users: User[];
  chatDrafts: Record<string, string>;
  ChatListSkeleton: React.ComponentType;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  selectedChat,
  isChatListCollapsed,
  setIsChatListCollapsed,
  searchQuery,
  setSearchQuery,
  setShowNewChatModal,
  isLoadingChats,
  chats,
  pinnedChats,
  unpinnedChats,
  hoveredChatId,
  selectChat,
  setHoveredChatId,
  setContextMenuChat,
  setChatContextMenuPosition,
  setShowChatContextMenu,
  getChatTitle,
  getChatAvatarData,
  currentUser,
  users,
  chatDrafts,
  ChatListSkeleton,
}) => {
  const [isMobileView, setIsMobileView] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 785 || window.matchMedia('(pointer: coarse)').matches : false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateMobileView = () => {
      setIsMobileView(window.innerWidth <= 785 || window.matchMedia('(pointer: coarse)').matches);
    };

    updateMobileView();
    window.addEventListener('resize', updateMobileView);
    return () => {
      window.removeEventListener('resize', updateMobileView);
    };
  }, []);

  const isCollapsed = isChatListCollapsed && !isMobileView;

  return (
    <div className={`
      ${selectedChat && isMobileView ? 'hidden' : 'flex'} 
      ${isCollapsed ? 'w-[72px] min-w-[72px]' : isMobileView ? 'w-full' : 'w-full min-[786px]:w-80 min-[786px]:min-w-80'} 
      border-r border-[var(--border-color)] flex-col h-full min-h-0 transition-all duration-200 bg-[var(--bg-secondary)] flex-shrink-0 max-w-full overflow-x-hidden
    `}
      onCopy={(e) => e.preventDefault()}
    >
      {/* Search / New Chat Button */}
      {isCollapsed ? (
        <>
          {/* Свёрнутый режим: только компактные кнопки */}
          <div className="py-2 flex flex-col items-center gap-2 border-b border-[var(--border-color)]">
            <button
              onClick={() => setIsChatListCollapsed(false)}
              className="w-10 h-10 rounded-full bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] flex items-center justify-center transition-all border border-[var(--border-glass)]"
              title="Развернуть список"
            >
              <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-all"
              title="Новый чат"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </>
      ) : (
        <div className="px-2 py-1.5 lg:p-3 flex-shrink-0 flex items-center gap-2">
          <div className="relative flex-1 lg:flex-none">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-primary)] flex items-center justify-center z-10 pointer-events-none">
              <Search className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full lg:w-[200px] h-10 pl-10 pr-3 bg-gradient-to-br from-white/15 to-white/5 border border-white/20 rounded-[20px] text-sm focus:outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-white/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] backdrop-blur-sm"
            />
          </div>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 flex items-center justify-center transition-all border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-sm"
            title="Новый чат"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsChatListCollapsed(true)}
            className="hidden min-[786px]:flex flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 items-center justify-center transition-all border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-sm"
            title="Свернуть список"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Chats list */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-20 min-[786px]:pb-20">
        {isLoadingChats ? (
          /* 🚀 PERFORMANCE: Skeleton loader для LCP оптимизации */
          <ChatListSkeleton />
        ) : chats.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full text-[var(--text-muted)] ${isCollapsed ? 'min-[786px]:px-1 px-4' : 'px-4'} py-8`}>
            <MessageCircle className={`${isCollapsed ? 'min-[786px]:w-8 min-[786px]:h-8 w-12 h-12' : 'w-12 h-12'} mb-3 opacity-50`} />
            {isCollapsed ? (
              <div className="lg:hidden">
                <p className="text-sm text-center">Нет чатов</p>
                <p className="text-xs mt-1 text-center">Создайте новый чат чтобы начать общение</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-center">Нет чатов</p>
                <p className="text-xs mt-1 text-center">Создайте новый чат чтобы начать общение</p>
              </>
            )}
          </div>
        ) : isCollapsed ? (
          <>
            {/* Свернутый список - только аватарки */}
            <div className="py-2 space-y-1">
              {[...pinnedChats, ...unpinnedChats].map(chat => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isSelected={selectedChat?.id === chat.id}
                  isHovered={hoveredChatId === chat.id}
                  onSelect={selectChat}
                  onHover={setHoveredChatId}
                  onContextMenu={(e, chat) => {
                    e.preventDefault();
                    setContextMenuChat(chat);
                    setChatContextMenuPosition({ top: e.clientY, left: e.clientX });
                    setShowChatContextMenu(true);
                  }}
                  getChatTitle={getChatTitle}
                  getChatAvatarData={getChatAvatarData}
                  currentUser={currentUser}
                  users={users}
                  chatDrafts={chatDrafts}
                  variant="collapsed-icon"
                  isPinned={chat.pinnedByUser?.[currentUser?.id || '']}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Mobile */}
            <div className={isMobileView ? 'block' : 'hidden'}>
              {pinnedChats.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider select-none">
                    Закрепленные
                  </div>
                  <div className="divide-y divide-[var(--border-color)]">
                    {pinnedChats.map(chat => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isSelected={selectedChat?.id === chat.id}
                        onSelect={selectChat}
                        onContextMenu={(e, chat) => {
                          e.preventDefault();
                          setContextMenuChat(chat);
                          setChatContextMenuPosition({ top: e.clientY, left: e.clientX });
                          setShowChatContextMenu(true);
                        }}
                        getChatTitle={getChatTitle}
                        getChatAvatarData={getChatAvatarData}
                        currentUser={currentUser}
                        users={users}
                        chatDrafts={chatDrafts}
                        variant="mobile"
                        isPinned={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {unpinnedChats.length > 0 && (
                <div>
                  {pinnedChats.length > 0 && (
                    <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">
                      Все чаты
                    </div>
                  )}
                  <div className="divide-y divide-[var(--border-color)]">
                    {unpinnedChats.map(chat => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isSelected={selectedChat?.id === chat.id}
                        onSelect={selectChat}
                        onContextMenu={(e, chat) => {
                          e.preventDefault();
                          setContextMenuChat(chat);
                          setChatContextMenuPosition({ top: e.clientY, left: e.clientX });
                          setShowChatContextMenu(true);
                        }}
                        getChatTitle={getChatTitle}
                        getChatAvatarData={getChatAvatarData}
                        currentUser={currentUser}
                        users={users}
                        chatDrafts={chatDrafts}
                        variant="mobile"
                        isPinned={false}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop */}
            <div className={isMobileView ? 'hidden' : 'block'}>
              {pinnedChats.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider select-none">
                    Закрепленные
                  </div>
                  <div className="divide-y divide-[var(--border-color)]">
                    {pinnedChats.map(chat => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isSelected={selectedChat?.id === chat.id}
                        onSelect={selectChat}
                        onContextMenu={(e, chat) => {
                          e.preventDefault();
                          setContextMenuChat(chat);
                          setChatContextMenuPosition({ top: e.clientY, left: e.clientX });
                          setShowChatContextMenu(true);
                        }}
                        getChatTitle={getChatTitle}
                        getChatAvatarData={getChatAvatarData}
                        currentUser={currentUser}
                        users={users}
                        chatDrafts={chatDrafts}
                        variant="mobile"
                        isPinned={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {unpinnedChats.length > 0 && (
                <div>
                  {pinnedChats.length > 0 && (
                    <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">
                      Все чаты
                    </div>
                  )}
                  <div className="divide-y divide-[var(--border-color)]">
                    {unpinnedChats.map(chat => (
                      <ChatItem
                        key={chat.id}
                        chat={chat}
                        isSelected={selectedChat?.id === chat.id}
                        onSelect={selectChat}
                        onContextMenu={(e, chat) => {
                          e.preventDefault();
                          setContextMenuChat(chat);
                          setChatContextMenuPosition({ top: e.clientY, left: e.clientX });
                          setShowChatContextMenu(true);
                        }}
                        getChatTitle={getChatTitle}
                        getChatAvatarData={getChatAvatarData}
                        currentUser={currentUser}
                        users={users}
                        chatDrafts={chatDrafts}
                        variant="mobile"
                        isPinned={false}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
