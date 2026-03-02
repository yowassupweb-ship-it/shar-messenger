import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, X, MoreVertical, Search, Pin, PinOff, Bell, Trash2, ChevronLeft, ChevronRight, Archive, Inbox } from 'lucide-react';
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
  showMessageSearch: boolean;
  messageSearchQuery: string;
  setMessageSearchQuery: (value: string) => void;
  linkedTaskId?: string | null;
  linkedTaskTitle?: string | null;
  linkedTaskStatus?: string | null;
  openLinkedTask: (taskId: string) => void;
  pinnedMessageId?: string | null;
  pinnedMessagePreview?: string | null;
  pinnedMessageCount?: number;
  pinnedMessagePosition?: number;
  showPreviousPinned: () => void;
  showNextPinned: () => void;
  openPinnedMessage: (messageId: string) => void;
  unpinMessage: () => void;
  togglePinChat: (chatId: string) => void;
  toggleArchiveChat: (chatId: string) => void;
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
  showMessageSearch,
  messageSearchQuery,
  setMessageSearchQuery,
  linkedTaskId,
  linkedTaskTitle,
  linkedTaskStatus,
  openLinkedTask,
  pinnedMessageId,
  pinnedMessagePreview,
  pinnedMessageCount = 0,
  pinnedMessagePosition = 0,
  showPreviousPinned,
  showNextPinned,
  openPinnedMessage,
  unpinMessage,
  togglePinChat,
  toggleArchiveChat,
  deleteChat,
}: ChatHeaderProps) {
  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window === 'undefined') return 1200;
    return window.innerWidth;
  });
  const isTouchPointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const isMobileView = viewportWidth < 773 || isTouchPointer;
  const showBackButton = isMobileView;
  const isMiniTaskHeaderView = isMobileView && viewportWidth < 944;
  const useCompactLinkedTaskButton = isMobileView || viewportWidth < 1180;
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const resizeRafRef = useRef<number | null>(null);
  const glassRoundButtonClass = 'no-mobile-scale flex-shrink-0 flex items-center justify-center w-[42px] h-[42px] rounded-full bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-light)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] transition-all shadow-[var(--shadow-card)]';
  const glassPillClass = 'bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] backdrop-blur-xl border border-[var(--border-light)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] transition-all shadow-[var(--shadow-card)]';
  const normalizedTaskStatus = (linkedTaskStatus || '').toLowerCase();
  const linkedTaskStatusLabel = normalizedTaskStatus
    ? ({
        todo: 'К выполнению',
        pending: 'В ожидании',
        'in-progress': 'В работе',
        review: 'На проверке',
        cancelled: 'Отменена',
        stuck: 'Застряла',
        completed: 'Завершена',
      } as Record<string, string>)[normalizedTaskStatus] || linkedTaskStatus
    : null;
  const isArchived = (() => {
    const raw = selectedChat.archivedByUser?.[currentUser?.id || ''];
    if (typeof raw === 'string') return raw.toLowerCase() === 'true';
    return Boolean(raw || (selectedChat as any).isArchivedForUser);
  })();
  const isProtectedSystemChat = Boolean(selectedChat.isFavoritesChat || selectedChat.isNotificationsChat || selectedChat.isSystemChat);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateWidth = () => {
      const nextWidth = window.innerWidth;
      setViewportWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    };

    const handleResize = () => {
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
      }
      resizeRafRef.current = requestAnimationFrame(updateWidth);
    };

    window.addEventListener('resize', handleResize);
    updateWidth();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showChatMenu) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (chatMenuRef.current && !chatMenuRef.current.contains(target)) {
        setShowChatMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowChatMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showChatMenu, setShowChatMenu]);

  return (
    <>
      {/* Chat header */}
      <div 
        className={`absolute top-0 left-0 right-0 z-20 h-[56px] md:h-[58px] flex items-center px-[2px] md:px-4 lg:px-8 py-[10px] gap-2`}
        onCopy={(e) => e.preventDefault()}
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
                        setSavedMessageText(messageInputRef.current?.value || newMessage);
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
              className={`${glassRoundButtonClass} text-[var(--text-primary)] ${showBackButton ? 'flex ml-[2px]' : 'hidden'}`}
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            </button>
            {/* Кликабельный аватар и имя собеседника */}
            {(!showMessageSearch || !isMobileView) && (
            <button
              onClick={() => {
                setShowChatInfo(true);
                setChatInfoTab('profile');
              }}
              className={`no-mobile-scale flex items-center gap-3 min-w-0 px-[14px] py-[6px] rounded-full transition-all h-[46px] ${glassPillClass} ${isMobileView ? 'flex-1 w-0 max-w-none' : 'w-fit shrink-0 max-w-[calc(100%-104px)]'}`}
            >
              {(() => {
                const avatarData = getChatAvatarData(selectedChat);
                const avatarType = avatarData.type === 'system' ? 'group' : avatarData.type;
                return (
                  <div className="flex h-9 w-9 items-center justify-center shrink-0">
                    <Avatar
                      src={avatarData.avatar}
                      name={avatarData.name}
                      type={avatarType}
                      size="sm"
                    />
                  </div>
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
                      const otherParticipantId = selectedChat.participantIds?.find((id: string) => String(id) !== String(currentUser?.id));
                      const otherUser = otherParticipantId
                        ? users.find(u => String(u.id) === String(otherParticipantId))
                        : null;
                      if (!otherUser) return '';

                      const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();
                      const otherIdentity = new Set<string>([
                        normalize(otherUser.id),
                        normalize((otherUser as any).telegramId),
                        normalize((otherUser as any).telegram_id),
                        normalize(otherUser.username),
                        normalize((otherUser as any).name),
                        normalize((otherUser as any).fullName),
                        normalize(otherUser.email),
                      ].filter(Boolean));

                      const latestOtherMessage = [...messages]
                        .reverse()
                        .find((msg) => {
                          const authorCandidates = [
                            (msg as any).authorId,
                            (msg as any).author_id,
                            (msg as any).authorName,
                            (msg as any).authorUsername,
                            (msg as any).authorEmail,
                          ]
                            .map(normalize)
                            .filter(Boolean);
                          return authorCandidates.some(candidate => otherIdentity.has(candidate));
                        });

                      const statusLastSeenRaw =
                        (otherUser as any).lastSeen ??
                        (otherUser as any).last_seen ??
                        (otherUser as any).lastActivity ??
                        (otherUser as any).last_activity;

                      const statusLastSeenDate = statusLastSeenRaw ? new Date(statusLastSeenRaw) : null;
                      const messageLastSeenDate = latestOtherMessage?.createdAt ? new Date(latestOtherMessage.createdAt) : null;

                      let effectiveLastSeenDate: Date | null = null;
                      if (statusLastSeenDate && !Number.isNaN(statusLastSeenDate.getTime())) {
                        effectiveLastSeenDate = statusLastSeenDate;
                      }
                      if (messageLastSeenDate && !Number.isNaN(messageLastSeenDate.getTime())) {
                        if (!effectiveLastSeenDate || messageLastSeenDate.getTime() > effectiveLastSeenDate.getTime()) {
                          effectiveLastSeenDate = messageLastSeenDate;
                        }
                      }

                      if ((otherUser as any).isOnline || (otherUser as any).is_online) return 'в сети';
                      if (effectiveLastSeenDate) {
                        const now = new Date();
                        const diffMs = now.getTime() - effectiveLastSeenDate.getTime();
                        if (diffMs < 120000) return 'в сети';
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffDays = Math.floor(diffMs / 86400000);
                        if (diffMins < 1) return 'был(a) только что';
                        if (diffMins < 60) return `был(a) ${diffMins} мин. назад`;
                        if (diffHours < 24) return `был(a) ${diffHours} ч. назад`;
                        if (diffDays < 7) return `был(a) ${diffDays} дн. назад`;
                        return `был(a) ${effectiveLastSeenDate.toLocaleDateString('ru-RU')}`;
                      }
                      return 'не в сети';
                    })()}
                  </p>
                )}
              </div>
            </button>
            )}

            {showMessageSearch && (
              <div className={`${isMobileView ? 'flex flex-1 min-w-0 ml-1' : 'hidden md:flex items-center w-[180px] ml-1'}`}>
                <div className="relative w-full">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-[var(--text-primary)]">
                    <Search className="w-4.5 h-4.5" strokeWidth={2.6} />
                  </div>
                  <input
                    type="text"
                    placeholder="Поиск..."
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full h-[46px] pl-10 pr-9 bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] rounded-full text-sm focus:outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-primary)] shadow-[var(--shadow-card)] backdrop-blur-xl"
                  />
                  <button
                    onClick={() => {
                      setShowMessageSearch(false);
                      setMessageSearchQuery('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6.5 h-6.5 rounded-full hover:bg-[var(--bg-glass-hover)] flex items-center justify-center transition-all"
                    title="Закрыть поиск"
                  >
                    <X className="w-4.5 h-4.5 text-[var(--text-primary)]" />
                  </button>
                </div>
              </div>
            )}

            {!showMessageSearch && linkedTaskId && !isMiniTaskHeaderView && (
              <>
              {useCompactLinkedTaskButton ? (
                <button
                  onClick={() => openLinkedTask(linkedTaskId)}
                  className={`${glassRoundButtonClass} ml-1 text-[var(--text-primary)]`}
                  title="Привязано к задаче"
                >
                  <Pin className="w-4 h-4" />
                </button>
              ) : (
              <div className="flex items-center ml-1">
                <button
                  onClick={() => openLinkedTask(linkedTaskId)}
                  className={`w-[164px] min-w-[164px] max-w-[164px] h-[46px] px-3 rounded-full flex items-center gap-2 ${glassPillClass}`}
                  title="Привязано к задаче"
                >
                  <Pin className="w-3.5 h-3.5 text-[var(--text-primary)] flex-shrink-0" />
                  <div className="min-w-0 text-left">
                    <p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)] leading-none">Привязано к задаче</p>
                    <p className="text-xs text-[var(--text-primary)] truncate mt-0.5">{linkedTaskTitle || 'Привязано к задаче'}</p>
                    {linkedTaskStatusLabel && (
                      <p className="text-[10px] text-[var(--text-muted)] truncate leading-none mt-0.5">Статус: {linkedTaskStatusLabel}</p>
                    )}
                  </div>
                </button>
              </div>
              )}
              </>
            )}

            {!showMessageSearch && !linkedTaskId && pinnedMessageId && !isMiniTaskHeaderView && (
              <>
                {useCompactLinkedTaskButton ? (
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      onClick={showPreviousPinned}
                      className="w-8 h-8 rounded-full border border-[var(--border-light)] bg-[var(--bg-glass)]/95 hover:bg-[var(--bg-glass-hover)] flex items-center justify-center disabled:opacity-45 disabled:cursor-not-allowed"
                      disabled={pinnedMessageCount <= 1}
                      title="Предыдущее закрепленное"
                    >
                      <ChevronLeft className="w-4 h-4 text-[var(--text-primary)]" />
                    </button>
                    <button
                      onClick={() => openPinnedMessage(pinnedMessageId)}
                      className={`${glassRoundButtonClass} text-[var(--text-primary)] relative`}
                      title="Закрепленное сообщение"
                    >
                      <Pin className="w-4 h-4 text-cyan-400" />
                      {pinnedMessageCount > 1 && (
                        <span className="absolute -bottom-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-cyan-500 text-[9px] leading-4 text-white border border-[var(--border-light)]">
                          {pinnedMessagePosition}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={showNextPinned}
                      className="w-8 h-8 rounded-full border border-[var(--border-light)] bg-[var(--bg-glass)]/95 hover:bg-[var(--bg-glass-hover)] flex items-center justify-center disabled:opacity-45 disabled:cursor-not-allowed"
                      disabled={pinnedMessageCount <= 1}
                      title="Следующее закрепленное"
                    >
                      <ChevronRight className="w-4 h-4 text-[var(--text-primary)]" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center ml-1">
                    <div className={`w-[244px] min-w-[244px] max-w-[244px] h-[38px] px-2 rounded-full flex items-center gap-1.5 ${glassPillClass}`}>
                      <button
                        onClick={showPreviousPinned}
                        className="w-6 h-6 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-glass-hover)] flex items-center justify-center disabled:opacity-45 disabled:cursor-not-allowed"
                        disabled={pinnedMessageCount <= 1}
                        title="Предыдущее закрепленное"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                      </button>
                      <button
                        onClick={() => openPinnedMessage(pinnedMessageId)}
                        className="min-w-0 flex-1 text-left"
                        title="Закрепленное сообщение"
                      >
                        <p className="text-[8px] uppercase tracking-wide text-[var(--text-muted)] leading-none">
                          {pinnedMessagePosition}/{pinnedMessageCount} закреп
                        </p>
                        <p className="text-[11px] text-[var(--text-primary)] truncate mt-0.5 leading-tight">{pinnedMessagePreview || 'Сообщение без текста'}</p>
                      </button>
                      <button
                        onClick={showNextPinned}
                        className="w-6 h-6 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-glass-hover)] flex items-center justify-center disabled:opacity-45 disabled:cursor-not-allowed"
                        disabled={pinnedMessageCount <= 1}
                        title="Следующее закрепленное"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                      </button>
                      <button
                        onClick={unpinMessage}
                        className="w-6 h-6 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-glass-hover)] flex items-center justify-center flex-shrink-0"
                        title="Открепить"
                      >
                        <PinOff className="w-3 h-3 text-amber-400" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Кнопка прокрутки к непрочитанным - СКРЫТА, мешала UI */}
            
            {/* Кнопка меню чата */}
            <div ref={chatMenuRef} className="relative ml-auto">
              <button
                onClick={() => setShowChatMenu(!showChatMenu)}
                className={glassRoundButtonClass}
                title="Действия с чатом"
              >
                <MoreVertical className="w-4 h-4 text-[var(--text-primary)]" />
              </button>
              {showChatMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-2xl z-50 py-1 overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)] backdrop-blur-xl">
                  <button
                    onClick={() => {
                      setShowMessageSearch(true);
                      setShowChatMenu(false);
                    }}
                    className="w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    Поиск по чату
                  </button>
                  <button
                    onClick={() => {
                      togglePinChat(selectedChat.id);
                      setShowChatMenu(false);
                    }}
                    className="w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors"
                  >
                    {selectedChat.pinnedByUser?.[currentUser?.id || ''] ? (
                      <>
                        <PinOff className="w-4 h-4 text-[var(--text-primary)]" />
                        Открепить чат
                      </>
                    ) : (
                      <>
                        <Pin className="w-4 h-4 text-[var(--text-primary)]" />
                        Закрепить чат
                      </>
                    )}
                  </button>
                  {!isProtectedSystemChat && (
                    <button
                      onClick={() => {
                        toggleArchiveChat(selectedChat.id);
                        setShowChatMenu(false);
                      }}
                      className="w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors"
                    >
                      {isArchived ? (
                        <>
                          <Inbox className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          Вернуть из архива
                        </>
                      ) : (
                        <>
                          <Archive className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          В архив
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Настройки уведомлений */}
                  <div className="border-t border-[var(--border-color)] my-1" />
                  <button
                    onClick={() => {
                      const currentState = localStorage.getItem(`chat_notifications_${selectedChat.id}`) !== 'false';
                      localStorage.setItem(`chat_notifications_${selectedChat.id}`, String(!currentState));
                      setShowChatMenu(false);
                      alert(currentState ? 'Уведомления выключены' : 'Уведомления включены');
                    }}
                    className="w-full px-3 py-2.5 text-sm text-left flex items-center gap-2.5 text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors"
                  >
                    <Bell className="w-4 h-4" />
                    {localStorage.getItem(`chat_notifications_${selectedChat.id}`) === 'false' ? 'Включить уведомления' : 'Выключить уведомления'}
                  </button>
                  
                  {!selectedChat.isSystemChat && !selectedChat.isNotificationsChat && !selectedChat.isFavoritesChat && (
                    <>
                      <div className="border-t border-[var(--border-color)] my-1" />
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

      {!isSelectionMode && !showMessageSearch && linkedTaskId && isMiniTaskHeaderView && (
        <div className="absolute top-[64px] left-0 right-0 z-20 px-[2px] md:px-4 flex justify-center">
          <button
            onClick={() => openLinkedTask(linkedTaskId)}
            className={`w-full max-w-[200px] h-[22px] px-2 rounded-[11px] flex items-center justify-center gap-1.5 ${glassPillClass}`}
            title="Привязано к задаче"
          >
            <Pin className="w-3 h-3 text-[var(--text-primary)] flex-shrink-0" />
            <div className="min-w-0 text-center">
              <p className="text-[11px] leading-none text-[var(--text-primary)] truncate">Привязано к задаче</p>
            </div>
          </button>
        </div>
      )}

    </>
  );
}
