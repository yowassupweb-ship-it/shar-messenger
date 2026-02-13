import { ArrowLeft, X, MoreVertical, Search, Pin, PinOff, Bell, Trash2 } from 'lucide-react';
import Avatar from '@/components/common/data-display/Avatar';
import type { Chat, User, Message } from '@/components/messages/types';

interface ChatHeaderProps {
  selectedChat: Chat;
  isSelectionMode: boolean;
  selectedMessages: Set<string>;
  messages: Message[];
  currentUser: User | null;
  users: User[];
  typingUsers: Record<string, string[]>;
  showChatMenu: boolean;
  editingMessageId: string | null;
  newMessage: string;
  savedMessageText: string;
  messageInputRef: React.RefObject<HTMLTextAreaElement>;
  setIsSelectionMode: (value: boolean) => void;
  setSelectedMessages: (value: Set<string>) => void;
  setShowForwardModal: (value: boolean) => void;
  setSavedMessageText: (value: string) => void;
  setEditingMessageId: (value: string | null) => void;
  setEditingMessageText: (value: string) => void;
  setNewMessage: (value: string) => void;
  deleteMessage: (id: string) => Promise<void>;
  selectChat: (chat: Chat | null) => void;
  setShowChatInfo: (value: boolean) => void;
  setChatInfoTab: (tab: 'profile' | 'tasks' | 'participants' | 'media' | 'files' | 'links') => void;
  getChatTitle: (chat: Chat) => string;
  getChatAvatarData: (chat: Chat) => { avatar: string | undefined; name: string; type: 'user' | 'group' | 'system' | 'favorites' | 'notifications' };
  setShowChatMenu: (value: boolean) => void;
  setShowMessageSearch: (value: boolean) => void;
  togglePinChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
}

