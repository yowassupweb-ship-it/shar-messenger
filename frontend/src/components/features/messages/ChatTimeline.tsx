'use client';

/**
 * ChatTimeline — точная реализация алгоритма скролла из Signal Desktop.
 *
 * Источник: Timeline.dom.tsx + scrollUtil.std.ts + timelineUtil.std.ts
 *
 * ПРИНЦИПЫ (из Signal):
 *
 * 1. getSnapshotBeforeUpdate — захватывает scrollBottom ДО рендера,
 *    только если messages изменились и пользователь НЕ у дна.
 *
 * 2. componentDidUpdate — восстанавливает scrollBottom ПОСЛЕ рендера.
 *    Это layout phase: браузер применит scrollTop ДО следующего paint.
 *    Пользователь никогда не видит промежуточной позиции. БЕЗ visibility:hidden.
 *
 * 3. Первая загрузка (prevCount===0 → count>0): читаем localStorage,
 *    прокручиваем к нужному сообщению или вниз. Тоже в componentDidUpdate.
 *
 * 4. У дна: overflow-anchor:auto (браузер) держит позицию при новых сообщениях.
 *    getSnapshotBeforeUpdate возвращает null → мы ничего не делаем.
 *
 * 5. key={chatId} в JSX → remount при смене чата.
 *    componentWillUnmount сохраняет позицию.
 */

import React, { Component, createRef } from 'react';
import { MessageCircle } from 'lucide-react';
import MessageItem from './MessageItem';
import type { Message, User, Chat } from './types';

// ── Signal scroll helpers (точная копия из Signal scrollUtil.std.ts) ──────────

function getScrollBottom(el: HTMLElement): number {
  return el.scrollHeight - el.scrollTop - el.clientHeight;
}

function setScrollBottom(el: HTMLElement, scrollBottom: number): void {
  el.scrollTop = el.scrollHeight - scrollBottom - el.clientHeight;
}

function scrollToBottom(el: HTMLElement): void {
  el.scrollTop = el.scrollHeight;
}

const AT_BOTTOM_THRESHOLD = 15;

function isAtBottom(el: HTMLElement): boolean {
  if (el.clientHeight >= el.scrollHeight) return true;
  return getScrollBottom(el) <= AT_BOTTOM_THRESHOLD;
}

// ── Snapshot storage ──────────────────────────────────────────────────────────

function storageKey(chatId: string): string {
  return `chat_scroll_v7_${chatId}`;
}

// offsetFromViewportTop — расстояние от верхней кромки якорного сообщения до верха
// scroll-контейнера в момент сохранения. В качестве якоря берём верхнее видимое сообщение,
// а не центральное: это даёт более стабильное восстановление при возврате в чат.
// scrollTop — запасной вариант восстановления, если якорное сообщение ещё не найдено.
type ScrollSnapshot = { mode: 'bottom' } | { mode: 'msg'; id: string; offsetFromViewportTop: number; scrollTop?: number };

function loadSnapshot(chatId: string): ScrollSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey(chatId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed?.mode === 'bottom') return { mode: 'bottom' };
    if (parsed?.mode === 'msg' && typeof parsed.id === 'string' && parsed.id) {
      // Поддержка старого формата с scrollTop (v6) — не применяем, просто пропускаем
      const offset = typeof parsed.offsetFromViewportTop === 'number' ? parsed.offsetFromViewportTop : null;
      const scrollTop = typeof parsed.scrollTop === 'number' ? parsed.scrollTop : undefined;
      if (offset !== null) return { mode: 'msg', id: parsed.id, offsetFromViewportTop: offset, scrollTop };
    }
    return null;
  } catch { return null; }
}

function saveSnapshot(chatId: string, snap: ScrollSnapshot): void {
  try {
    localStorage.setItem(storageKey(chatId), JSON.stringify(snap));
  } catch { /* quota exceeded */ }
}

// ── Props / State ─────────────────────────────────────────────────────────────

export interface ChatTimelineProps {
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
  onRestabilizingChange?: (value: boolean) => void;
}

