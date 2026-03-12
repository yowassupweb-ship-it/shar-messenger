import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { MessageCircle } from 'lucide-react';
import MessageItem from './MessageItem';
import type { Message, User, Chat } from './types';

interface MessagesAreaProps {
  messagesListRef: React.RefObject<HTMLDivElement | null>;
  messages: Message[];
  messageSearchQuery: string;
  users: User[];
  currentUser: User | null;
  selectedChat: Chat;
  selectedMessages: Set<string>;
  editingMessageId: string | null;
  isSelectionMode: boolean;
  messageRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  theme: 'light' | 'dark';
  chatSettings: any;
  isDesktopView: boolean;
  myBubbleTextClass: string;
  useDarkTextOnBubble: boolean;
  composerContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  router: any;
  setSelectedMessages: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setIsSelectionMode: (value: boolean) => void;
  setContextMenuMessage: (message: Message) => void;
  setContextMenuPosition: (pos: { top: number; left: number }) => void;
  setShowMessageContextMenu: (show: boolean) => void;
  scrollToMessage: (messageId: string) => void;
  setCurrentImageUrl: (url: string) => void;
  setShowImageModal: (show: boolean) => void;
  hasPinnedMessage?: boolean;
}

export default function MessagesArea({
  messagesListRef,
  messages,
  messageSearchQuery,
  users,
  currentUser,
  selectedChat,
  selectedMessages,
  editingMessageId,
  isSelectionMode,
  messageRefs,
  theme,
  chatSettings,
  isDesktopView,
  myBubbleTextClass,
  useDarkTextOnBubble,
  composerContainerRef,
  messagesEndRef,
  router,
  setSelectedMessages,
  setIsSelectionMode,
  setContextMenuMessage,
  setContextMenuPosition,
  setShowMessageContextMenu,
  scrollToMessage,
  setCurrentImageUrl,
  setShowImageModal,
  hasPinnedMessage = false,
}: MessagesAreaProps) {
  const [hasRealOverflow, setHasRealOverflow] = useState(false);
  const [dockOffsetPx, setDockOffsetPx] = useState(96);
  const dockOffsetRef = useRef(96);
  const previousDockOffsetRef = useRef(96);
  const containerClass = isDesktopView
    ? `flex-1 min-h-[260px] overflow-x-hidden overscroll-contain p-4 ${hasPinnedMessage ? 'pt-28' : 'pt-16'} pb-0 bg-transparent scrollbar-hide-mobile`
    : `flex-1 min-h-[220px] overflow-x-hidden overscroll-contain p-[3px] ${hasPinnedMessage ? 'pt-[164px]' : 'pt-[120px]'} pb-0 bg-transparent scrollbar-hide-mobile`;
  const innerClass = isDesktopView
    ? 'px-4 lg:px-8 h-full min-w-0'
    : 'px-0 h-full min-w-0';
  const listSpacingClass = isDesktopView ? 'space-y-[3px]' : 'space-y-1.5';
  const chatBackgroundColor = theme === 'dark'
    ? (chatSettings?.chatBackgroundDark || '#0f172a')
    : (chatSettings?.chatBackgroundLight || '#f8fafc');
  const chatBackgroundImage = theme === 'dark'
    ? String(chatSettings?.chatBackgroundImageDark || '').trim()
    : String(chatSettings?.chatBackgroundImageLight || '').trim();
  const chatOverlayImage = theme === 'dark'
    ? String(chatSettings?.chatOverlayImageDark || '').trim()
    : String(chatSettings?.chatOverlayImageLight || '').trim();
  const overlayScale = Math.max(20, Math.min(200, Number(chatSettings?.chatOverlayScale ?? 100) || 100));
  const overlayOpacity = Math.max(0, Math.min(1, Number(chatSettings?.chatOverlayOpacity ?? 1) || 1));
  const emptyStateTopOffset = isDesktopView
    ? (hasPinnedMessage ? 112 : 64)
    : (hasPinnedMessage ? 164 : 120);

  const chatBackgroundStyle = useMemo<CSSProperties>(() => {
    const style: CSSProperties = {
      backgroundColor: chatBackgroundColor,
    };

    if (chatBackgroundImage) {
      style.backgroundImage = `url('${chatBackgroundImage}')`;
      style.backgroundSize = 'cover';
      style.backgroundRepeat = 'no-repeat';
      style.backgroundPosition = 'center center';
    }

    return style;
  }, [chatBackgroundColor, chatBackgroundImage]);

  const overlayStyle = useMemo<CSSProperties | undefined>(() => {
    if (!chatOverlayImage) return undefined;
    return {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      backgroundImage: `url('${chatOverlayImage}')`,
      backgroundSize: `${overlayScale * 3}px`,
      backgroundRepeat: 'repeat',
      backgroundPosition: 'center center',
      backgroundAttachment: 'fixed',
      opacity: overlayOpacity,
      zIndex: 1,
    };
  }, [chatOverlayImage, overlayScale, overlayOpacity]);

  const filteredMessages = messages.filter(message => {
    if (!message) return false;
    if (!messageSearchQuery.trim()) return true;
    return message.content.toLowerCase().includes(messageSearchQuery.toLowerCase());
  });
  const visibleMessages = filteredMessages;

  const chronologicallySortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return String(a.id).localeCompare(String(b.id));
      if (!Number.isFinite(aTime)) return -1;
      if (!Number.isFinite(bTime)) return 1;
      if (aTime !== bTime) return aTime - bTime;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [messages]);

  const messageOrderById = useMemo(() => {
    return chronologicallySortedMessages.reduce((acc, message, index) => {
      acc[message.id] = index;
      return acc;
    }, {} as Record<string, number>);
  }, [chronologicallySortedMessages]);

  const readBoundaryIndexByUser = useMemo(() => {
    const readMap = selectedChat?.readMessagesByUser || {};
    const boundary: Record<string, number> = {};

    Object.entries(readMap).forEach(([participantId, rawReadMarker]) => {
      if (!rawReadMarker) {
        boundary[participantId] = -1;
        return;
      }

      const readMarker = String(rawReadMarker);

      if (messageOrderById[readMarker] !== undefined) {
        boundary[participantId] = messageOrderById[readMarker];
        return;
      }

      const readTimestamp = new Date(readMarker).getTime();
      if (!Number.isFinite(readTimestamp)) {
        boundary[participantId] = -1;
        return;
      }

      let maxReadIndex = -1;
      for (let index = 0; index < chronologicallySortedMessages.length; index++) {
        const messageTimestamp = new Date(chronologicallySortedMessages[index].createdAt || 0).getTime();
        if (!Number.isFinite(messageTimestamp)) continue;
        if (messageTimestamp <= readTimestamp) {
          maxReadIndex = index;
        }
      }

      boundary[participantId] = maxReadIndex;
    });

    return boundary;
  }, [selectedChat?.readMessagesByUser, messageOrderById, chronologicallySortedMessages]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDockOffset = () => {
      const composerEl = composerContainerRef.current;
      const spacerEl = messagesEndRef.current;
      if (!composerEl || !spacerEl) return;

      const rect = composerEl.getBoundingClientRect();
      const composerStyle = window.getComputedStyle(composerEl);
      const composerBottom = Math.max(0, parseFloat(composerStyle.bottom || '0') || 0);
      const composerHeight = Math.max(0, Math.round(rect.height));
      const nextOffset = Math.max(44, Math.round(composerHeight + composerBottom + 10));
      const previousOffset = previousDockOffsetRef.current;
      const offsetDelta = nextOffset - previousOffset;
      const container = messagesListRef.current;

      let shouldKeepBottomAnchor = false;
      if (!isDesktopView && container && offsetDelta !== 0) {
        const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        shouldKeepBottomAnchor = distanceToBottom <= Math.max(120, previousOffset + 24);
      }

      if (dockOffsetRef.current !== nextOffset) {
        dockOffsetRef.current = nextOffset;
        setDockOffsetPx(nextOffset);
      }

      previousDockOffsetRef.current = nextOffset;

      spacerEl.style.height = `${dockOffsetRef.current}px`;

      if (!isDesktopView && container && shouldKeepBottomAnchor && offsetDelta !== 0) {
        container.scrollTop += offsetDelta;
      }
    };

    updateDockOffset();

    const composerEl = composerContainerRef.current;
    const resizeObserver = composerEl ? new ResizeObserver(updateDockOffset) : null;
    if (composerEl && resizeObserver) {
      resizeObserver.observe(composerEl);
    }

    window.addEventListener('composer-resize', updateDockOffset as EventListener);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('composer-resize', updateDockOffset as EventListener);
    };
  }, [composerContainerRef, messagesEndRef, selectedChat.id, isDesktopView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkOverflow = () => {
      const container = messagesListRef.current;
      const spacerEl = messagesEndRef.current;
      if (!container) return;
      const contentHeightWithoutSpacer = spacerEl
        ? Math.max(0, spacerEl.offsetTop)
        : Math.max(0, container.scrollHeight - dockOffsetRef.current);
      const overflowDelta = contentHeightWithoutSpacer - container.clientHeight;
      const overflowThreshold = typeof window !== 'undefined' && window.innerWidth >= 768 ? 2 : 1;
      const overflow = overflowDelta > overflowThreshold;
      setHasRealOverflow(overflow);
    };

    checkOverflow();
    const rafId = requestAnimationFrame(checkOverflow);
    const rafId2 = requestAnimationFrame(checkOverflow);
    window.addEventListener('resize', checkOverflow);
    window.addEventListener('composer-resize', checkOverflow as EventListener);

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(rafId2);
      window.removeEventListener('resize', checkOverflow);
      window.removeEventListener('composer-resize', checkOverflow as EventListener);
    };
  }, [messagesListRef, messagesEndRef, selectedChat.id, messages.length, messageSearchQuery]);

  const shouldScroll = hasRealOverflow;
  const scrollBehaviorClass = shouldScroll ? 'overflow-y-auto' : 'overflow-y-hidden';

  const isMessageReadByOthers = (message: Message): boolean => {
    if (!currentUser || !selectedChat?.readMessagesByUser) return false;
    if (message.authorId !== currentUser.id) return false;

    const messageOrderIndex = messageOrderById[message.id];
    if (messageOrderIndex === undefined || messageOrderIndex < 0) return false;

    const readMapKeys = Object.keys(selectedChat.readMessagesByUser || {});
    const otherReaderIds = readMapKeys.filter((readerId) => readerId !== currentUser.id);
    const idsToCheck = otherReaderIds.length > 0
      ? otherReaderIds
      : (selectedChat.participantIds || []).filter((participantId) => participantId !== currentUser.id);

    if (idsToCheck.length === 0) return false;

    return idsToCheck.some((participantId) => {
      const readBoundaryIndex = readBoundaryIndexByUser[participantId];
      return readBoundaryIndex !== undefined && readBoundaryIndex >= messageOrderIndex;
    });
  };

  return (
    <div
      ref={messagesListRef}
      className={`${containerClass} ${scrollBehaviorClass} relative`}
      style={chatBackgroundStyle}
    >
      {overlayStyle && <div style={overlayStyle} aria-hidden="true" />}
      <div className={`${innerClass} relative z-10`}>
        {messages.length === 0 ? (
          <div
            className="absolute left-0 right-0 z-20 px-4 select-none"
            style={{ top: emptyStateTopOffset, bottom: dockOffsetPx }}
          >
            <div className="h-full flex items-center justify-center">
              <div className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-glass)]/55 backdrop-blur-2xl shadow-[var(--shadow-card)] px-7 py-6 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full border border-[var(--border-light)] bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 opacity-70" />
                </div>
                <p className="text-[15px] font-semibold leading-tight text-[var(--text-primary)]">Нет сообщений</p>
                <p className="text-[12px] mt-1 text-[var(--text-secondary)]">Начните общение</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={listSpacingClass}>
            {visibleMessages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                index={index}
                filteredMessages={visibleMessages}
                messages={messages}
                users={users}
                currentUser={currentUser}
                selectedChat={selectedChat}
                selectedMessages={selectedMessages}
                editingMessageId={editingMessageId}
                isSelectionMode={isSelectionMode}
                messageRefs={messageRefs}
                theme={theme}
                chatSettings={chatSettings}
                isDesktopView={isDesktopView}
                myBubbleTextClass={myBubbleTextClass}
                useDarkTextOnBubble={useDarkTextOnBubble}
                isReadByOthers={isMessageReadByOthers(message)}
                onSelectMessage={(messageId) => {
                  setSelectedMessages(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(messageId)) {
                      newSet.delete(messageId);
                      if (newSet.size === 0) setIsSelectionMode(false);
                    } else {
                      newSet.add(messageId);
                    }
                    return newSet;
                  });
                }}
                onDoubleClick={(messageId) => {
                  setIsSelectionMode(true);
                  setSelectedMessages(new Set([messageId]));
                }}
                onContextMenu={(e, msg) => {
                  setContextMenuMessage(msg);
                  setContextMenuPosition({ top: e.clientY, left: e.clientX });
                  setShowMessageContextMenu(true);
                }}
                scrollToMessage={scrollToMessage}
                setCurrentImageUrl={setCurrentImageUrl}
                setShowImageModal={setShowImageModal}
                router={router}
              />
            ))}
          </div>
        )}
        <div 
          ref={messagesEndRef} 
          className="h-0" 
          style={messages.length === 0 ? undefined : { height: `${dockOffsetRef.current}px` }} 
        />
      </div>
    </div>
  );
}
