/**
 * ChatTimelineV2 - Simplified implementation based on Signal Desktop
 * 
 * Key principles:
 * 1. Use scrollBottom (distance from bottom) instead of scrollTop
 *    - Remains stable when content is added at the top
 * 2. getSnapshotBeforeUpdate + componentDidUpdate for flickerless restoration
 * 3. Simple localStorage persistence per chat
 * 4. No complex visibility flags or competing state machines
 */

'use client';

import React, { Component, createRef } from 'react';
import { Check, CheckCheck, Clock3, Download, FileText } from 'lucide-react';
import MessageItem from './MessageItem';
import Quote from './Quote';
import type { Message, User, Chat } from './types';
import { PinnedMessageAction } from '@/app/test-chat/PinnedMessageBar';
import {
  getScrollBottom,
  setScrollBottom,
  scrollToBottom,
  isAtBottom,
} from '@/lib/scrollUtil';
import {
  ScrollAnchor,
  MessageLoadingState,
  getScrollAnchorBeforeUpdate,
  type ScrollAnchorProps,
} from '@/lib/timelineUtil';

// ── URL rendering ─────────────────────────────────────────────────────────────
const URL_REGEX = /https?:\/\/[^\s<>"']+/g;

function renderTextWithLinks(text: string): React.ReactNode {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'inherit', textDecorationLine: 'underline', opacity: 0.85 }}
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}

// ── Lazy image with Telegram-style fade-in effect + in-memory cache ───────────
const imgLoadedCache = new Set<string>();