export default function ChatHeader({
  selectedChat,
  isSelectionMode,
  selectedMessages,
  messages,
  currentUser,
  users,
  typingUsers,
  showChatMenu,
  editingMessageId,
  newMessage,
  savedMessageText,
  messageInputRef,
  setIsSelectionMode,
  setSelectedMessages,
  setShowForwardModal,
  setSavedMessageText,
  setEditingMessageId,
  setEditingMessageText,
  setNewMessage,
  deleteMessage,
  selectChat,
  setShowChatInfo,
  setChatInfoTab,
  getChatTitle,
  getChatAvatarData,
  setShowChatMenu,
  setShowMessageSearch,
  togglePinChat,
  deleteChat,
}: ChatHeaderProps) {
  const isMobileView = typeof window !== 'undefined' && (window.innerWidth <= 785 || window.matchMedia('(pointer: coarse)').matches);

  return (
    <>
      {/* Chat header */}
      <div 
        className={`absolute top-2 left-2 right-2 z-20 h-[56px] md:h-12 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl border border-white/20 rounded-[50px] flex items-center px-3 md:px-4 py-[10px] gap-2 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] md:absolute md:top-2 md:left-2 md:right-2`}
      >
        {isSelectionMode ? (
          <>
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedMessages(new Set());
              }}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-glass)] text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-all border border-[var(--border-glass)] backdrop-blur-sm"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
            <div className="flex-1 font-medium text-sm">
              Выбрано: {selectedMessages.size}
            </div>
            <div className="flex gap-1.5">
              {/* Кнопка Ответить убрана - используйте правый клик на сообщении */}
              {/* Переслать */}
              <button
                onClick={() => {
                  // Открываем модал пересылки, НЕ сбрасывая режим выбора
                  setShowForwardModal(true);
                }}
                className="w-8 h-8 rounded-full backdrop-blur-xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 flex items-center justify-center transition-all group/btn"
                title={`Переслать (${selectedMessages.size})`}
              >
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18m0 0l-6-6m6 6l-6 6" />
                </svg>
              </button>
              {/* Редактировать - только если выбрано 1 сообщение */}
              {selectedMessages.size === 1 && (() => {
                const selectedMessage = messages.find(m => selectedMessages.has(m.id));
                return selectedMessage?.authorId === currentUser?.id && (
                  <button
                    onClick={() => {
                      if (selectedMessage) {
                        setSavedMessageText(newMessage);
                        setEditingMessageId(selectedMessage.id);
                        setEditingMessageText(selectedMessage.content);
                        setNewMessage(selectedMessage.content);
                        // Устанавливаем текст напрямую в инпут через ref
                        if (messageInputRef.current) {
                          messageInputRef.current.value = selectedMessage.content;
                        }
                        setIsSelectionMode(false);
                        setSelectedMessages(new Set());
                        messageInputRef.current?.focus();
                      }
                    }}
                    className="w-8 h-8 rounded-full backdrop-blur-xl bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 flex items-center justify-center transition-all group/btn"
                    title="Редактировать"
                  >
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                );
              })()}
              {/* Удалить - для любого количества выбранных сообщений */}
              {(() => {
                const selectedMessagesArray = messages.filter(m => m && selectedMessages.has(m.id));
                const allAreOwn = selectedMessagesArray.every(m => m?.authorId === currentUser?.id);
                return allAreOwn && selectedMessagesArray.length > 0 && (
                  <button
                    onClick={async () => {
                      if (confirm(`Удалить ${selectedMessages.size === 1 ? 'это сообщение' : `эти ${selectedMessages.size} сообщений`}?`)) {
                        for (const messageId of Array.from(selectedMessages)) {
                          await deleteMessage(messageId);
                        }
                        setIsSelectionMode(false);
                        setSelectedMessages(new Set());
                      }
                    }}
                    className="w-8 h-8 rounded-full backdrop-blur-xl bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 flex items-center justify-center transition-all group/btn"
                    title="Удалить"
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                );
              })()}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => selectChat(null)}
              className={`no-mobile-scale flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-glass)] text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-all border border-[var(--border-glass)] backdrop-blur-sm -ml-1 ${isMobileView ? 'flex' : 'hidden'}`}
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            </button>
            {/* Кликабельный аватар и имя собеседника */}
            <button
              onClick={() => {
                setShowChatInfo(true);
                setChatInfoTab('profile');
              }}
              className="no-mobile-scale flex items-center gap-3 flex-1 min-w-0 hover:bg-[var(--bg-tertiary)] -ml-2 px-2 py-1.5 rounded-lg transition-all h-12"
            >
              {(() => {
                const avatarData = getChatAvatarData(selectedChat);
                const avatarType = avatarData.type === 'system' ? 'group' : avatarData.type;
                return (
                  <Avatar
                    src={avatarData.avatar}
                    name={avatarData.name}
                    type={avatarType}
                    size="sm"
                  />
                );
              })()}
              <div className="flex-1 min-w-0 text-left">
                <h2 className="font-medium text-sm truncate">{getChatTitle(selectedChat)}</h2>
                {typingUsers[selectedChat.id]?.filter(id => id !== currentUser?.id).length > 0 ? (
                  <p className="text-[10px] text-cyan-400 flex items-center gap-1">
                    <span className="inline-flex gap-0.5">
                      <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="ml-0.5">печатает...</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {selectedChat.isFavoritesChat ? '' : selectedChat.isSystemChat || selectedChat.isNotificationsChat ? '' : selectedChat.isGroup ? `${selectedChat.participantIds?.length || 0} участник${selectedChat.participantIds?.length === 1 ? '' : (selectedChat.participantIds?.length || 0) < 5 ? 'а' : 'ов'}` : (() => {
                      // Получаем собеседника
                      const otherParticipantId = selectedChat.participantIds?.find((id: string) => id !== currentUser?.id);
                      const otherUser = otherParticipantId ? users.find(u => u.id === otherParticipantId) : null;
                      if (!otherUser) return '';
                      if (otherUser.isOnline) return 'в сети';
                      if (otherUser.lastSeen) {
                        const lastSeenDate = new Date(otherUser.lastSeen);
                        const now = new Date();
                        const diffMs = now.getTime() - lastSeenDate.getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffDays = Math.floor(diffMs / 86400000);
                        if (diffMins < 1) return 'был(a) только что';
                        if (diffMins < 60) return `был(a) ${diffMins} мин. назад`;
                        if (diffHours < 24) return `был(a) ${diffHours} ч. назад`;
                        if (diffDays < 7) return `был(a) ${diffDays} дн. назад`;
                        return `был(a) ${lastSeenDate.toLocaleDateString('ru-RU')}`;
                      }
                      return 'не в сети';
                    })()}
                  </p>
                )}
              </div>
            </button>
            
            {/* Кнопка прокрутки к непрочитанным - СКРЫТА, мешала UI */}
            
            {/* Кнопка меню чата */}
            <div className="relative -mr-1">
              <button
                onClick={() => setShowChatMenu(!showChatMenu)}
                className="no-mobile-scale flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-all border border-[var(--border-color)]"
                title="Действия с чатом"
              >
                <MoreVertical className="w-4 h-4 text-[var(--text-primary)]" />
              </button>
              {showChatMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-2xl z-50 py-1 overflow-hidden" style={{ backgroundColor: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    onClick={() => {
                      setShowMessageSearch(true);
                      setShowChatMenu(false);
                    }}
                    className="w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    Поиск по чату
                  </button>
                  <button
                    onClick={() => {
                      togglePinChat(selectedChat.id);
                      setShowChatMenu(false);
                    }}
                    className="w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors"
                  >
                    {selectedChat.pinnedByUser?.[currentUser?.id || ''] ? (
                      <>
                        <PinOff className="w-4 h-4 text-cyan-400" />
                        Открепить чат
                      </>
                    ) : (
                      <>
                        <Pin className="w-4 h-4 text-white" />
                        Закрепить чат
                      </>
                    )}
                  </button>
                  
                  {/* Настройки уведомлений */}
                  <div className="border-t border-white/10 my-1" />
                  <button
                    onClick={() => {
                      const currentState = localStorage.getItem(`chat_notifications_${selectedChat.id}`) !== 'false';
                      localStorage.setItem(`chat_notifications_${selectedChat.id}`, String(!currentState));
                      setShowChatMenu(false);
                      alert(currentState ? 'Уведомления выключены' : 'Уведомления включены');
                    }}
                    className="w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 text-white hover:bg-white/10 transition-colors"
                  >
                    <Bell className="w-4 h-4" />
                    {localStorage.getItem(`chat_notifications_${selectedChat.id}`) === 'false' ? 'Включить уведомления' : 'Выключить уведомления'}
                  </button>
                  
                  {!selectedChat.isSystemChat && !selectedChat.isNotificationsChat && !selectedChat.isFavoritesChat && (
                    <>
                      <div className="border-t border-white/10 my-1" />
                      <button
                        onClick={() => {
                          deleteChat(selectedChat.id);
                          setShowChatMenu(false);
                        }}
                        className="w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Удалить чат
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Кнопка копирования под хедером - только в режиме выбора и если выбрано 1 сообщение */}
      {isSelectionMode && selectedMessages.size === 1 && (() => {
        const selectedMessage = messages.find(m => selectedMessages.has(m.id));
        return selectedMessage?.content && (
          <div className="mx-2 mt-14 md:mt-2 flex justify-center z-30">
            <button
              onClick={() => {
                if (selectedMessage) {
                  navigator.clipboard.writeText(selectedMessage.content);
                  setIsSelectionMode(false);
                  setSelectedMessages(new Set());
                }
              }}
              className="px-4 py-2 rounded-full border border-green-500/30 hover:bg-green-500/10 flex items-center justify-center gap-2 transition-all shadow-lg"
              title="Копировать текст"
              style={{ borderRadius: '50px' }}
            >
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-green-400">Копировать текст</span>
            </button>
          </div>
        );
      })()}
    </>
  );
}
