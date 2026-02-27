import React, { useEffect, useMemo, useState } from 'react';
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
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 773 || window.matchMedia('(pointer: coarse)').matches;
  });
  const [showAllChats, setShowAllChats] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateMobileView = () => {
      setIsMobileView(window.innerWidth < 773 || window.matchMedia('(pointer: coarse)').matches);
    };

    updateMobileView();
    window.addEventListener('resize', updateMobileView);
    return () => {
      window.removeEventListener('resize', updateMobileView);
    };
  }, []);

  const isCollapsed = isChatListCollapsed && !isMobileView;
  const visiblePinnedChats = pinnedChats;
  const visibleUnpinnedChats = unpinnedChats;
  const initialRenderBudget = 10;
  const shouldLimitInitialRender = !searchQuery.trim() && !isCollapsed;
  const renderedChats = useMemo(() => {
    if (!shouldLimitInitialRender || showAllChats) {
      return {
        pinned: visiblePinnedChats,
        unpinned: visibleUnpinnedChats,
      };
    }

    const pinnedCount = Math.min(visiblePinnedChats.length, initialRenderBudget);
    const pinnedInitial = visiblePinnedChats.slice(0, pinnedCount);
    const unpinnedInitial = visibleUnpinnedChats.slice(0, Math.max(0, initialRenderBudget - pinnedInitial.length));

    return {
      pinned: pinnedInitial,
      unpinned: unpinnedInitial,
    };
  }, [shouldLimitInitialRender, showAllChats, visiblePinnedChats, visibleUnpinnedChats]);

  useEffect(() => {
    if (!shouldLimitInitialRender) {
      setShowAllChats(true);
      return;
    }

    setShowAllChats(false);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;
    const revealAll = () => setShowAllChats(true);

    if (typeof window !== 'undefined' && typeof (window as any).requestIdleCallback === 'function') {
      idleId = (window as any).requestIdleCallback(revealAll, { timeout: 180 });
    }

    timeoutId = setTimeout(revealAll, 90);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (idleId !== null && typeof window !== 'undefined' && typeof (window as any).cancelIdleCallback === 'function') {
        (window as any).cancelIdleCallback(idleId);
      }
    };
  }, [shouldLimitInitialRender, chats.length]);
  const glassRoundButtonClass = 'flex-shrink-0 flex items-center justify-center w-[34px] h-[34px] rounded-full bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-light)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] transition-all shadow-[var(--shadow-card)]';
  const glassRoundButtonSmallClass = 'flex-shrink-0 flex items-center justify-center w-[32px] h-[32px] rounded-full bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-light)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] transition-all shadow-[var(--shadow-card)]';
  const glassSearchPillClass = 'w-full h-[37px] pl-10 pr-3 bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] rounded-full text-sm focus:outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-primary)] shadow-[var(--shadow-card)] backdrop-blur-xl';

  return (
    <div className={`
      ${selectedChat && isMobileView ? 'hidden' : 'flex'} 
      ${isCollapsed ? 'w-[84px] min-w-[84px]' : isMobileView ? 'w-full' : 'w-full md:w-80 md:min-w-80'} 
      border-r border-[var(--border-color)] flex-col h-full min-h-0 transition-all duration-200 bg-[var(--bg-secondary)] flex-shrink-0 max-w-full overflow-x-hidden relative
    `}
      onCopy={(e) => e.preventDefault()}
    >
      {/* Search / New Chat Button */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-transparent">
        {isCollapsed ? (
          <>
            {/* Свёрнутый режим: только компактные кнопки */}
            <div className="h-[56px] md:h-[58px] px-1.5 flex items-center justify-between gap-1.5">
              <button
                onClick={() => setIsChatListCollapsed(false)}
                className={`${glassRoundButtonSmallClass}`}
                title="Развернуть список"
              >
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
              <button
                onClick={() => setShowNewChatModal(true)}
                className={`${glassRoundButtonSmallClass}`}
                title="Новый чат"
              >
                <Plus className="w-4 h-4 text-[var(--text-primary)]" />
              </button>
            </div>
          </>
        ) : (
          <div className="h-[56px] md:h-[58px] px-2 flex items-center gap-2 bg-transparent">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-primary)] flex items-center justify-center z-10 pointer-events-none">
                <Search className="w-[18px] h-[18px]" strokeWidth={2.6} />
              </div>
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={glassSearchPillClass}
              />
            </div>
            <button
              onClick={() => setShowNewChatModal(true)}
              className={glassRoundButtonSmallClass}
              title="Новый чат"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsChatListCollapsed(true)}
              className={`hidden md:flex ${glassRoundButtonSmallClass}`}
              title="Свернуть список"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Chats list */}
      <div className="flex-1 min-h-0 overflow-y-auto pt-[56px] md:pt-[58px] pb-20 bg-transparent">
        {isLoadingChats ? (
          /* 🚀 PERFORMANCE: Skeleton loader для LCP оптимизации */
          <ChatListSkeleton />
        ) : chats.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full text-[var(--text-muted)] ${isCollapsed ? 'md:px-1 px-4' : 'px-4'} py-8`}>
            <MessageCircle className={`${isCollapsed ? 'md:w-8 md:h-8 w-12 h-12' : 'w-12 h-12'} mb-3 opacity-50`} />
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
              {[...visiblePinnedChats, ...visibleUnpinnedChats].map(chat => (
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
                    {renderedChats.pinned.map(chat => (
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
                    {renderedChats.unpinned.map(chat => (
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
                    {renderedChats.pinned.map(chat => (
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
                    {renderedChats.unpinned.map(chat => (
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