function LazyImage({
  src,
  alt,
  className,
  style,
  onClick,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}) {
  const [loaded, setLoaded] = React.useState(() => imgLoadedCache.has(src));
  return (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      style={{
        ...style,
        opacity: loaded ? 1 : 0,
        transition: loaded ? 'opacity 0.3s ease' : 'none',
      }}
      loading="lazy"
      decoding="async"
      onLoad={() => { imgLoadedCache.add(src); setLoaded(true); }}
      onClick={onClick}
    />
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatTimelineV2Props {
  chatId: string;
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
  hasPinnedMessage?: boolean;
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
  onNearBottomChange?: (value: boolean) => void;
  onViewportReadyChange?: (value: boolean) => void;
  scrollTopPadding?: number;
  scrollBottomPadding?: number;
}

interface ChatTimelineV2State {
  messageLoadingState: MessageLoadingState | null;
  nearBottom: boolean;
  showScrollButton: boolean;
}

// Snapshot returned from getSnapshotBeforeUpdate
type Snapshot =
  | null
  | { type: 'scrollBottom'; value: number }
  | { type: 'scrollTop'; value: number };

// ── LocalStorage Helpers ──────────────────────────────────────────────────────

const STORAGE_PREFIX = 'chat_scroll_v8_';

function loadScrollPosition(chatId: string): Snapshot | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${chatId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveScrollPosition(chatId: string, snapshot: Snapshot): void {
  try {
    if (!snapshot) return;
    localStorage.setItem(`${STORAGE_PREFIX}${chatId}`, JSON.stringify(snapshot));
  } catch {
    // quota exceeded
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export class ChatTimelineV2 extends Component<
  ChatTimelineV2Props,
  ChatTimelineV2State,
  Snapshot
> {
  static defaultProps = { hasPinnedMessage: false };

  containerRef = createRef<HTMLDivElement>();

  state: ChatTimelineV2State = {
    messageLoadingState: null,
    nearBottom: true,
    showScrollButton: false,
  };

  // ── Drag-select state ────────────────────────────────────────────────────
  private _dragStart: { x: number; y: number } | null = null;
  private _dragCurrent: { x: number; y: number } | null = null;
  private _isDragging = false;
  private _selectionRectEl: HTMLDivElement | null = null;

  private _prevMessagesLength = 0;
  private _prevChatId = '';
  private _saveScrollTimeout: NodeJS.Timeout | null = null;
  private _justRestoredPosition = false;
  private _isMounted = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  componentDidMount(): void {
    this._isMounted = true;
    this.containerRef.current?.addEventListener('scroll', this._onScroll);
    this.containerRef.current?.addEventListener('mousedown', this._onDragDown);
    window.addEventListener('mousemove', this._onDragMove);
    window.addEventListener('mouseup', this._onDragUp);
    this._prevChatId = this.props.chatId;
    this._prevMessagesLength = this.props.messages.length;
    
    const container = this.containerRef.current;
    if (!container) return;
    
    // If we have messages on mount - restore saved position immediately
    if (this.props.messages.length > 0) {
      const saved = loadScrollPosition(this.props.chatId);
      console.log(`[ChatTimelineV2] componentDidMount for ${this.props.chatId}, saved:`, saved);
      
      this._justRestoredPosition = true;
      
      if (saved && saved.type === 'scrollBottom' && saved.value > 0) {
        setScrollBottom(container, saved.value);
        console.log(`[ChatTimelineV2] ✓ Restored scrollBottom=${saved.value} on mount`);
      } else {
        scrollToBottom(container);
        console.log(`[ChatTimelineV2] ✓ Scrolled to bottom on mount (no saved position)`);
      }
      
      // Clear flag after brief delay
      setTimeout(() => {
        this._justRestoredPosition = false;
      }, 500);
    } else {
      // No messages yet - set loading state
      this.setState({ messageLoadingState: MessageLoadingState.DoingInitialLoad });
    }
  }

  componentWillUnmount(): void {
    this._isMounted = false;
    
    // Cancel any pending save
    if (this._saveScrollTimeout) {
      clearTimeout(this._saveScrollTimeout);
      this._saveScrollTimeout = null;
    }
    
    // Save current position before unmounting
    const container = this.containerRef.current;
    if (container && this.props.messages.length > 0) {
      const scrollBottom = isAtBottom(container) ? 0 : getScrollBottom(container);
      console.log(`[ChatTimelineV2] componentWillUnmount - saving scrollBottom=${scrollBottom} for ${this.props.chatId}`);
      saveScrollPosition(this.props.chatId, { type: 'scrollBottom', value: scrollBottom });
    }
    
    // Remove listeners
    this.containerRef.current?.removeEventListener('scroll', this._onScroll);
    this.containerRef.current?.removeEventListener('mousedown', this._onDragDown);
    window.removeEventListener('mousemove', this._onDragMove);
    window.removeEventListener('mouseup', this._onDragUp);
    this._cancelDrag();
  }

  getSnapshotBeforeUpdate(prevProps: Readonly<ChatTimelineV2Props>): Snapshot {
    const container = this.containerRef.current;
    if (!container) return null;

    // If chat is changing, save current position and return null
    // (new position will be restored in componentDidMount on remount)
    if (prevProps.chatId !== this.props.chatId) {
      if (prevProps.messages.length > 0) {
        const scrollBottom = isAtBottom(container) ? 0 : getScrollBottom(container);
        console.log(`[ChatTimelineV2] Chat changing, saving old position: scrollBottom=${scrollBottom}`);
        saveScrollPosition(prevProps.chatId, { type: 'scrollBottom', value: scrollBottom });
      }
      return null;
    }

    // Check if initial load just finished
    const loadingJustFinished =
      this.state.messageLoadingState === MessageLoadingState.DoingInitialLoad &&
      this.props.messages.length > 0;

    if (loadingJustFinished) {
      // Load and return saved position
      const saved = loadScrollPosition(this.props.chatId);
      console.log(`[ChatTimelineV2] Loading finished, restoring position:`, saved);
      
      if (saved && saved.type === 'scrollBottom' && saved.value > 0) {
        return saved;
      }
      // Default to bottom
      return { type: 'scrollBottom', value: 0 };
    }

    // For all other updates, use standard scroll anchor logic
    const scrollAnchor = getScrollAnchorBeforeUpdate(
      {
        messageLoadingState: this.state.messageLoadingState,
        messagesLength: this._prevMessagesLength,
        isAtBottom: isAtBottom(container),
      },
      {
        messageLoadingState: this.state.messageLoadingState,
        messagesLength: this.props.messages.length,
        isAtBottom: isAtBottom(container),
      }
    );

    this._prevMessagesLength = this.props.messages.length;

    switch (scrollAnchor) {
      case ScrollAnchor.ChangeNothing:
        return null;
      case ScrollAnchor.ScrollToBottom:
        return { type: 'scrollBottom', value: 0 };
      case ScrollAnchor.Top:
        return { type: 'scrollTop', value: container.scrollTop };
      case ScrollAnchor.Bottom:
        return { type: 'scrollBottom', value: getScrollBottom(container) };
      default:
        return null;
    }
  }

  componentDidUpdate(
    prevProps: Readonly<ChatTimelineV2Props>,
    prevState: Readonly<ChatTimelineV2State>,
    snapshot: Readonly<Snapshot>
  ): void {
    const container = this.containerRef.current;
    if (!container) return;

    // Apply snapshot (restore scroll position after DOM update)
    if (snapshot) {
      this._justRestoredPosition = true;
      
      if (snapshot.type === 'scrollBottom') {
        setScrollBottom(container, snapshot.value);
        console.log(`[ChatTimelineV2] Applied snapshot scrollBottom=${snapshot.value}`);
      } else if (snapshot.type === 'scrollTop') {
        container.scrollTop = snapshot.value;
        console.log(`[ChatTimelineV2] Applied snapshot scrollTop=${snapshot.value}`);
      }
      
      // Clear flag after brief delay
      setTimeout(() => {
        this._justRestoredPosition = false;
      }, 500);
    }

    // Handle chat change - reset state
    if (prevProps.chatId !== this.props.chatId) {
      console.log(`[ChatTimelineV2] Chat changed to ${this.props.chatId}`);
      this._prevMessagesLength = this.props.messages.length;
      this._prevChatId = this.props.chatId;
      return;
    }

    // Clear loading state when messages arrive
    if (
      prevState.messageLoadingState === MessageLoadingState.DoingInitialLoad &&
      this.props.messages.length > 0
    ) {
      console.log(`[ChatTimelineV2] Initial load finished with ${this.props.messages.length} messages`);
      this.setState({ messageLoadingState: null });
      return;
    }

    // Update nearBottom state
    this._updateNearBottomState();
  }

  // ── Private Methods ───────────────────────────────────────────────────────

  private _onScroll = (): void => {
    this._updateNearBottomState();
    
    // Don't save if we just restored position (prevents overwriting on restoration scroll event)
    if (this._justRestoredPosition) {
      console.log(`[ChatTimelineV2] onScroll ignored for ${this.props.chatId} - just restored position`);
      return;
    }
    
    // Debounced save scroll position (save after 500ms of no scrolling)
    if (this._saveScrollTimeout) {
      clearTimeout(this._saveScrollTimeout);
    }
    this._saveScrollTimeout = setTimeout(() => {
      // Check if still mounted (prevents saving after unmount)
      if (!this._isMounted) {
        console.log(`[ChatTimelineV2] onScroll callback ignored - component unmounted for ${this.props.chatId}`);
        return;
      }
      
      const container = this.containerRef.current;
      if (container && this.props.messages.length > 0) {
        const scrollBottom = isAtBottom(container) ? 0 : getScrollBottom(container);
        
        // Don't save if at bottom (this is default behavior, don't overwrite saved position)
        if (scrollBottom === 0) {
          console.log(`[ChatTimelineV2] onScroll for ${this.props.chatId}: at bottom, not saving`);
          return;
        }
        
        console.log(`[ChatTimelineV2] onScroll save for ${this.props.chatId}: scrollBottom=${scrollBottom}`);
        saveScrollPosition(this.props.chatId, { type: 'scrollBottom', value: scrollBottom });
      }
    }, 500);
  };

  private _updateNearBottomState(): void {
    const container = this.containerRef.current;
    if (!container) return;

    const wasNearBottom = this.state.nearBottom;
    const nowNearBottom = isAtBottom(container);
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const nowShowScrollButton = distFromBottom > 1.5 * container.clientHeight;

    const stateChanged =
      wasNearBottom !== nowNearBottom ||
      nowShowScrollButton !== this.state.showScrollButton;

    if (stateChanged) {
      this.setState({ nearBottom: nowNearBottom, showScrollButton: nowShowScrollButton });
      if (wasNearBottom !== nowNearBottom) {
        this.props.onNearBottomChange?.(nowNearBottom);
      }
    }
  }

  private _scrollToBottomClick = (): void => {
    const container = this.containerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  // ── Public API ────────────────────────────────────────────────────────────

  saveScrollPosition = (): void => {
    const container = this.containerRef.current;
    if (container && this.props.messages.length > 0) {
      const scrollBottom = isAtBottom(container) ? 0 : getScrollBottom(container);
      saveScrollPosition(this.props.chatId, { type: 'scrollBottom', value: scrollBottom });
    }
  };

  // ── Drag-select helpers ───────────────────────────────────────────────────

  private _onDragDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, [role="button"], [contenteditable]')) return;
    this._dragStart = { x: e.clientX, y: e.clientY };
    this._dragCurrent = { x: e.clientX, y: e.clientY };
    this._isDragging = false;
  };

  private _onDragMove = (e: MouseEvent): void => {
    if (!this._dragStart) return;
    this._dragCurrent = { x: e.clientX, y: e.clientY };
    const dx = Math.abs(this._dragCurrent.x - this._dragStart.x);
    const dy = Math.abs(this._dragCurrent.y - this._dragStart.y);
    if (dx > 8 || dy > 8) {
      this._isDragging = true;
      this._updateDragRect();
    }
  };

  private _onDragUp = (): void => {
    if (this._isDragging) {
      this._selectMessagesInRect();
      // Keep _isDragging=true briefly so onClick handlers see it and skip
      setTimeout(() => { this._isDragging = false; }, 50);
    } else {
      this._isDragging = false;
    }
    this._dragStart = null;
    this._dragCurrent = null;
    this._removeDragRect();
  };

  private _updateDragRect(): void {
    if (!this._dragStart || !this._dragCurrent) return;
    const r = this._getDragRect();
    if (!this._selectionRectEl) {
      const el = document.createElement('div');
      Object.assign(el.style, {
        position: 'fixed',
        pointerEvents: 'none',
        border: '1.5px solid rgba(59,130,246,0.75)',
        background: 'rgba(59,130,246,0.08)',
        borderRadius: '3px',
        zIndex: '9999',
      });
      document.body.appendChild(el);
      this._selectionRectEl = el;
    }
    Object.assign(this._selectionRectEl.style, {
      left: `${r.x}px`, top: `${r.y}px`,
      width: `${r.w}px`, height: `${r.h}px`,
      display: 'block',
    });
  }

  private _removeDragRect(): void {
    if (this._selectionRectEl) {
      this._selectionRectEl.remove();
      this._selectionRectEl = null;
    }
  }

  private _cancelDrag(): void {
    this._dragStart = null;
    this._dragCurrent = null;
    this._isDragging = false;
    this._removeDragRect();
  }

  private _getDragRect(): { x: number; y: number; w: number; h: number } {
    const s = this._dragStart!;
    const c = this._dragCurrent!;
    return {
      x: Math.min(s.x, c.x), y: Math.min(s.y, c.y),
      w: Math.abs(c.x - s.x), h: Math.abs(c.y - s.y),
    };
  }

  private _selectMessagesInRect(): void {
    const r = this._getDragRect();
    if (r.w < 4 && r.h < 4) return;
    const selected = new Set<string>();
    for (const [id, el] of Object.entries(this.props.messageRefs.current)) {
      if (!el) continue;
      const er = el.getBoundingClientRect();
      if (er.left < r.x + r.w && er.right > r.x && er.top < r.y + r.h && er.bottom > r.y) {
        selected.add(id);
      }
    }
    if (selected.size > 0) {
      this.props.setIsSelectionMode(true);
      this.props.setSelectedMessages(selected);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    const {
      messages,
      users,
      currentUser,
    } = this.props;

    const isEmpty = messages.length === 0;

    return (
      <>
        <div
          ref={this.containerRef}
          className="absolute inset-0 overflow-y-auto scrollbar-hide"
          style={{
            overflowAnchor: 'auto',
            scrollBehavior: 'auto',
          }}
        >
        <div
          className="px-4 space-y-0.5"
          style={{
            paddingTop: this.props.scrollTopPadding ? `${this.props.scrollTopPadding + 16}px` : '16px',
            paddingBottom: this.props.scrollBottomPadding ? `${this.props.scrollBottomPadding}px` : '16px',
          }}
        >
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
              <div className="text-4xl mb-4">💬</div>
              <p>Нет сообщений</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const author = users.find(u => u.id === message.authorId);
              const isMyMessage = currentUser?.id === message.authorId;
              const prevMessage = messages[index - 1];
              const nextMessage = messages[index + 1];
              const isGroupedWithPrev = !!prevMessage && prevMessage.authorId === message.authorId;
              const isGroupedWithNext = !!nextMessage && nextMessage.authorId === message.authorId;
              const isLastInGroup = !isGroupedWithNext;
              const showTail = isLastInGroup;
              const showAvatar = this.props.isDesktopView && !isMyMessage && author && isLastInGroup;
              const isMultiline = String(message.content || '').includes('\n');
              // Attachment classification
              const msgAtts: any[] = (message.attachments as any[]) || [];
              const msgImages = msgAtts.filter((a: any) => a.type === 'image');
              const msgVideos = msgAtts.filter((a: any) => a.type === 'video');
              const msgFiles  = msgAtts.filter((a: any) => a.type !== 'image' && a.type !== 'video');
              const hasTextContent = !!message.content?.trim();
              const hasMedia = msgImages.length > 0 || msgVideos.length > 0;
              // Media-only: images/video, no text, no files, no quote → Telegram-style overlay timestamp
              const isMediaOnly = hasMedia && !hasTextContent && !msgFiles.length && !message.replyToId;
              const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
              const allImgUrls = msgImages.map((mi: any) => mi.url);
              const openImg = (url: string, allUrls: string[]) => {
                const w = window as any;
                if (w.sharDesktop?.photo?.open) { w.sharDesktop.photo.open(url, allUrls); }
                else { this.props.setCurrentImageUrl(url); this.props.setShowImageModal(true); }
              };
              const currentDateKey = new Date(message.createdAt).toDateString();
              const prevDateKey = prevMessage ? new Date(prevMessage.createdAt).toDateString() : null;
              const showDateDivider = !prevMessage || currentDateKey !== prevDateKey;
              const dateLabel = (() => {
                const messageDate = new Date(message.createdAt);
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                const isCurrentYear = messageDate.getFullYear() === today.getFullYear();
                if (messageDate.toDateString() === today.toDateString()) return 'Сегодня';
                if (messageDate.toDateString() === yesterday.toDateString()) return 'Вчера';
                return messageDate.toLocaleDateString('ru-RU', isCurrentYear
                  ? { day: '2-digit', month: 'long' }
                  : { day: '2-digit', month: 'long', year: 'numeric' }
                );
              })();
              const isPending = String(message.id).startsWith('temp_');
              const isReadByOther = (() => {
                if (!isMyMessage || !currentUser || !this.props.selectedChat?.readMessagesByUser) {
                  return false;
                }
                const createdAtMs = new Date(message.createdAt).getTime();
                return (this.props.selectedChat.participantIds || [])
                  .filter(pid => String(pid) !== String(currentUser.id))
                  .some(pid => {
                    const lastRead = this.props.selectedChat.readMessagesByUser?.[String(pid)];
                    if (!lastRead) return false;
                    const lastReadMs = new Date(lastRead).getTime();
                    if (!isNaN(lastReadMs)) return lastReadMs >= createdAtMs;
                    // lastRead is a message UUID — find the message and compare its createdAt
                    const readMsg = this.props.messages.find((m: Message) => String(m.id) === lastRead);
                    return !!readMsg && new Date(readMsg.createdAt).getTime() >= createdAtMs;
                  });
              })();
              
              const { chatSettings } = this.props;
              
              // Определяем цвета пузырей из настроек
              let bubbleColor: string;
              let textColor: string;
              
              if (isMyMessage) {
                bubbleColor = this.props.theme === 'dark' 
                  ? (chatSettings?.bubbleColor || '#545190')
                  : (chatSettings?.bubbleColorLight || '#252546');
                textColor = this.props.theme === 'dark'
                  ? (chatSettings?.bubbleTextColor || '#ffffff')
                  : (chatSettings?.bubbleTextColorLight || '#ffffff');
              } else {
                bubbleColor = this.props.theme === 'dark'
                  ? (chatSettings?.bubbleColorOpponent || '#38414d')
                  : (chatSettings?.bubbleColorOpponentLight || '#e5e7eb');
                textColor = this.props.theme === 'dark' ? '#ffffff' : '#1f2937';
              }
              
              // Telegram-like behavior:
              // - bubble width is fixed by min/max constraints (no adaptive % scaling)
              // - at chat width <= 1200px, messages are split by sides
              // - at wider desktop widths, all messages stay on the left
              const alignment = isMyMessage
                ? (this.props.isDesktopView ? 'justify-start max-[1200px]:justify-end' : 'justify-end')
                : 'justify-start';
              
              return (
                <React.Fragment key={message.id}>
                  {showDateDivider && (
                    <div className="flex justify-center my-3">
                      <span className="px-3 py-1 rounded-full bg-white/70 dark:bg-slate-800/70 border border-gray-200 dark:border-gray-700 text-[11px] text-gray-600 dark:text-gray-300">
                        {dateLabel}
                      </span>
                    </div>
                  )}
                  {/* Show pinned message action (like date divider) */}
                  {message.metadata?.isPinned && message.metadata?.pinnedBy && (
                    <PinnedMessageAction pinnerName={message.metadata.pinnedBy} />
                  )}
                  <div
                    ref={(el) => {
                      this.props.messageRefs.current[message.id] = el;
                    }}
                    className={`flex items-end ${alignment} ${isGroupedWithNext ? 'mb-[2px]' : 'mb-[6px]'} ${isGroupedWithPrev ? 'mt-[2px]' : 'mt-[6px]'} gap-2 cursor-pointer`}
                    onClick={() => {
                      // Skip click if this was the end of a drag-select gesture
                      if (this._isDragging) return;
                      // В режиме выделения - одинарный клик переключает выделение
                      if (this.props.isSelectionMode) {
                        const messageId = String(message.id);
                        this.props.setSelectedMessages(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(messageId)) {
                            newSet.delete(messageId);
                          } else {
                            newSet.add(messageId);
                          }
                          return newSet;
                        });
                      }
                    }}
                    onDoubleClick={() => {
                      // Двойной клик включает режим выделения (если еще не включен)
                      if (!this.props.isSelectionMode) {
                        const messageId = String(message.id);
                        this.props.setIsSelectionMode(true);
                        this.props.setSelectedMessages(new Set([messageId]));
                      }
                    }}
                  >
                  {/* Чекбокс в режиме выделения */}
                  {this.props.isSelectionMode && (
                    <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        this.props.selectedMessages.has(String(message.id))
                          ? 'bg-blue-500'
                          : 'border-2 border-gray-400 dark:border-gray-500'
                      }`}>
                        {this.props.selectedMessages.has(String(message.id)) && (
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                        )}
                      </div>
                    </div>
                  )}
                  {/* В desktop входящие сообщения группируются под одну аватарку (у последнего сообщения группы). */}
                  {this.props.isDesktopView && !isMyMessage && !this.props.isSelectionMode && (
                    <div className="flex-shrink-0 w-7 h-7 flex items-end justify-center">
                      {showAvatar && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                          {(() => {
                            const name = author?.name || author?.username || 'U';
                            const words = name.trim().split(/\s+/);
                            return words.length >= 2 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`inline-block relative rounded-[18px] ${isMediaOnly ? 'overflow-hidden' : 'px-2.5 py-1.5 pb-1.5 min-w-[100px]'} max-w-[420px] w-fit transition-all ${
                      this.props.selectedMessages.has(String(message.id)) 
                        ? 'ring-2 ring-blue-500 ring-opacity-50' 
                        : ''
                    }`}
                    onContextMenu={(e) => {
                      if (!this.props.isSelectionMode) {
                        e.preventDefault();
                        this.props.setContextMenuMessage(message);
                        this.props.setContextMenuPosition({ top: e.clientY, left: e.clientX });
                        this.props.setShowMessageContextMenu(true);
                      }
                    }}
                    style={{
                      fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
                      backgroundColor: bubbleColor,
                      color: textColor
                    }}
                  >
                    {isMediaOnly ? (
                      /* ── Telegram-style: media fills the bubble, timestamp overlays ── */
                      <div className="relative">
                        {/* Sender name pill overlay (non-desktop incoming) */}
                        {!isMyMessage && author && !this.props.isDesktopView && (
                          <div
                            className="absolute top-1.5 left-1.5 z-10 bg-black/50 backdrop-blur-[2px] text-white rounded-full px-2 py-0.5 font-semibold pointer-events-none"
                            style={{ fontSize: '12px', lineHeight: '18px' }}
                          >
                            {author.name || author.username}
                          </div>
                        )}

                        {/* ── Image grid (Signal-style layouts) ── */}
                        {msgImages.length === 1 && (
                          <LazyImage
                            src={msgImages[0].url}
                            alt={msgImages[0].name || 'image'}
                            className="w-full block object-cover cursor-zoom-in"
                            style={{ maxHeight: 320, minHeight: 80, display: 'block' }}
                            onClick={(e) => { e.stopPropagation(); openImg(msgImages[0].url, allImgUrls); }}
                          />
                        )}

                        {msgImages.length === 2 && (
                          <div style={{ display: 'flex', gap: 2, height: 200 }}>
                            {msgImages.map((img: any, i: number) => (
                              <div key={img.url + i} style={{ flex: 1, overflow: 'hidden' }}>
                                <LazyImage
                                  src={img.url} alt={img.name || 'image'}
                                  className="w-full h-full object-cover block cursor-zoom-in"
                                  onClick={(e) => { e.stopPropagation(); openImg(img.url, allImgUrls); }}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {msgImages.length === 3 && (
                          <div style={{ display: 'flex', gap: 2, height: 210 }}>
                            <div style={{ flex: 2, overflow: 'hidden' }}>
                              <LazyImage
                                src={msgImages[0].url} alt={msgImages[0].name || 'image'}
                                className="w-full h-full object-cover block cursor-zoom-in"
                                onClick={(e) => { e.stopPropagation(); openImg(msgImages[0].url, allImgUrls); }}
                              />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {msgImages.slice(1).map((img: any, i: number) => (
                                <div key={img.url + i} style={{ flex: 1, overflow: 'hidden' }}>
                                  <LazyImage
                                    src={img.url} alt={img.name || 'image'}
                                    className="w-full h-full object-cover block cursor-zoom-in"
                                    onClick={(e) => { e.stopPropagation(); openImg(img.url, allImgUrls); }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {msgImages.length === 4 && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            {msgImages.map((img: any, i: number) => (
                              <div key={img.url + i} style={{ height: 150, overflow: 'hidden' }}>
                                <LazyImage
                                  src={img.url} alt={img.name || 'image'}
                                  className="w-full h-full object-cover block cursor-zoom-in"
                                  onClick={(e) => { e.stopPropagation(); openImg(img.url, allImgUrls); }}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {msgImages.length >= 5 && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            {msgImages.slice(0, 4).map((img: any, i: number) => (
                              <div key={img.url + i} style={{ height: 150, overflow: 'hidden', position: 'relative' }}>
                                <LazyImage
                                  src={img.url} alt={img.name || 'image'}
                                  className="w-full h-full object-cover block cursor-zoom-in"
                                  onClick={(e) => { e.stopPropagation(); openImg(img.url, allImgUrls); }}
                                />
                                {i === 3 && (
                                  <div
                                    className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-bold pointer-events-none"
                                    style={{ fontSize: 22 }}
                                  >
                                    +{msgImages.length - 4}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Video (media-only) */}
                        {msgVideos.map((vid: any, i: number) => (
                          <div key={vid.url + i} onClick={(e) => e.stopPropagation()}>
                            <video src={vid.url} controls className="w-full block bg-black" style={{ maxHeight: 300 }} />
                          </div>
                        ))}

                        {/* ── Telegram-style timestamp overlay ── */}
                        <div
                          className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-[3px] bg-black/50 backdrop-blur-[2px] text-white rounded-full px-1.5 py-0.5 select-none pointer-events-none"
                          style={{ fontSize: '11px', lineHeight: '16px', letterSpacing: '0.06px' }}
                        >
                          <span>{new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMyMessage && (
                            isPending ? (
                              <Clock3 className="w-[11px] h-[11px]" strokeWidth={2} />
                            ) : isReadByOther ? (
                              <CheckCheck className="w-[12px] h-[12px] text-sky-300" strokeWidth={2} />
                            ) : (
                              <Check className="w-[11px] h-[11px]" strokeWidth={2} />
                            )
                          )}
                        </div>
                      </div>
                    ) : (
                      /* ── Normal bubble layout (text / files / media+text) ── */
                      <>
                        {/* Sender name */}
                        {!isMyMessage && author && !this.props.isDesktopView && (
                          <div
                            className="font-semibold mb-[3px]"
                            style={{ fontSize: '13px', lineHeight: '18px', letterSpacing: '-0.03px', opacity: 0.7 }}
                          >
                            {author.name || author.username}
                          </div>
                        )}

                        {/* Quote */}
                        {message.replyToId && (
                          <Quote
                            replyMessage={messages.find(m => m.id === message.replyToId) || null}
                            onJumpToMessage={this.props.scrollToMessage}
                            isIncoming={!isMyMessage}
                          />
                        )}

                        {/* Image grid (when there's also text/files below) */}
                        {msgImages.length > 0 && (
                          <div
                            className="-mx-2.5 overflow-hidden mb-1"
                            style={{ marginTop: message.replyToId ? '6px' : '-6px', borderRadius: (hasTextContent || msgFiles.length > 0) ? '14px 14px 0 0' : '14px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {msgImages.length === 1 && (
                              <LazyImage
                                src={msgImages[0].url} alt={msgImages[0].name || 'image'}
                                className="w-full max-h-[280px] object-cover block cursor-zoom-in"
                                onClick={(e) => { e.stopPropagation(); openImg(msgImages[0].url, allImgUrls); }}
                              />
                            )}
                            {msgImages.length === 2 && (
                              <div style={{ display: 'flex', gap: 2, height: 180 }}>
                                {msgImages.map((img: any, i: number) => (
                                  <div key={img.url + i} style={{ flex: 1, overflow: 'hidden' }}>
                                    <LazyImage src={img.url} alt={img.name || 'image'} className="w-full h-full object-cover block cursor-zoom-in"
                                      onClick={(e) => { e.stopPropagation(); openImg(img.url, allImgUrls); }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            {msgImages.length === 3 && (
                              <div style={{ display: 'flex', gap: 2, height: 190 }}>
                                <div style={{ flex: 2, overflow: 'hidden' }}>
                                  <LazyImage src={msgImages[0].url} alt="" className="w-full h-full object-cover block cursor-zoom-in"
                                    onClick={(e) => { e.stopPropagation(); openImg(msgImages[0].url, allImgUrls); }}
                                  />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {msgImages.slice(1).map((img: any, i: number) => (
                                    <div key={img.url + i} style={{ flex: 1, overflow: 'hidden' }}>
                                      <LazyImage src={img.url} alt="" className="w-full h-full object-cover block cursor-zoom-in"
                                        onClick={(e) => { e.stopPropagation(); openImg(img.url, allImgUrls); }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {msgImages.length >= 4 && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                {msgImages.slice(0, 4).map((img: any, i: number) => (
                                  <div key={img.url + i} style={{ height: 130, overflow: 'hidden', position: 'relative' }}>
                                    <LazyImage src={img.url} alt="" className="w-full h-full object-cover block cursor-zoom-in"
                                      onClick={(e) => { e.stopPropagation(); openImg(img.url, allImgUrls); }}
                                    />
                                    {i === 3 && msgImages.length > 4 && (
                                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-bold pointer-events-none" style={{ fontSize: 20 }}>
                                        +{msgImages.length - 4}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Video (non-media-only) */}
                        {msgVideos.map((vid: any, i: number) => (
                          <div key={vid.url + i} className="-mx-2.5 overflow-hidden mb-1" style={{ marginTop: '-6px', borderRadius: '14px' }} onClick={(e) => e.stopPropagation()}>
                            <video src={vid.url} controls className="w-full max-h-[280px] bg-black block" />
                          </div>
                        ))}

                        {/* Text */}
                        {hasTextContent ? (
                          <div
                            className="whitespace-pre-wrap break-words overflow-wrap-anywhere pr-[44px]"
                            style={{ fontSize: '14px', lineHeight: '20px', letterSpacing: '-0.08px' }}
                          >
                            <span>{renderTextWithLinks(message.content || '')}</span>
                          </div>
                        ) : (
                          <div className="pr-[44px] h-[1px]" />
                        )}

                        {/* Files */}
                        {msgFiles.length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            {msgFiles.map((att: any) => (
                              <a
                                key={att.url}
                                href={att.url}
                                download={att.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/15 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FileText className="w-4 h-4 flex-shrink-0 opacity-70" />
                                <span className="text-[12px] truncate flex-1">{att.name || 'Файл'}</span>
                                {att.size ? <span className="text-[11px] opacity-50 flex-shrink-0">{fmtSize(att.size)}</span> : null}
                                <Download className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Inline timestamp */}
                        <span
                          className={`absolute right-2 inline-flex items-center gap-1 select-none whitespace-nowrap ${isMultiline ? 'bottom-2' : 'bottom-1'}`}
                          style={{ fontSize: '11px', lineHeight: '14px', letterSpacing: '0.06px', opacity: 0.6 }}
                        >
                          <span>{new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMyMessage && (
                            isPending ? (
                              <Clock3 className="w-[12px] h-[12px]" strokeWidth={2} />
                            ) : isReadByOther ? (
                              <CheckCheck className="w-[13px] h-[13px] text-sky-300" strokeWidth={2} />
                            ) : (
                              <Check className="w-[12px] h-[12px]" strokeWidth={2} />
                            )
                          )}
                        </span>
                      </>
                    )}

                    {/* Tail (always) */}
                    {showTail && (
                      <span className={`absolute bottom-[4px] ${isMyMessage ? '-right-[2px]' : '-left-[2px]'}`} aria-hidden="true">
                        <svg width="10" height="16" viewBox="0 0 10 16" className={isMyMessage ? '' : 'scale-x-[-1]'} style={{ display: 'block' }}>
                          <path d="M0 0C0 8 1 12 9.5 16H0V0Z" fill={bubbleColor} />
                        </svg>
                      </span>
                    )}
                  </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
        {this.state.showScrollButton && (
          <button
            aria-label="Прокрутить вниз"
            onClick={this._scrollToBottomClick}
            style={{
              position: 'absolute',
              bottom: `${(this.props.scrollBottomPadding ?? 67) + 14}px`,
              right: '20px',
              zIndex: 20,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)',
              transition: 'opacity 0.2s ease, transform 0.15s ease',
              padding: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </>
    );
  }
}
