import React from 'react';
import { Search, Plus, Sun, Moon, MessageCircle } from 'lucide-react';
import ChatItem from './ChatItem';
import { Chat, User } from './types';

interface ChatSidebarProps {
  selectedChat: Chat | null;
  isChatListCollapsed: boolean;
  setIsChatListCollapsed: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  setShowNewChatModal: (value: boolean) => void;
  theme: string;
  toggleTheme: () => void;
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
  theme,
  toggleTheme,
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
  return (
    <div className={`
      ${selectedChat ? 'hidden md:flex' : 'flex'} 
      w-full ${isChatListCollapsed ? 'md:w-[72px]' : 'md:w-80'} 
      border-r border-[var(--border-color)] flex-col h-full min-h-0 transition-all duration-200 bg-[var(--bg-secondary)]
    `}>
      {/* Search / New Chat Button */}
      {isChatListCollapsed ? (
        <>
          {/* Мобильный поиск - glass стилизация */}
          <div className="px-2 py-1.5 flex-shrink-0 md:hidden">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-primary)] flex items-center justify-center z-10 pointer-events-none">
                <Search className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-gradient-to-br from-white/15 to-white/5 border border-white/20 rounded-[20px] text-sm focus:outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-white/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] backdrop-blur-sm"
              />
            </div>
          </div>
          {/* Десктоп свёрнутые кнопки: поиск и новый чат */}
          <div className="py-2 hidden md:flex flex-col items-center gap-2 border-b border-[var(--border-color)]">
            <button
              onClick={() => setIsChatListCollapsed(false)}
              className="w-10 h-10 rounded-full bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] flex items-center justify-center transition-all border border-[var(--border-glass)]"
              title="Поиск"
            >
              <Search className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-all"
              title="Новый чат"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] flex items-center justify-center transition-all border border-[var(--border-glass)]"
              title={theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-[var(--text-muted)]" /> : <Moon className="w-5 h-5 text-[var(--text-muted)]" />}
            </button>
          </div>
        </>
      ) : (
        <div className="px-2 py-1.5 md:p-3 flex-shrink-0 flex items-center gap-2">
          <div className="relative flex-1 md:flex-none">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-primary)] flex items-center justify-center z-10 pointer-events-none">
              <Search className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-[200px] h-10 pl-10 pr-3 bg-gradient-to-br from-white/15 to-white/5 border border-white/20 rounded-[20px] text-sm focus:outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-white/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] backdrop-blur-sm"
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
            onClick={toggleTheme}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 flex items-center justify-center transition-all border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-sm"
            title={theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Chats list */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-20 md:pb-20">
        {isLoadingChats ? (
          /* 🚀 PERFORMANCE: Skeleton loader для LCP оптимизации */
          <ChatListSkeleton />
        ) : chats.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full text-[var(--text-muted)] ${isChatListCollapsed ? 'md:px-1 px-4' : 'px-4'} py-8`}>
            <MessageCircle className={`${isChatListCollapsed ? 'md:w-8 md:h-8 w-12 h-12' : 'w-12 h-12'} mb-3 opacity-50`} />
            {isChatListCollapsed ? (
              <div className="md:hidden">
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
        ) : isChatListCollapsed ? (
          <>
            {/* Свернутый список - только аватарки (только desktop) */}
            <div className="hidden md:block py-2 space-y-1">
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
         
            {/* Полный список для mobile когда collapsed */}
            <div className="md:hidden">
              {/* Закрепленные чаты */}
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
              {/* Обычные чаты (mobile collapsed) */}
              <div>
                {pinnedChats.length > 0 && unpinnedChats.length > 0 && (
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
            </div>
          </>
        ) : (
          <>
            {/* Закрепленные чаты */}
            {pinnedChats.length > 0 && (
              <div>
                <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider select-none">
                  Закрепленные
                </div>
                <div className="space-y-1">
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
                      variant="desktop"
                      isPinned={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Обычные чаты */}
            {unpinnedChats.length > 0 && (
              <div>
                {pinnedChats.length > 0 && (
                  <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">
                    Все чаты
                  </div>
                )}
                <div className="space-y-1">
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
                      variant="desktop"
                      isPinned={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
