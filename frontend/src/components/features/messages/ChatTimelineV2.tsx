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
import { ArrowRight, Bell, Calendar, Check, CheckCheck, CheckSquare, Clock3, Phone, PhoneIncoming, PhoneMissed, PhoneOff, Video } from 'lucide-react';
import MessageItem from './MessageItem';
import Quote from './Quote';
import FileAttachment from './FileAttachment';
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

function renderTextWithLinksAndHighlight(text: string, searchQuery: string, isActiveMatch: boolean): React.ReactNode {
  if (!text) return null;
  if (!searchQuery) return renderTextWithLinks(text);

  const query = searchQuery.toLowerCase();
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const lowerRemaining = remaining.toLowerCase();
    const matchIdx = lowerRemaining.indexOf(query);
    if (matchIdx === -1) {
      parts.push(<React.Fragment key={keyIdx++}>{renderTextWithLinks(remaining)}</React.Fragment>);
      break;
    }
    if (matchIdx > 0) {
      parts.push(<React.Fragment key={keyIdx++}>{renderTextWithLinks(remaining.slice(0, matchIdx))}</React.Fragment>);
    }
    const matchedText = remaining.slice(matchIdx, matchIdx + query.length);
    parts.push(
      <mark
        key={keyIdx++}
        style={{
          backgroundColor: isActiveMatch ? 'rgba(255, 180, 0, 0.85)' : 'rgba(255, 230, 80, 0.6)',
          color: 'inherit',
          borderRadius: '2px',
          padding: '0 1px',
        }}
      >{matchedText}</mark>
    );
    remaining = remaining.slice(matchIdx + query.length);
  }

  return <>{parts}</>;
}

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