interface ChatTimelineState {
  dockOffsetPx: number;
  nearBottom: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export class ChatTimeline extends Component<ChatTimelineProps, ChatTimelineState> {
  static defaultProps = { hasPinnedMessage: false };

  containerRef = createRef<HTMLDivElement>();

  state: ChatTimelineState = {
    dockOffsetPx: 96,
    nearBottom: true,
  };

  private _composerResizeObserver: ResizeObserver | null = null;
  private _composerResizeListener: EventListener | null = null;
  private _restabilizeSnapshot: ScrollSnapshot | null = null;
  private _restabilizeUntil = 0;
  private _restabilizeRaf: number | null = null;
  private _restabilizeTimeoutIds: number[] = [];
  private _ignoreScrollEventsUntil = 0;
  private _isRestabilizing = false;

  // ── lifecycle ─────────────────────────────────────────────────────────────

  componentDidMount(): void {
    this._setupScrollListener();
    this._setupDockOffset();
    if (this.props.messages.length > 0) {
      this._applyStoredSnapshot();
    }
  }

  componentWillUnmount(): void {
    this._save();
    this._stopRestabilize();
    this._composerResizeObserver?.disconnect();
    if (this._composerResizeListener) {
      window.removeEventListener('composer-resize', this._composerResizeListener);
    }
    this.containerRef.current?.removeEventListener('scroll', this._onScroll);
  }

  getSnapshotBeforeUpdate(prevProps: Readonly<ChatTimelineProps>): number | null {
    const container = this.containerRef.current;
    if (!container) return null;

    const prevCount = prevProps.messages.length;
    const nextCount = this.props.messages.length;

    if (prevCount === nextCount) return null;
    if (prevCount === 0) return null;
    if (isAtBottom(container)) return null;

    return getScrollBottom(container);
  }

  componentDidUpdate(
    prevProps: Readonly<ChatTimelineProps>,
    _prevState: Readonly<ChatTimelineState>,
    snapshot: number | null
  ): void {
    const container = this.containerRef.current;
    if (!container) return;

    if (prevProps.messages.length === 0 && this.props.messages.length > 0) {
      this._applyStoredSnapshot();
      return;
    }

    if (snapshot !== null) {
      setScrollBottom(container, snapshot);
    }

    if (prevProps.messages !== this.props.messages && this._hasActiveRestabilize()) {
      this._requestRestabilize();
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  saveScrollPosition = (): void => {
    this._save();
  };

  // ── Private ───────────────────────────────────────────────────────────────

  private _applyStoredSnapshot(): void {
    const container = this.containerRef.current;
    if (!container || this.props.messages.length === 0) return;

    const snapshot = loadSnapshot(this.props.chatId);
    let near: boolean;

    if (snapshot?.mode === 'msg') {
      const el = this.props.messageRefs.current[snapshot.id];
      if (el) {
        this._applyMessageSnapshot(snapshot);
        // Если snapshot содержит msg-позицию, пользователь точно не был у дна.
        // НЕ вызываем isAtBottom() сейчас — картинки ещё не загружены,
        // scrollHeight может быть неправильным → isAtBottom дал бы false positive и
        // запускал автоскролл вниз.
        near = false;
        this._startRestabilize(snapshot);
      } else {
        this._stopRestabilize();
        if (typeof snapshot.scrollTop === 'number') {
          this._ignoreScrollEventsUntil = performance.now() + 150;
          container.scrollTop = Math.max(0, snapshot.scrollTop);
          near = false;
        } else {
          // Сообщение не найдено → fallback вниз (кэш не содержит это сообщение)
          scrollToBottom(container);
          near = true;
        }
      }
    } else {
      this._stopRestabilize();
      scrollToBottom(container);
      near = isAtBottom(container);
    }

    if (near !== this.state.nearBottom) {
      this.setState({ nearBottom: near });
    }
    this.props.onNearBottomChange?.(near);
    this.props.onViewportReadyChange?.(true);
  }

  private _save(): void {
    const container = this.containerRef.current;
    const chatId = this.props.chatId;
    if (!container || !chatId || this.props.messages.length === 0) return;

    if (isAtBottom(container)) {
      saveSnapshot(chatId, { mode: 'bottom' });
      return;
    }

    const topVisibleAnchor = this._getTopVisibleAnchor();
    if (topVisibleAnchor) {
      saveSnapshot(chatId, {
        mode: 'msg',
        id: topVisibleAnchor.id,
        offsetFromViewportTop: topVisibleAnchor.offsetFromViewportTop,
        scrollTop: container.scrollTop,
      });
    } else {
      saveSnapshot(chatId, { mode: 'bottom' });
    }
  }

  private _applyMessageSnapshot(snapshot: Extract<ScrollSnapshot, { mode: 'msg' }>): boolean {
    const container = this.containerRef.current;
    const el = this.props.messageRefs.current[snapshot.id];
    if (!container || !el) return false;

    const nextScrollTop = Math.max(0, el.offsetTop - snapshot.offsetFromViewportTop);
    this._ignoreScrollEventsUntil = performance.now() + 150;
    container.scrollTop = nextScrollTop;
    return true;
  }

  private _hasActiveRestabilize(): boolean {
    return Boolean(
      this._restabilizeSnapshot
      && this._restabilizeSnapshot.mode === 'msg'
      && Date.now() < this._restabilizeUntil
    );
  }

  private _clearRestabilizeTimeouts(): void {
    this._restabilizeTimeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    this._restabilizeTimeoutIds = [];
    if (this._restabilizeRaf !== null) {
      cancelAnimationFrame(this._restabilizeRaf);
      this._restabilizeRaf = null;
    }
  }

  private _setRestabilizing(value: boolean): void {
    if (this._isRestabilizing === value) return;
    this._isRestabilizing = value;
    this.props.onRestabilizingChange?.(value);
  }

  private _stopRestabilize(): void {
    const container = this.containerRef.current;
    this._clearRestabilizeTimeouts();
    this._restabilizeSnapshot = null;
    this._restabilizeUntil = 0;
    this._setRestabilizing(false);
    container?.removeEventListener('load', this._onContentLoad, true);
  }

  private _startRestabilize(snapshot: Extract<ScrollSnapshot, { mode: 'msg' }>): void {
    const container = this.containerRef.current;
    if (!container) return;

    this._stopRestabilize();
    this._restabilizeSnapshot = snapshot;
    this._restabilizeUntil = Date.now() + 2200;
    this._setRestabilizing(true);
    container.addEventListener('load', this._onContentLoad, true);

    [80, 180, 320, 550, 900, 1400, 2000].forEach((delay) => {
      const timeoutId = window.setTimeout(() => {
        this._requestRestabilize();
      }, delay);
      this._restabilizeTimeoutIds.push(timeoutId);
    });
  }

  private _onContentLoad = (): void => {
    this._requestRestabilize();
  };

  private _requestRestabilize(): void {
    if (!this._hasActiveRestabilize()) {
      this._stopRestabilize();
      return;
    }

    if (this._restabilizeRaf !== null) return;

    this._restabilizeRaf = requestAnimationFrame(() => {
      this._restabilizeRaf = null;

      if (!this._hasActiveRestabilize()) {
        this._stopRestabilize();
        return;
      }

      const snapshot = this._restabilizeSnapshot;
      if (!snapshot || snapshot.mode !== 'msg') {
        this._stopRestabilize();
        return;
      }

      this._applyMessageSnapshot(snapshot);
    });
  }

  private _getTopVisibleAnchor(): { id: string; offsetFromViewportTop: number } | null {
    const container = this.containerRef.current;
    if (!container) return null;

    const viewportTop = container.scrollTop;
    const viewportBottom = viewportTop + container.clientHeight;
    let bestVisible: { id: string; offsetFromViewportTop: number; distanceToTop: number } | null = null;
    let nearestAbove: { id: string; offsetFromViewportTop: number; distanceToTop: number } | null = null;

    for (const [msgId, el] of Object.entries(this.props.messageRefs.current)) {
      if (!el) continue;
      const top = el.offsetTop;
      const bottom = top + el.offsetHeight;
      const offsetFromViewportTop = top - viewportTop;

      if (bottom > viewportTop && top < viewportBottom) {
        const candidate = {
          id: msgId,
          offsetFromViewportTop,
          distanceToTop: Math.abs(offsetFromViewportTop),
        };

        if (!bestVisible || candidate.distanceToTop < bestVisible.distanceToTop) {
          bestVisible = candidate;
        }
        continue;
      }

      if (bottom <= viewportTop) {
        const candidate = {
          id: msgId,
          offsetFromViewportTop,
          distanceToTop: Math.abs(offsetFromViewportTop),
        };

        if (!nearestAbove || top > (this.props.messageRefs.current[nearestAbove.id]?.offsetTop ?? -Infinity)) {
          nearestAbove = candidate;
        }
      }
    }

    if (bestVisible) {
      return {
        id: bestVisible.id,
        offsetFromViewportTop: bestVisible.offsetFromViewportTop,
      };
    }

    if (nearestAbove) {
      return {
        id: nearestAbove.id,
        offsetFromViewportTop: nearestAbove.offsetFromViewportTop,
      };
    }

    return null;
  }

  private _onScroll = (): void => {
    const container = this.containerRef.current;
    if (!container) return;

    if (performance.now() < this._ignoreScrollEventsUntil) {
      return;
    }

    if (this._hasActiveRestabilize()) {
      this._stopRestabilize();
    }

    const near = isAtBottom(container);
    if (near !== this.state.nearBottom) {
      this.setState({ nearBottom: near });
      this.props.onNearBottomChange?.(near);
    }
  };

  private _setupScrollListener(): void {
    this.containerRef.current?.addEventListener('scroll', this._onScroll, { passive: true });
  }

  private _setupDockOffset(): void {
    const updateOffset = () => {
      const composerEl = this.props.composerContainerRef.current;
      const spacerEl = this.props.messagesEndRef.current;
      if (!composerEl || !spacerEl) return;

      const rect = composerEl.getBoundingClientRect();
      const composerStyle = window.getComputedStyle(composerEl);
      const composerBottom = Math.max(0, parseFloat(composerStyle.bottom || '0') || 0);
      const composerHeight = Math.max(0, Math.round(rect.height));
      const nextOffset = Math.max(44, Math.round(composerHeight + composerBottom + 10));

      spacerEl.style.height = `${nextOffset}px`;

      if (this.state.dockOffsetPx !== nextOffset) {
        this.setState({ dockOffsetPx: nextOffset });
      }
    };

    updateOffset();

    const composerEl = this.props.composerContainerRef.current;
    if (composerEl) {
      this._composerResizeObserver = new ResizeObserver(updateOffset);
      this._composerResizeObserver.observe(composerEl);
    }

    const listener = updateOffset as EventListener;
    window.addEventListener('composer-resize', listener);
    this._composerResizeListener = listener;
  }

  // ── Sort / read helpers ───────────────────────────────────────────────────

  private _sortMessages(): Message[] {
    return [...this.props.messages].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return String(a.id).localeCompare(String(b.id));
      if (!Number.isFinite(aTime)) return -1;
      if (!Number.isFinite(bTime)) return 1;
      if (aTime !== bTime) return aTime - bTime;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  private _getMessageOrderById(sorted: Message[]): Record<string, number> {
    return sorted.reduce<Record<string, number>>((acc, msg, idx) => {
      acc[msg.id] = idx;
      return acc;
    }, {});
  }

  private _isReadByOthers(message: Message, orderById: Record<string, number>): boolean {
    const { currentUser, selectedChat } = this.props;
    if (!currentUser || !selectedChat?.readMessagesByUser) return false;
    if (message.authorId !== currentUser.id) return false;

    const idx = orderById[message.id];
    if (idx === undefined || idx < 0) return false;

    const readMap = selectedChat.readMessagesByUser;
    const otherIds = Object.keys(readMap).filter((id) => id !== currentUser.id);
    const idsToCheck = otherIds.length > 0
      ? otherIds
      : (selectedChat.participantIds || []).filter((id) => id !== currentUser.id);

    if (idsToCheck.length === 0) return false;

    const sorted = this._sortMessages();

    return idsToCheck.some((participantId) => {
      const rawReadMarker = readMap[participantId];
      if (!rawReadMarker) return false;
      const readMarker = String(rawReadMarker);

      if (orderById[readMarker] !== undefined) return orderById[readMarker] >= idx;

      const readTs = new Date(readMarker).getTime();
      if (!Number.isFinite(readTs)) return false;

      let boundary = -1;
      for (let i = 0; i < sorted.length; i++) {
        const ts = new Date(sorted[i].createdAt || 0).getTime();
        if (Number.isFinite(ts) && ts <= readTs) boundary = i;
      }
      return boundary >= idx;
    });
  }

  // ── render ────────────────────────────────────────────────────────────────

  render(): React.ReactNode {
    const {
      messages, messageSearchQuery, users, currentUser, selectedChat,
      selectedMessages, editingMessageId, isSelectionMode, messageRefs,
      theme, chatSettings, isDesktopView, myBubbleTextClass, useDarkTextOnBubble,
      hasPinnedMessage, messagesEndRef, router,
      setSelectedMessages, setIsSelectionMode,
      setContextMenuMessage, setContextMenuPosition, setShowMessageContextMenu,
      scrollToMessage, setCurrentImageUrl, setShowImageModal,
    } = this.props;

    const { dockOffsetPx, nearBottom } = this.state;
    const shouldUseBrowserScrollAnchor = nearBottom && !this._hasActiveRestabilize();

    // CSS классы (идентичны оригинальному MessagesArea)
    const containerClass = isDesktopView
      ? `flex-1 min-h-0 overflow-x-hidden overscroll-contain p-4 ${hasPinnedMessage ? 'pt-28' : 'pt-16'} pb-0 bg-transparent scrollbar-hide-mobile`
      : `flex-1 min-h-0 overflow-x-hidden overscroll-contain p-[3px] ${hasPinnedMessage ? 'pt-[164px]' : 'pt-[120px]'} pb-0 bg-transparent scrollbar-hide-mobile`;

    const innerClass = isDesktopView ? 'px-4 lg:px-8 min-w-0' : 'px-0 min-w-0';
    const listSpacingClass = isDesktopView ? 'space-y-[3px]' : 'space-y-1.5';

    // Фон
    const chatBgColor = theme === 'dark'
      ? (chatSettings?.chatBackgroundDark || '#0f172a')
      : (chatSettings?.chatBackgroundLight || '#f8fafc');
    const chatBgImage = theme === 'dark'
      ? String(chatSettings?.chatBackgroundImageDark || '').trim()
      : String(chatSettings?.chatBackgroundImageLight || '').trim();
    const overlayImage = theme === 'dark'
      ? String(chatSettings?.chatOverlayImageDark || '').trim()
      : String(chatSettings?.chatOverlayImageLight || '').trim();
    const overlayScale = Math.max(20, Math.min(200, Number(chatSettings?.chatOverlayScale ?? 100) || 100));
    const overlayOpacity = Math.max(0, Math.min(1, Number(chatSettings?.chatOverlayOpacity ?? 1) || 1));

    const bgStyle: React.CSSProperties = {
      backgroundColor: chatBgColor,
      ...(chatBgImage ? {
        backgroundImage: `url('${chatBgImage}')`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
      } : {}),
    };

    const overlayStyle: React.CSSProperties | undefined = overlayImage ? {
      position: 'fixed',
      top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none',
      backgroundImage: `url('${overlayImage}')`,
      backgroundSize: `${overlayScale * 3}px`,
      backgroundRepeat: 'repeat',
      backgroundPosition: 'center center',
      backgroundAttachment: 'fixed',
      opacity: overlayOpacity,
      zIndex: 1,
    } : undefined;

    // Фильтрация поиском
    const filtered = messageSearchQuery.trim()
      ? messages.filter((m) => m?.content?.toLowerCase().includes(messageSearchQuery.toLowerCase()))
      : messages;

    const sorted = this._sortMessages();
    const orderById = this._getMessageOrderById(sorted);

    const emptyTopOffset = isDesktopView
      ? (hasPinnedMessage ? 112 : 64)
      : (hasPinnedMessage ? 164 : 120);

    return (
      <div
        ref={this.containerRef}
        className={`${containerClass} overflow-y-auto relative`}
        data-chat-id={this.props.chatId}
        style={{
          ...bgStyle,
          overflowAnchor: shouldUseBrowserScrollAnchor ? 'auto' : 'none',
          scrollBehavior: 'auto',
        }}
      >

        {overlayStyle && <div style={overlayStyle} aria-hidden="true" />}

        {messages.length === 0 && (
          <div
            className="absolute inset-x-0 z-20 px-4 select-none pointer-events-none"
            style={{ top: emptyTopOffset, bottom: dockOffsetPx }}
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
        )}

        <div
          className={`${innerClass} relative z-10 visible`}
        >
          {messages.length > 0 && (
            <div className={listSpacingClass}>
              {filtered.map((message, index) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  index={index}
                  filteredMessages={filtered}
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
                  isReadByOthers={this._isReadByOthers(message, orderById)}
                  onSelectMessage={(messageId) => {
                    setSelectedMessages((prev) => {
                      const next = new Set(prev);
                      if (next.has(messageId)) {
                        next.delete(messageId);
                        if (next.size === 0) setIsSelectionMode(false);
                      } else {
                        next.add(messageId);
                      }
                      return next;
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
            style={{ height: messages.length === 0 ? 0 : dockOffsetPx }}
          />
        </div>
      </div>
    );
  }
}

export default ChatTimeline;