function normalizeMediaUrl(rawUrl: unknown): string {
  const input = String(rawUrl || '').trim();
  if (!input) return '';

  const uploadMatch = input.match(/\/api\/uploads\/([^?#]+)/i);
  if (uploadMatch?.[1]) {
    try {
      const decoded = decodeURIComponent(uploadMatch[1]);
      return `/api/uploads/${encodeURIComponent(decoded)}`;
    } catch {
      return `/api/uploads/${uploadMatch[1]}`;
    }
  }

  if (input.startsWith('/api/uploads/')) {
    return input.replace(/[?#].*$/, '');
  }

  return input;
}

function getDiceBearAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

// ── Lazy image with Telegram-style fade-in effect + in-memory cache ───────────
const imgLoadedCache = new Set<string>();
const IMG_CACHE_STORAGE_KEY = 'chat_timeline_loaded_images_v1';
let isImgCacheHydrated = false;

function hydrateImgLoadedCache() {
  if (isImgCacheHydrated || typeof window === 'undefined') return;
  isImgCacheHydrated = true;
  try {
    const raw = window.sessionStorage.getItem(IMG_CACHE_STORAGE_KEY);
    if (!raw) return;
    const urls = JSON.parse(raw) as string[];
    urls.forEach(url => {
      if (typeof url === 'string' && url) {
        imgLoadedCache.add(url);
      }
    });
  } catch {
    // ignore session storage parsing errors
  }
}

function persistImgLoadedCache() {
  if (typeof window === 'undefined') return;
  try {
    const entries = Array.from(imgLoadedCache).slice(-500);
    window.sessionStorage.setItem(IMG_CACHE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore session storage quota errors
  }
}

const EMOJI_ONLY_REGEX = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\uFE0F|\u200D|\s)+$/u;

function getEmojiOnlyCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  if (!EMOJI_ONLY_REGEX.test(trimmed)) return 0;
  return (trimmed.match(/\p{Extended_Pictographic}/gu) || []).length;
}

function LazyImage({
  src,
  alt,
  className,
  style,
  width,
  height,
  eager,
  onClick,
  onImageLoaded,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  eager?: boolean;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  onImageLoaded?: () => void;
}) {
  const [loaded, setLoaded] = React.useState(() => {
    hydrateImgLoadedCache();
    return imgLoadedCache.has(src);
  });
  const [failed, setFailed] = React.useState(false);
  const shouldUseAspectRatio = !style?.height;
  const resolvedAspectRatio = width && height && width > 0 && height > 0
    ? `${width} / ${height}`
    : '4 / 3';
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        ...(shouldUseAspectRatio ? { aspectRatio: resolvedAspectRatio } : {}),
        ...style,
      }}
    >
      {!loaded && !failed && (
        <div className="absolute inset-0 bg-slate-300/75 dark:bg-slate-700/75">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/25 dark:via-white/10 to-transparent" />
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-200/85 text-slate-700 dark:bg-slate-800/85 dark:text-slate-300">
          <span className="text-lg leading-none">!</span>
          <span className="px-2 text-[11px] font-medium text-center">Файл недоступен</span>
        </div>
      )}
      <img
        src={src}
        alt={alt || ''}
        className={className}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          opacity: loaded && !failed ? 1 : 0,
          transition: loaded ? 'opacity 0.3s ease' : 'none',
        }}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => {
          setFailed(false);
          imgLoadedCache.add(src);
          persistImgLoadedCache();
          setLoaded(true);
          if (onImageLoaded) {
            requestAnimationFrame(() => onImageLoaded());
          }
        }}
        onError={() => {
          setFailed(true);
          setLoaded(false);
        }}
        onClick={onClick}
      />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatTimelineV2Props {
  chatId: string;
  messages: Message[];
  messageSearchQuery: string;
  activeSearchMessageId?: string;
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
  enableDragSelect?: boolean;
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
  static defaultProps = { hasPinnedMessage: false, enableDragSelect: true };

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
  private _savedScrollBottomBeforeImageLoad: number | null = null;

  shouldComponentUpdate(
    nextProps: Readonly<ChatTimelineV2Props>,
    nextState: Readonly<ChatTimelineV2State>
  ): boolean {
    if (nextState.messageLoadingState !== this.state.messageLoadingState) return true;
    if (nextState.nearBottom !== this.state.nearBottom) return true;
    if (nextState.showScrollButton !== this.state.showScrollButton) return true;

    if (nextProps.chatId !== this.props.chatId) return true;
    if (nextProps.messages !== this.props.messages) return true;
    if (nextProps.messageSearchQuery !== this.props.messageSearchQuery) return true;
    if ((nextProps.activeSearchMessageId ?? null) !== (this.props.activeSearchMessageId ?? null)) return true;
    if (nextProps.users !== this.props.users) return true;
    if ((nextProps.currentUser?.id ?? null) !== (this.props.currentUser?.id ?? null)) return true;
    if (
      nextProps.selectedChat.id !== this.props.selectedChat.id
      || nextProps.selectedChat.title !== this.props.selectedChat.title
      || Boolean((nextProps.selectedChat as any).isGroup) !== Boolean((this.props.selectedChat as any).isGroup)
    ) return true;
    if (nextProps.selectedMessages !== this.props.selectedMessages) return true;
    if (nextProps.editingMessageId !== this.props.editingMessageId) return true;
    if (nextProps.isSelectionMode !== this.props.isSelectionMode) return true;
    if (nextProps.theme !== this.props.theme) return true;
    if (nextProps.chatSettings !== this.props.chatSettings) return true;
    if (nextProps.isDesktopView !== this.props.isDesktopView) return true;
    if (nextProps.myBubbleTextClass !== this.props.myBubbleTextClass) return true;
    if (nextProps.useDarkTextOnBubble !== this.props.useDarkTextOnBubble) return true;
    if ((nextProps.hasPinnedMessage ?? false) !== (this.props.hasPinnedMessage ?? false)) return true;
    if ((nextProps.scrollTopPadding ?? 0) !== (this.props.scrollTopPadding ?? 0)) return true;
    if ((nextProps.scrollBottomPadding ?? 0) !== (this.props.scrollBottomPadding ?? 0)) return true;

    return false;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  componentDidMount(): void {
    this._isMounted = true;
    this.containerRef.current?.addEventListener('scroll', this._onScroll);
    if (this.props.enableDragSelect) {
      this.containerRef.current?.addEventListener('mousedown', this._onDragDown);
      window.addEventListener('mousemove', this._onDragMove);
      window.addEventListener('mouseup', this._onDragUp);
    }
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
        this._savedScrollBottomBeforeImageLoad = saved.value;
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
    if (this.props.enableDragSelect) {
      this.containerRef.current?.removeEventListener('mousedown', this._onDragDown);
      window.removeEventListener('mousemove', this._onDragMove);
      window.removeEventListener('mouseup', this._onDragUp);
    }
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

  private _onImageLoaded = (): void => {
    const container = this.containerRef.current;
    if (!container) return;

    // Keep sticky behavior when user is already at the bottom.
    if (isAtBottom(container) || this.state.nearBottom) {
      scrollToBottom(container);
      return;
    }

    if (!this._savedScrollBottomBeforeImageLoad) return;

    // Only restore if we're not at bottom and haven't scrolled manually
    if (!isAtBottom(container) && this._justRestoredPosition) {
      const currentScrollBottom = getScrollBottom(container);
      // If scroll jumped significantly (>20px), restore saved position
      if (Math.abs(currentScrollBottom - this._savedScrollBottomBeforeImageLoad) > 20) {
        setScrollBottom(container, this._savedScrollBottomBeforeImageLoad);
        console.log(`[ChatTimelineV2] Image loaded - restored scrollBottom to ${this._savedScrollBottomBeforeImageLoad}`);
      }
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
    if (!this.props.enableDragSelect) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, [role="button"], [contenteditable]')) return;
    this._dragStart = { x: e.clientX, y: e.clientY };
    this._dragCurrent = { x: e.clientX, y: e.clientY };
    this._isDragging = false;
  };

  private _onDragMove = (e: MouseEvent): void => {
    if (!this.props.enableDragSelect) return;
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
    if (!this.props.enableDragSelect) return;
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
          className="w-full max-w-[650px] mx-auto px-[5px] space-y-0.5"
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
              const metadataAny = (message.metadata as any) || {};
              const author = users.find(u => u.id === message.authorId);
              const notificationActorId = String(
                metadataAny.fromUserId ||
                metadataAny.from_user_id ||
                ''
              );
              const notificationActorById = notificationActorId
                ? users.find((u) => String(u.id) === notificationActorId)
                : null;
              const notificationActorName = String(
                metadataAny.fromUserName ||
                metadataAny.from_user_name ||
                ''
              ).trim();
              const notificationActorByName = !notificationActorById && notificationActorName
                ? users.find((u) => {
                    const name = String(u.name || '').trim();
                    const username = String(u.username || '').trim();
                    return name === notificationActorName || username === notificationActorName;
                  })
                : null;
              const isMyMessage = currentUser?.id === message.authorId;
              const isNotificationsLikeChat = Boolean(
                (this.props.selectedChat as any)?.isNotificationsChat ||
                String((this.props.selectedChat as any)?.id || '').startsWith('notifications-') ||
                String((this.props.selectedChat as any)?.id || '').startsWith('notifications_') ||
                ((this.props.selectedChat as any)?.isSystemChat && (this.props.selectedChat as any)?.title === 'Уведомления')
              );
              const renderAsNotification = isNotificationsLikeChat || Boolean(message.isSystemMessage);
              const effectiveLinkedTaskId = (
                message.linkedTaskId ||
                metadataAny.linkedTaskId ||
                metadataAny.linked_task_id ||
                metadataAny.taskId ||
                metadataAny.todoId ||
                ''
              ).toString();
              const effectiveLinkedEventId = (
                (message as any).linkedEventId ||
                metadataAny.linkedEventId ||
                metadataAny.linked_event_id ||
                metadataAny.eventId ||
                ''
              ).toString();
              const effectiveLinkedPostId = (message.linkedPostId || metadataAny.linkedPostId || metadataAny.linked_post_id || '').toString();
              const effectiveLinkedChatId = (message.linkedChatId || metadataAny.linkedChatId || metadataAny.linked_chat_id || '').toString();
              const hasNotificationAction = renderAsNotification && Boolean(
                effectiveLinkedTaskId || effectiveLinkedEventId || effectiveLinkedPostId || effectiveLinkedChatId
              );
              const openNotificationTarget = () => {
                if (typeof window === 'undefined') return;
                if (effectiveLinkedTaskId) {
                  // Dispatch event for in-page navigation (keeps React alive, avoids full reload race conditions)
                  window.dispatchEvent(new CustomEvent('shar:open-task', { detail: { taskId: effectiveLinkedTaskId } }));
                } else if (effectiveLinkedEventId) {
                  window.location.href = `/account?tab=calendar&event=${encodeURIComponent(effectiveLinkedEventId)}`;
                } else if (effectiveLinkedPostId) {
                  window.location.href = `/content-plan?post=${encodeURIComponent(effectiveLinkedPostId)}`;
                } else if (effectiveLinkedChatId) {
                  window.location.href = `/account?tab=messages&chat=${encodeURIComponent(effectiveLinkedChatId)}`;
                }
              };
              const notificationActionLabel = effectiveLinkedTaskId
                ? 'Открыть задачу'
                : effectiveLinkedEventId
                  ? 'Открыть событие'
                  : effectiveLinkedPostId
                    ? 'Открыть публикацию'
                    : 'Открыть чат';
              const notificationTypeRaw = String(message.notificationType || '').trim().toLowerCase();
              const notificationTypeLabelMap: Record<string, string> = {
                new_task: 'Новая задача',
                task_updated: 'Обновление задачи',
                task_status_changed: 'Изменение статуса',
                new_comment: 'Новый комментарий',
                mention: 'Упоминание',
                new_executor: 'Новый исполнитель',
                removed_executor: 'Исполнитель удален',
                post_updated: 'Обновление публикации',
                post_status_changed: 'Статус публикации',
                post_new_comment: 'Комментарий к публикации',
                info: 'Уведомление',
              };
              const notificationTypeLabel = notificationTypeRaw === 'event_reminder'
                ? ''
                : (notificationTypeLabelMap[notificationTypeRaw] || 'Уведомление');
              const isOwnBubble = isMyMessage && !renderAsNotification;
              const prevMessage = messages[index - 1];
              const nextMessage = messages[index + 1];
              const isGroupedWithPrev = !!prevMessage && prevMessage.authorId === message.authorId;
              const isGroupedWithNext = !!nextMessage && nextMessage.authorId === message.authorId;
              const isLastInGroup = !isGroupedWithNext;
              const showTail = isLastInGroup;
              const avatarSourceUser = renderAsNotification
                ? (notificationActorById || notificationActorByName || author)
                : author;
              const selectedChatAny = this.props.selectedChat as any;
              const selectedChatParticipantIds: string[] = Array.isArray(selectedChatAny?.participantIds)
                ? selectedChatAny.participantIds.map((id: unknown) => String(id))
                : [];
              const currentUserId = String(this.props.currentUser?.id || '');
              const directChatOtherParticipantId = !renderAsNotification && !selectedChatAny?.isGroup
                ? selectedChatParticipantIds.find((id) => id !== currentUserId)
                : undefined;
              const directChatOtherUser = directChatOtherParticipantId
                ? this.props.users.find((u) => String(u.id) === directChatOtherParticipantId)
                : undefined;
              const bubbleAvatarUrl = avatarSourceUser?.avatar || directChatOtherUser?.avatar || selectedChatAny?.avatar;
              const bubbleAvatarName =
                avatarSourceUser?.name ||
                avatarSourceUser?.username ||
                directChatOtherUser?.name ||
                directChatOtherUser?.username ||
                selectedChatAny?.displayTitle ||
                selectedChatAny?.title ||
                'U';
              const bubbleAvatarFallbackUrl = bubbleAvatarUrl
                ? ''
                : getDiceBearAvatarUrl(String(bubbleAvatarName || selectedChatAny?.id || message.authorId || 'user'));
              const showAvatar = this.props.isDesktopView && !isOwnBubble && isLastInGroup;
              const isMultiline = String(message.content || '').includes('\n');
              // Attachment classification
              const msgAtts: any[] = ((message.attachments as any[]) || []).map((att: any) => ({
                ...att,
                url: normalizeMediaUrl(att?.url),
              }));
              const msgImages = msgAtts.filter((a: any) => a.type === 'image');
              const msgVideos = msgAtts.filter((a: any) => a.type === 'video');
              const msgFiles  = msgAtts.filter((a: any) => a.type !== 'image' && a.type !== 'video');
              const hasTextContent = !!message.content?.trim();
              const hasMedia = msgImages.length > 0 || msgVideos.length > 0;
              const emojiOnlyCount = hasMedia || msgFiles.length > 0 || message.replyToId
                ? 0
                : getEmojiOnlyCount(message.content || '');
              const isEmojiOnly = emojiOnlyCount > 0;
              const emojiOnlyFontSize = emojiOnlyCount === 1 ? 56 : emojiOnlyCount === 2 ? 46 : emojiOnlyCount === 3 ? 38 : 32;
              // Media-only: images/video, no text, no files, no quote → Telegram-style overlay timestamp
              const isMediaOnly = hasMedia && !hasTextContent && !msgFiles.length && !message.replyToId;
              const timestampBottomClass = msgFiles.length > 0 ? 'bottom-0' : (isMultiline ? 'bottom-2' : 'bottom-1');
              const fmtSize = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
              const isMobileView = !this.props.isDesktopView;
              const bodyFontSize = isMobileView ? '16px' : '14px';
              const bodyLineHeight = isMobileView ? '22px' : '20px';
              const forwardedFromUserId = (
                message.forwardedFromUserId ||
                (message.metadata as any)?.forwardedFromUserId ||
                ''
              ).toString();
              const forwardedFromUser = forwardedFromUserId
                ? users.find((u) => String(u.id) === forwardedFromUserId)
                : null;
              const forwardedFromName = (
                message.forwardedFromUsername ||
                (message.metadata as any)?.forwardedFromUsername ||
                (message.metadata as any)?.fromUserName ||
                forwardedFromUser?.name ||
                forwardedFromUser?.username ||
                ''
              ).trim();
              const allImgUrls = msgImages.map((mi: any) => mi.url);
              const isRecentMessage = index >= Math.max(0, messages.length - 12);
              const getSingleImageBox = (att: any) => {
                const rawWidth = Number(att?.width) || 0;
                const rawHeight = Number(att?.height) || 0;
                const ratio = rawWidth > 0 && rawHeight > 0 ? rawWidth / rawHeight : 4 / 3;
                const clampedRatio = Math.max(0.55, Math.min(2.2, ratio));
                const targetWidth = hasTextContent || msgFiles.length > 0 ? (isMobileView ? 260 : 290) : 320;
                const targetHeight = Math.round(Math.max(120, Math.min(320, targetWidth / clampedRatio)));
                return { width: targetWidth, height: targetHeight };
              };
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
                if (!isOwnBubble || !currentUser) {
                  return false;
                }
                
                const chat = this.props.selectedChat;
                if (!chat?.readMessagesByUser) {
                  console.log(`[ChatTimelineV2] No readMessagesByUser for chat ${chat?.id}`);
                  return false;
                }
                
                const createdAtMs = new Date(message.createdAt).getTime();
                const otherParticipants = (chat.participantIds || []).filter(
                  pid => String(pid) !== String(currentUser.id)
                );
                
                if (otherParticipants.length === 0) {
                  return false; // No other participants
                }
                
                const readMessagesByUser = chat.readMessagesByUser;
                const isRead = otherParticipants.some(pid => {
                  const lastRead = readMessagesByUser[String(pid)];
                  if (!lastRead) return false;
                  
                  // Try parsing as timestamp first
                  const lastReadMs = new Date(lastRead).getTime();
                  if (!isNaN(lastReadMs)) {
                    return lastReadMs >= createdAtMs;
                  }
                  
                  // Fallback: lastRead is a message UUID — find the message and compare its createdAt
                  const readMsg = this.props.messages.find((m: Message) => String(m.id) === lastRead);
                  return !!readMsg && new Date(readMsg.createdAt).getTime() >= createdAtMs;
                });
                
                return isRead;
              })();
              
              const { chatSettings } = this.props;
              
              // Определяем цвета пузырей из настроек
              let bubbleColor: string;
              let textColor: string;
              
              if (renderAsNotification) {
                bubbleColor = this.props.theme === 'dark' ? '#1f2937' : '#f3f4f6';
                textColor = this.props.theme === 'dark' ? '#e2e8f0' : '#1f2937';
              } else if (isOwnBubble) {
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
              
              // Telegram Desktop behavior: own messages stay on the right,
              // incoming messages stay on the left regardless of viewport width.
              const alignment = isOwnBubble ? 'justify-end' : 'justify-start';
              
              // ── Call message: render as Telegram-style centered row (early return) ──
              if (String(message.notificationType || '').trim().toLowerCase() === 'call') {
                const callMeta = (message.metadata as any) || {};
                const callStatus: string = callMeta.callStatus || 'completed';
                const callType: string = callMeta.callType || 'voice';
                const durationSec: number | undefined = callMeta.duration ? Number(callMeta.duration) : undefined;
                const durationLabel = (durationSec != null && durationSec > 0)
                  ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`
                  : null;
                const isMissed = callStatus === 'missed' || callStatus === 'rejected';
                const accentColor = isMissed
                  ? (this.props.theme === 'dark' ? '#f87171' : '#dc2626')
                  : (this.props.theme === 'dark' ? '#4ade80' : '#16a34a');
                const callLabel =
                  callStatus === 'missed' ? 'Пропущенный звонок'
                  : callStatus === 'rejected' ? 'Звонок отклонён'
                  : callType === 'video' ? 'Видеозвонок' : 'Голосовой звонок';
                const timeLabel = new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                const PhoneIconEl = callStatus === 'missed'
                  ? <PhoneMissed className="w-3.5 h-3.5 flex-shrink-0" />
                  : callStatus === 'rejected'
                    ? <PhoneOff className="w-3.5 h-3.5 flex-shrink-0" />
                    : callType === 'video'
                      ? <Video className="w-3.5 h-3.5 flex-shrink-0" />
                      : isMyMessage
                        ? <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        : <PhoneIncoming className="w-3.5 h-3.5 flex-shrink-0" />;
                return (
                  <React.Fragment key={`${message.id}-${index}`}>
                    {showDateDivider && (
                      <div className="flex justify-center my-3">
                        <span className="px-3 py-1 rounded-full bg-white/70 dark:bg-slate-800/70 border border-gray-200 dark:border-gray-700 text-[11px] text-gray-600 dark:text-gray-300">
                          {dateLabel}
                        </span>
                      </div>
                    )}
                    <div
                      ref={(el) => { this.props.messageRefs.current[message.id] = el; }}
                      className="flex justify-center my-0.5"
                    >
                      <div
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] select-none"
                        style={{
                          backgroundColor: this.props.theme === 'dark' ? 'rgba(30,41,59,0.65)' : 'rgba(255,255,255,0.65)',
                          border: `1px solid ${accentColor}33`,
                          color: this.props.theme === 'dark' ? '#cbd5e1' : '#475569',
                          backdropFilter: 'blur(6px)',
                        }}
                      >
                        <span style={{ color: accentColor }} className="flex-shrink-0">{PhoneIconEl}</span>
                        <span className="font-medium" style={{ color: accentColor }}>{callLabel}</span>
                        {durationLabel && (
                          <span className="opacity-60">· {durationLabel}</span>
                        )}
                        <span className="opacity-40 text-[11px]">{timeLabel}</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={`${message.id}-${index}`}>
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
                    className={`w-full flex items-end ${alignment} ${isGroupedWithNext ? 'mb-[2px]' : 'mb-[6px]'} ${isGroupedWithPrev ? 'mt-[2px]' : 'mt-[6px]'} gap-2 cursor-pointer`}
                    style={undefined}
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
                  {this.props.isDesktopView && !isOwnBubble && !this.props.isSelectionMode && (
                    <div className="flex-shrink-0 w-7 h-7 flex items-end justify-center">
                      {showAvatar && (
                        <>
                          {(bubbleAvatarUrl || bubbleAvatarFallbackUrl) ? (
                            <img
                              src={bubbleAvatarUrl || bubbleAvatarFallbackUrl}
                              alt={bubbleAvatarName || 'avatar'}
                              className="w-7 h-7 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                              {(() => {
                                const name = bubbleAvatarName || 'U';
                                const words = name.trim().split(/\s+/);
                                return words.length >= 2 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
                              })()}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  <div
                    className={`inline-block relative rounded-[18px] ${(isMediaOnly || isEmojiOnly) ? 'overflow-hidden' : 'px-2.5 py-1.5 pb-1.5 min-w-[100px]'} w-fit transition-all ${renderAsNotification ? 'border border-slate-300/70 dark:border-slate-600/70' : ''} ${
                      this.props.selectedMessages.has(String(message.id)) 
                        ? 'ring-2 ring-blue-500 ring-opacity-50'
                        : this.props.activeSearchMessageId === String(message.id)
                        ? 'ring-2 ring-amber-400/70'
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
                      width: 'fit-content',
                      maxWidth: isMobileView
                        ? (renderAsNotification ? '92vw' : '86vw')
                        : (renderAsNotification ? 'min(82%, 700px)' : 'min(74%, 620px)'),
                      backgroundColor: isEmojiOnly ? 'transparent' : bubbleColor,
                      color: textColor
                    }}
                  >
                    {isMediaOnly ? (
                      /* ── Telegram-style: media fills the bubble, timestamp overlays ── */
                      <div className="relative">
                        {/* Forwarded message indicator (media-only) */}
                        {forwardedFromName && (
                          <div
                            className="absolute top-1.5 left-1.5 z-10 bg-black/60 backdrop-blur-[2px] text-white rounded-full px-2 py-0.5 font-medium pointer-events-none flex items-center gap-1"
                            style={{ fontSize: '11px', lineHeight: '16px' }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="15 17 20 12 15 7"></polyline>
                              <path d="M4 18v-2a4 4 0 0 1 4-4h12"></path>
                            </svg>
                            <span>От {forwardedFromName}</span>
                          </div>
                        )}
                        
                        {/* Sender name pill overlay (non-desktop incoming) */}
                        {!isOwnBubble && author && !this.props.isDesktopView && !renderAsNotification && (
                          <div
                            className="absolute z-10 bg-black/50 backdrop-blur-[2px] text-white rounded-full px-2 py-0.5 font-semibold pointer-events-none"
                            style={{ 
                              fontSize: '12px', 
                              lineHeight: '18px',
                              top: forwardedFromName ? '32px' : '6px',
                              left: '6px'
                            }}
                          >
                            {author.name || author.username}
                          </div>
                        )}

                        {/* ── Image grid (Signal-style layouts) ── */}
                        {msgImages.length === 1 && (
                          (() => {
                            const box = getSingleImageBox(msgImages[0]);
                            return (
                          <LazyImage
                            onImageLoaded={this._onImageLoaded} src={msgImages[0].url}
                            alt={msgImages[0].name || 'image'}
                            className="block object-cover cursor-zoom-in"
                            width={msgImages[0].width}
                            height={msgImages[0].height}
                            eager={isRecentMessage}
                            style={{ width: `${box.width}px`, height: `${box.height}px`, display: 'block' }}
                            onClick={(e) => { e.stopPropagation(); openImg(msgImages[0].url, allImgUrls); }}
                          />
                            );
                          })()
                        )}

                        {msgImages.length === 2 && (
                          <div style={{ display: 'flex', gap: 2, height: 200 }}>
                            {msgImages.map((img: any, i: number) => (
                              <div key={`${message.id}-img-${i}`} style={{ flex: 1, overflow: 'hidden' }}>
                                <LazyImage
                                  onImageLoaded={this._onImageLoaded} src={img.url} alt={img.name || 'image'}
                                  className="w-full h-full object-cover block cursor-zoom-in"
                                  width={img.width}
                                  height={img.height}
                                  eager={isRecentMessage}
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
                                onImageLoaded={this._onImageLoaded} src={msgImages[0].url} alt={msgImages[0].name || 'image'}
                                className="w-full h-full object-cover block cursor-zoom-in"
                                width={msgImages[0].width}
                                height={msgImages[0].height}
                                eager={isRecentMessage}
                                onClick={(e) => { e.stopPropagation(); openImg(msgImages[0].url, allImgUrls); }}
                              />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {msgImages.slice(1).map((img: any, i: number) => (
                                <div key={`${message.id}-img-${i + 1}`} style={{ flex: 1, overflow: 'hidden' }}>
                                  <LazyImage
                                    onImageLoaded={this._onImageLoaded} src={img.url} alt={img.name || 'image'}
                                    className="w-full h-full object-cover block cursor-zoom-in"
                                    width={img.width}
                                    height={img.height}
                                    eager={isRecentMessage}
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
                              <div key={`${message.id}-img-${i}`} style={{ height: 150, overflow: 'hidden' }}>
                                <LazyImage
                                  onImageLoaded={this._onImageLoaded} src={img.url} alt={img.name || 'image'}
                                  className="w-full h-full object-cover block cursor-zoom-in"
                                  width={img.width}
                                  height={img.height}
                                  eager={isRecentMessage}
                                  onClick={(e) => { e.stopPropagation(); openImg(img.url, allImgUrls); }}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {msgImages.length >= 5 && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            {msgImages.slice(0, 4).map((img: any, i: number) => (
                              <div key={`${message.id}-img-${i}`} style={{ height: 150, overflow: 'hidden', position: 'relative' }}>
                                <LazyImage
                                  onImageLoaded={this._onImageLoaded} src={img.url} alt={img.name || 'image'}
                                  className="w-full h-full object-cover block cursor-zoom-in"
                                  width={img.width}
                                  height={img.height}
                                  eager={isRecentMessage}
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
                          <div key={`${message.id}-vid-${i}`} onClick={(e) => e.stopPropagation()}>
                            <video src={vid.url} controls className="w-full block bg-black" style={{ maxHeight: 300 }} />
                          </div>
                        ))}

                        {/* ── Telegram-style timestamp overlay ── */}
                        <div
                          className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-[3px] bg-black/50 backdrop-blur-[2px] text-white rounded-full px-1.5 py-0.5 select-none pointer-events-none"
                          style={{ fontSize: '11px', lineHeight: '16px', letterSpacing: '0.06px' }}
                        >
                          <span>{new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOwnBubble && (
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
                        {isEmojiOnly ? (
                          <div
                            className="pr-[44px] pt-[2px] select-none"
                            style={{
                              fontSize: `${emojiOnlyFontSize}px`,
                              lineHeight: 1.08,
                              letterSpacing: '-0.02em',
                              filter: this.props.theme === 'dark' ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' : 'none',
                              paddingBottom: emojiOnlyCount === 1 ? '10px' : '4px',
                            }}
                          >
                            {message.content?.trim()}
                          </div>
                        ) : String(message.notificationType || '').trim().toLowerCase() === 'call' ? (
                          /* ── Call messages are rendered as centered pill rows (early return above) ── */
                          null
                        ) : (
                          <>
                        {renderAsNotification && notificationTypeLabel && (
                          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold opacity-90">
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 dark:bg-white/10">
                              {effectiveLinkedTaskId ? (
                                <CheckSquare className="w-3 h-3" />
                              ) : effectiveLinkedEventId ? (
                                <Calendar className="w-3 h-3" />
                              ) : (
                                <Bell className="w-3 h-3" />
                              )}
                            </span>
                            <span>{notificationTypeLabel}</span>
                          </div>
                        )}

                        {/* Forwarded message indicator */}
                        {forwardedFromName && (
                          <div
                            className="flex items-center gap-1 mb-1 opacity-60"
                            style={{ fontSize: '12px', lineHeight: '16px' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="15 17 20 12 15 7"></polyline>
                              <path d="M4 18v-2a4 4 0 0 1 4-4h12"></path>
                            </svg>
                            <span>Переслано от {forwardedFromName}</span>
                          </div>
                        )}
                        
                        {/* Sender name */}
                        {!isOwnBubble && author && !this.props.isDesktopView && !renderAsNotification && (
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
                            isIncoming={!isOwnBubble}
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
                              (() => {
                                const box = getSingleImageBox(msgImages[0]);
                                return (
                              <LazyImage
                                onImageLoaded={this._onImageLoaded} src={msgImages[0].url} alt={msgImages[0].name || 'image'}
                                className="block object-cover cursor-zoom-in"
                                width={msgImages[0].width}
                                height={msgImages[0].height}
                                eager={isRecentMessage}
                                style={{ width: '100%', maxHeight: `${box.height}px`, display: 'block' }}
                                onClick={(e) => { e.stopPropagation(); openImg(msgImages[0].url, allImgUrls); }}
                              />
                                );
                              })()
                            )}
                            {msgImages.length === 2 && (
                              <div style={{ display: 'flex', gap: 2, height: 180 }}>
                                {msgImages.map((img: any, i: number) => (
                                  <div key={`${message.id}-img-${i}`} style={{ flex: 1, overflow: 'hidden' }}>
                                    <LazyImage onImageLoaded={this._onImageLoaded} src={img.url} alt={img.name || 'image'} className="w-full h-full object-cover block cursor-zoom-in"
                                      width={img.width}
                                      height={img.height}
                                      eager={isRecentMessage}
                                      onClick={(e) => { e.stopPropagation(); openImg(img.url, allImgUrls); }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            {msgImages.length === 3 && (
                              <div style={{ display: 'flex', gap: 2, height: 190 }}>
                                <div style={{ flex: 2, overflow: 'hidden' }}>
                                  <LazyImage onImageLoaded={this._onImageLoaded} src={msgImages[0].url} alt="" className="w-full h-full object-cover block cursor-zoom-in"
                                    width={msgImages[0].width}
                                    height={msgImages[0].height}
                                    eager={isRecentMessage}
                                    onClick={(e) => { e.stopPropagation(); openImg(msgImages[0].url, allImgUrls); }}
                                  />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {msgImages.slice(1).map((img: any, i: number) => (
                                    <div key={`${message.id}-img-${i + 1}`} style={{ flex: 1, overflow: 'hidden' }}>
                                      <LazyImage onImageLoaded={this._onImageLoaded} src={img.url} alt="" className="w-full h-full object-cover block cursor-zoom-in"
                                        width={img.width}
                                        height={img.height}
                                        eager={isRecentMessage}
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
                                  <div key={`${message.id}-img-${i}`} style={{ height: 130, overflow: 'hidden', position: 'relative' }}>
                                    <LazyImage onImageLoaded={this._onImageLoaded} src={img.url} alt="" className="w-full h-full object-cover block cursor-zoom-in"
                                      width={img.width}
                                      height={img.height}
                                      eager={isRecentMessage}
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
                          <div key={`${message.id}-vid-${i}`} className="-mx-2.5 overflow-hidden mb-1" style={{ marginTop: '-6px', borderRadius: '14px' }} onClick={(e) => e.stopPropagation()}>
                            <video src={vid.url} controls className="w-full max-h-[280px] bg-black block" />
                          </div>
                        ))}

                        {/* Text */}
                        {hasTextContent ? (
                          <div
                            className="whitespace-pre-wrap break-words overflow-wrap-anywhere pr-[44px]"
                            style={{ fontSize: bodyFontSize, lineHeight: bodyLineHeight, letterSpacing: '-0.08px' }}
                          >
                            <span>{renderTextWithLinksAndHighlight(message.content || '', this.props.messageSearchQuery, this.props.activeSearchMessageId === String(message.id))}</span>
                          </div>
                        ) : (
                          <div className="pr-[44px] h-[1px]" />
                        )}

                        {/* Files */}
                        {msgFiles.length > 0 && (
                          <div className="mt-1.5 space-y-1.5 pb-[6px]">
                            {msgFiles.map((att: any, idx: number) => (
                              <FileAttachment
                                key={`${message.id}-file-${idx}`}
                                url={att.url}
                                name={att.name}
                                size={att.size}
                                messageId={message.id}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ))}
                          </div>
                        )}

                        {hasNotificationAction && (
                          <div className="mt-2 mb-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openNotificationTarget();
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border border-white/25 dark:border-white/20 bg-white/10 hover:bg-white/20 transition-colors"
                            >
                              {effectiveLinkedEventId && !effectiveLinkedTaskId ? (
                                <Calendar className="w-3 h-3" />
                              ) : (
                                <CheckSquare className="w-3 h-3" />
                              )}
                              <span>{notificationActionLabel}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                          </>
                        )}

                        {/* Inline timestamp */}
                        <span
                          className={`absolute right-2 inline-flex items-center gap-1 select-none whitespace-nowrap ${timestampBottomClass}`}
                          style={{ fontSize: '11px', lineHeight: '14px', letterSpacing: '0.06px', opacity: 0.6 }}
                        >
                          <span>{new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOwnBubble && (
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
                      <span className={`absolute bottom-[4px] ${isOwnBubble ? '-right-[2px]' : '-left-[2px]'}`} aria-hidden="true">
                        <svg width="10" height="16" viewBox="0 0 10 16" className={isOwnBubble ? '' : 'scale-x-[-1]'} style={{ display: 'block' }}>
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
