'use client';

import { useState, useEffect, useRef, useMemo, useCallback, startTransition } from 'react';
import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MessageCircle, Send, ArrowLeft, Users, Search, Plus, MoreVertical, Check, Edit3, Trash2, Reply, Pin, PinOff, X, Paperclip, FileText, Link as LinkIcon, Calendar, CalendarPlus, Image, File, Info, Grid, List, Play, Music, Download, CheckSquare, Mail, Phone, Upload, Smile, Star, Bell, ChevronLeft, ChevronRight, ChevronDown, Building, Globe, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import Avatar from '@/components/common/data-display/Avatar';
import EmojiPicker from '@/components/common/overlays/EmojiPicker';
import ChatListSkeleton from '@/components/layout/ChatListSkeleton';
import LinkPreview from '@/components/features/messages/LinkPreview';
import ChatItem from '@/components/features/messages/ChatItem';
import MessageItem from '@/components/features/messages/MessageItem';
import MessageInput from '@/components/features/messages/MessageInput';
import ChatSidebar from '@/components/features/messages/ChatSidebar';
import ChatHeader from '@/components/features/messages/ChatHeader';
import MessagesArea from '@/components/features/messages/MessagesArea';
import { ChatTimelineV2 as ChatTimeline } from '@/components/features/messages/ChatTimelineV2';
import MessageSearchBar from '@/components/features/messages/MessageSearchBar';
import TextFormattingMenu from '@/components/features/messages/TextFormattingMenu';
import type { User, Message, Chat, Task } from '@/components/features/messages/types';
import { formatMessageDate, shouldShowDateSeparator, formatMessageText, getChatTitle, getChatAvatarData } from '@/components/features/messages/utils';

const NewChatModal = dynamic(() => import('@/components/features/messages/NewChatModal'));
const RenameChatModal = dynamic(() => import('@/components/features/messages/RenameChatModal'));
const ReadByModal = dynamic(() => import('@/components/features/messages/ReadByModal'));
const AddParticipantModal = dynamic(() => import('@/components/features/messages/AddParticipantModal'));
const ImageModal = dynamic(() => import('@/components/features/messages/ImageModal'));
const ForwardModal = dynamic(() => import('@/components/features/messages/ForwardModal'));
const ChatInfoPanel = dynamic(() => import('@/components/features/messages/ChatInfoPanel'));
const AttachmentModals = dynamic(() => import('@/components/features/messages/AttachmentModals'));
const MessageContextMenu = dynamic(() => import('@/components/features/messages/MessageContextMenu'));
const ChatContextMenu = dynamic(() => import('@/components/features/messages/ChatContextMenu'));
const EventCalendarSelector = dynamic(() => import('@/components/features/messages/EventCalendarSelector'));
const TaskListSelector = dynamic(() => import('@/components/features/messages/TaskListSelector'));

const DEPARTMENT_COLORS = [
  '#0F4C81', // Classic Blue
  '#FF6F61', // Living Coral
  '#6B5B95', // Ultra Violet
  '#88B04B', // Greenery
  '#F7CAC9', // Rose Quartz
  '#92A8D1', // Serenity
  '#955251', // Marsala
  '#B565A7', // Radiant Orchid
  '#009B77', // Emerald
  '#DD4124', // Tangerine Tango
  '#D65076', // Honeysuckle
  '#45B8AC', // Turquoise
  '#EFC050', // Mimosa
  '#5B5EA6', // Blue Iris
  '#9B2335', // Chili Pepper
];

export default function MessagesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const isAccountRoute = pathname === '/account';
  const isAccountMessagesTab = !isAccountRoute || searchParams.get('tab') === 'messages';

  // Проверка авторизации
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Вкладка внутри /account использует свою авторизацию/контекст и не должна
    // принудительно редиректить по локальному флагу.
    if (window.location.pathname === '/messages') {
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      if (!isAuthenticated || isAuthenticated !== 'true') {
        router.push('/login');
      }
    }
  }, [router]);

  // Проверка: если это прямой доступ к /messages (не через /account), редиректим
  useEffect(() => {
    // Проверяем, находимся ли мы на странице /messages напрямую
    if (typeof window !== 'undefined' && window.location.pathname === '/messages') {
      const chatId = searchParams.get('chat');
      if (chatId) {
        router.replace(`/account?tab=messages&chat=${chatId}`);
      } else {
        router.replace('/account?tab=messages');
      }
    }
  }, [router, searchParams]);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const myAccount = JSON.parse(localStorage.getItem('myAccount') || 'null');
      if (myAccount?.id && myAccount?.name) return myAccount as User;
    } catch { /* ignore */ }
    return null;
  });
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const myAccount = JSON.parse(localStorage.getItem('myAccount') || 'null');
      if (myAccount?.id) {
        const raw = localStorage.getItem(`messages_chats_cache_${myAccount.id}`);
        if (raw) {
          const cached = JSON.parse(raw);
          if (Array.isArray(cached) && cached.length > 0) return cached;
        }
      }
    } catch { /* ignore */ }
    return [];
  });
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // 🚀 PERFORMANCE: Loading states для LCP optimization
  const [isLoadingChats, setIsLoadingChats] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const myAccount = JSON.parse(localStorage.getItem('myAccount') || 'null');
      if (myAccount?.id) {
        const raw = localStorage.getItem(`messages_chats_cache_${myAccount.id}`);
        if (raw) {
          const cached = JSON.parse(raw);
          if (Array.isArray(cached) && cached.length > 0) return false;
        }
      }
    } catch { /* ignore */ }
    return true;
  });
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);  
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [savedMessageText, setSavedMessageText] = useState('');  // Сохраняем текст инпута при редактировании
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [todoLists, setTodoLists] = useState<any[]>([]);
  const [isDesktopView, setIsDesktopView] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    return !(window.innerWidth < 773 || isTouch);
  });
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1200 : window.innerWidth));

  const [showChatInfo, setShowChatInfo] = useState(false);
  const [chatInfoTab, setChatInfoTab] = useState<'profile' | 'tasks' | 'media' | 'files' | 'links' | 'participants'>('profile');
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [participantSearchQuery, setParticipantSearchQuery] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [isChatListCollapsed, setIsChatListCollapsed] = useState(false); // Сворачивание списка чатов
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null); // Для тултипа свёрнутого списка
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [selectedChatsForForward, setSelectedChatsForForward] = useState<string[]>([]);
  const [isForwardingMessages, setIsForwardingMessages] = useState(false);
  const [showReadByModal, setShowReadByModal] = useState(false);
  const [readByMessage, setReadByMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({});
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Автоматически отключаем режим выделения когда нет выделенных сообщений
  useEffect(() => {
    if (isSelectionMode && selectedMessages.size === 0) {
      setIsSelectionMode(false);
    }
  }, [selectedMessages.size, isSelectionMode]);
  const [showRenameChatModal, setShowRenameChatModal] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({}); // chatId -> userId[]
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageGallery, setImageGallery] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showTextFormatMenu, setShowTextFormatMenu] = useState(false);
  const [formatMenuPosition, setFormatMenuPosition] = useState({ top: 0, left: 0 });
  const [textSelection, setTextSelection] = useState({ start: 0, end: 0, text: '' });
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showMessageContextMenu, setShowMessageContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 });
  const [contextMenuMessage, setContextMenuMessage] = useState<Message | null>(null);
  const [showChatContextMenu, setShowChatContextMenu] = useState(false);
  const [chatContextMenuPosition, setChatContextMenuPosition] = useState({ top: 0, left: 0 });
  const [contextMenuChat, setContextMenuChat] = useState<Chat | null>(null);
  const [isTouchPointer, setIsTouchPointer] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false);
  const [showEventCalendarSelector, setShowEventCalendarSelector] = useState(false);
  const [calendarLists, setCalendarLists] = useState<any[]>([]);
  const [showTaskListSelector, setShowTaskListSelector] = useState(false);
  const [creatingTaskFromMessage, setCreatingTaskFromMessage] = useState<Message | null>(null);
  const [creatingEventFromMessage, setCreatingEventFromMessage] = useState<Message | null>(null);
  const [activePinnedMessageId, setActivePinnedMessageId] = useState<string | null>(null);
  const [selectedChatNearBottom, setSelectedChatNearBottom] = useState(true);
  const [isElectronEnvironment, setIsElectronEnvironment] = useState(false);
  const [desktopComposerDockOffset, setDesktopComposerDockOffset] = useState(140);
  const [notificationSound] = useState(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiuBzvLZiTUIGWi77OSfTRAMUKfj8LZjGwY4ktjyzHksBSR3x/DdkEAKFF607OunVRQJRp/g8r5sIQYrgc3y2Yk1CBlou+zkn00QDFC';
      return audio;
    }
    return null;
  });
  
  // Настройки чата
  const [chatSettings, setChatSettings] = useState({
    bubbleStyle: 'modern' as 'modern' | 'classic' | 'minimal',
    fontSize: 13, // размер в пикселях для десктопа
    fontSizeMobile: 15, // размер в пикселях для мобильных
    bubbleColor: '#545190', // цвет для темной темы
    bubbleColorLight: '#252546', // цвет для светлой темы
    bubbleColorOpponent: '#38414d',
    bubbleColorOpponentLight: '#e5e7eb',
    bubbleTextColor: '#ffffff',
    bubbleTextColorLight: '#ffffff',
    chatBackgroundDark: '#0f172a',
    chatBackgroundLight: '#f8fafc',
    chatBackgroundImageDark: '',
    chatBackgroundImageLight: '',
    chatOverlayImageDark: '',
    chatOverlayImageLight: '',
    chatOverlayScale: 100,
    chatOverlayOpacity: 1,
    bubbleOpacity: 0.92,
    colorPreset: 0
  });
  
  // Функция для определения нужен ли тёмный текст на светлом фоне
  const needsDarkText = (hexColor: string) => {
    // Преобразуем hex в RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Вычисляем яркость (YIQ формула)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128; // Если яркость выше 128 - нужен тёмный текст
  };
  
  // Определяем цвет текста для своих баблов в зависимости от яркости фона
  const currentBubbleColor = theme === 'dark' ? chatSettings.bubbleColor : chatSettings.bubbleColorLight;
  const currentBubbleTextColor = theme === 'dark'
    ? (chatSettings.bubbleTextColor || '')
    : (chatSettings.bubbleTextColorLight || '');
  const useDarkTextOnBubble = needsDarkText(currentBubbleColor);
  const myBubbleTextClass = currentBubbleTextColor ? '' : (useDarkTextOnBubble ? 'text-gray-900' : 'text-white');
  const myBubbleTextMutedClass = currentBubbleTextColor ? '' : (useDarkTextOnBubble ? 'text-gray-700' : 'text-white/70');
  const composerContextOffset = editingMessageId || replyToMessage ? 46 : 0;
  const selectedChat = useMemo(() => {
    if (!selectedChatId) return null;
    return chats.find((chat) => String(chat.id) === String(selectedChatId)) || null;
  }, [chats, selectedChatId]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesListRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const chatTimelineRef = useRef<import('@/components/features/messages/ChatTimeline').ChatTimeline>(null);
  const pendingOutgoingRef = useRef<Message[]>([]);
  const isUserActiveRef = useRef(false);
  const lastActivityTimeRef = useRef(Date.now());
  const lastStatusUpdateRef = useRef(0);
  const statusUpdateInFlightRef = useRef(false);
  const resizeAnimationFrameRef = useRef<number | null>(null);
  const mentionDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const selectionDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastManualChatCloseAtRef = useRef(0);
  const lastTabAutoScrollAtRef = useRef(0);
  const pinnedOverlayDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressPinnedOverlayTapRef = useRef(false);
  const hydratedMessagesCacheRef = useRef<Set<string>>(new Set());
  const hydratedChatsCacheKeyRef = useRef<string | null>(null);
  const activeMessagesChatIdRef = useRef<string | null>(null);
  const latestMessagesRequestSeqRef = useRef(0);
  const latestMessagesRequestByChatRef = useRef<Record<string, number>>({});
  const pollingMessagesInFlightRef = useRef<Record<string, boolean>>({});
  const chatsLoadInFlightRef = useRef(false);
  const lastPollingChatsRefreshAtRef = useRef(0);
  const pendingRestoreChatScrollRef = useRef<string | null>(null);
  const openFromNotificationChatIdRef = useRef<string | null>(null);
  const suppressAutoScrollUntilRef = useRef(0);
  const hasResolvedInitialChatRef = useRef(false);
  const lastReportedChatOpenStateRef = useRef<boolean | null>(null);
  const chatNearBottomRef = useRef<Record<string, boolean>>({});
  const lastMessageTailRef = useRef<{ chatId: string | null; tailKey: string | null }>({ chatId: null, tailKey: null });
  const skipNextAutoScrollRef = useRef<Record<string, boolean>>({});
  // Tracks the 2-second window after chat open when ResizeObserver re-applies the stored snapshot
  /**
   * Получить DOM-контейнер скролла.
   * ChatTimeline управляет своим containerRef — берём его если доступен,
   * иначе fallback на legacyMessagesListRef (для обратной совместимости).
   */
  const getScrollContainer = useCallback((): HTMLDivElement | null => {
    return chatTimelineRef.current?.containerRef.current ?? messagesListRef.current ?? null;
  }, []);

  const isTimelineNearBottom = useCallback((thresholdPx: number = 15) => {
    const container = getScrollContainer();
    if (!container) return true;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceToBottom <= thresholdPx;
  }, [getScrollContainer]);

  const fetchWithTimeout = useCallback(async (url: string, init: RequestInit = {}, timeoutMs: number = 15000) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, []);

  const forceScrollToBottom = useCallback((smooth: boolean = false) => {
    const container = getScrollContainer();
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });

      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });

      if (selectedChat?.id) {
        chatNearBottomRef.current[selectedChat.id] = true;
      }
      setSelectedChatNearBottom(true);
    });
  }, [getScrollContainer, selectedChat?.id]);

  // Simple wrapper: prevents unnecessary re-renders when messages haven't changed
  const setMessagesWithTimelineSnapshot = useCallback((
    chatId: string | null | undefined,
    nextMessages: Message[] | ((prev: Message[]) => Message[]),
    _mode: 'reset' | 'preserve' = 'preserve'
  ) => {
    const normalizedChatId = String(chatId || '').trim() || null;
    if (normalizedChatId && activeMessagesChatIdRef.current && activeMessagesChatIdRef.current !== normalizedChatId) {
      return;
    }

    setMessages((prev) => {
      const resolved = typeof nextMessages === 'function' ? nextMessages(prev) : nextMessages;
      return resolved === prev ? prev : resolved;
    });
  }, []);

  const syncComposerHeight = useCallback((nextValue?: string) => {
    const textarea = messageInputRef.current;
    if (!textarea) return;

    if (typeof nextValue === 'string' && textarea.value !== nextValue) {
      textarea.value = nextValue;
    }

    textarea.style.height = 'auto';
    const minHeight = 44;
    const maxHeight = 120;
    const previousHeight = parseInt(textarea.style.height || `${minHeight}`, 10) || minHeight;
    const hasOverflow = textarea.scrollHeight > maxHeight;
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = hasOverflow ? 'auto' : 'hidden';

    if (nextHeight !== previousHeight && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('composer-resize', { detail: { height: nextHeight } }));
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDesktopComposerDockOffset = () => {
      const composerEl = composerContainerRef.current;
      const electronBottomOffset = Math.max(
        0,
        parseInt(getComputedStyle(document.documentElement).getPropertyValue('--electron-bottomnav-offset') || '0', 10) || 0
      );

      if (!composerEl) {
        setDesktopComposerDockOffset(96 + electronBottomOffset);
        return;
      }

      const composerRect = composerEl.getBoundingClientRect();
      const composerStyles = getComputedStyle(composerEl);
      const composerBottom = Number.parseFloat(composerStyles.bottom || '0');
      const resolvedComposerBottom = Number.isFinite(composerBottom) ? Math.max(0, composerBottom) : 0;
      const nextOffset = Math.max(96, Math.round(composerRect.height + resolvedComposerBottom + electronBottomOffset + 20));
      setDesktopComposerDockOffset(nextOffset);
    };

    // Composer can mount after chat selection; defer first measurement to next frame.
    updateDesktopComposerDockOffset();
    const rafId = requestAnimationFrame(updateDesktopComposerDockOffset);

    const resizeObserver = composerContainerRef.current ? new ResizeObserver(updateDesktopComposerDockOffset) : null;
    if (composerContainerRef.current && resizeObserver) {
      resizeObserver.observe(composerContainerRef.current);
    }

    window.addEventListener('resize', updateDesktopComposerDockOffset);
    window.addEventListener('composer-resize', updateDesktopComposerDockOffset as EventListener);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateDesktopComposerDockOffset);
      window.removeEventListener('composer-resize', updateDesktopComposerDockOffset as EventListener);
    };
  }, [selectedChat?.id]);
  
  // Обёртки для функций с правильной сигнатурой
  const getChatTitleWrapper = useCallback((chat: Chat) => getChatTitle(chat, currentUser, users), [currentUser, users]);
  const getChatAvatarDataWrapper = useCallback((chat: Chat) => getChatAvatarData(chat, currentUser, users), [currentUser, users]);

  const isSameOutgoingCandidate = useCallback((serverMessage: Message, pendingMessage: Message) => {
    if (!serverMessage || !pendingMessage) return false;
    if (serverMessage.authorId !== pendingMessage.authorId) return false;
    if ((serverMessage.content || '').trim() !== (pendingMessage.content || '').trim()) return false;

    const serverTime = new Date(serverMessage.createdAt || 0).getTime();
    const pendingTime = new Date(pendingMessage.createdAt || 0).getTime();
    if (!Number.isFinite(serverTime) || !Number.isFinite(pendingTime)) return false;

    const timeDelta = Math.abs(serverTime - pendingTime);
    if (timeDelta > 120000) return false;

    const serverAttachments = Array.isArray(serverMessage.attachments) ? serverMessage.attachments.length : 0;
    const pendingAttachments = Array.isArray(pendingMessage.attachments) ? pendingMessage.attachments.length : 0;
    if (serverAttachments !== pendingAttachments) return false;

    return true;
  }, []);

  const hasMessagesChanged = useCallback((prevMessages: Message[], nextMessages: Message[]) => {
    if (prevMessages === nextMessages) return false;
    if (prevMessages.length !== nextMessages.length) return true;

    for (let index = 0; index < prevMessages.length; index += 1) {
      const prev = prevMessages[index];
      const next = nextMessages[index];
      if (!prev || !next) return true;
      if (prev.id !== next.id) return true;
      if ((prev.updatedAt || prev.createdAt || '') !== (next.updatedAt || next.createdAt || '')) return true;
      if ((prev.content || '') !== (next.content || '')) return true;

      const prevAttachments = Array.isArray(prev.attachments) ? prev.attachments.length : 0;
      const nextAttachments = Array.isArray(next.attachments) ? next.attachments.length : 0;
      if (prevAttachments !== nextAttachments) return true;
    }

    return false;
  }, []);

  // Функция скролла к конкретному сообщению
  const scrollToMessage = (messageId: string) => {
    const messageEl = messageRefs.current[messageId];
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Подсветка сообщения
      messageEl.classList.add('bg-blue-500/20');
      setTimeout(() => {
        messageEl.classList.remove('bg-blue-500/20');
      }, 2000);
    }
  };
  
  const scrollToFirstUnread = () => {
    if (!selectedChat || !currentUser) return;
    const lastReadMessageId = selectedChat.readMessagesByUser?.[currentUser.id];
    if (!lastReadMessageId) {
      // Если нет прочитанных - скроллим к первому сообщению
      if (messages.length > 0) {
        const firstMessageEl = messageRefs.current[messages[0].id];
        firstMessageEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    
    const lastReadIndex = messages.findIndex(m => m.id === lastReadMessageId);
    if (lastReadIndex !== -1 && lastReadIndex < messages.length - 1) {
      const firstUnreadMessage = messages[lastReadIndex + 1];
      const firstUnreadEl = messageRefs.current[firstUnreadMessage.id];
      if (firstUnreadEl) {
        firstUnreadEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Подсветка первого непрочитанного
        firstUnreadEl.classList.add('bg-cyan-500/20');
        setTimeout(() => {
          firstUnreadEl.classList.remove('bg-cyan-500/20');
        }, 2000);
      }
    }
  };

  const linkedTaskBanner = useMemo(() => {
    if (!selectedChat) return { id: null as string | null, title: null as string | null, status: null as string | null };

    const chatWithTask = selectedChat as Chat & {
      todoId?: string;
      todo_id?: string;
      taskTitle?: string;
    };

    const taskIdRaw = chatWithTask.todoId || chatWithTask.todo_id || null;
    const taskId = taskIdRaw ? String(taskIdRaw).trim() : null;

    if (!taskId) return { id: null as string | null, title: null as string | null, status: null as string | null };

    const taskTitle = chatWithTask.taskTitle || 'Привязано к задаче';
    const taskStatus = (selectedChat as any).discussionStatus || (selectedChat as any).discussion_status || (selectedChat as any).todoStatus || null;
    return { id: taskId, title: taskTitle, status: taskStatus };
  }, [selectedChat]);

  const pinnedMessages = useMemo(() => {
    const pinned = messages.filter((msg) => Boolean(msg?.metadata?.isPinned));
    if (pinned.length === 0) return [] as Message[];
    return pinned.sort((a, b) => {
      const aTime = new Date(a.metadata?.pinnedAt || a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.metadata?.pinnedAt || b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [messages]);

  const activePinnedMessage = useMemo(() => {
    if (pinnedMessages.length === 0) return null;
    if (!activePinnedMessageId) return pinnedMessages[0];
    return pinnedMessages.find((msg) => msg.id === activePinnedMessageId) || pinnedMessages[0];
  }, [pinnedMessages, activePinnedMessageId]);

  const activePinnedMessageIndex = useMemo(() => {
    if (!activePinnedMessage) return -1;
    return pinnedMessages.findIndex((msg) => msg.id === activePinnedMessage.id);
  }, [pinnedMessages, activePinnedMessage]);
  const isPinnedOverlayMobileView = viewportWidth < 773;

  const activePinnedPreview = useMemo(() => {
    if (!activePinnedMessage) return null;
    const contentPreview = (activePinnedMessage.content || '').trim();
    const metadataPreview = (activePinnedMessage.metadata?.preview || '').trim();
    const preview = activePinnedMessage.notificationType === 'message_pin'
      ? (metadataPreview || contentPreview)
      : (contentPreview || metadataPreview);
    if (!preview) return 'Сообщение без текста';
    return preview.length > 110 ? `${preview.slice(0, 110)}...` : preview;
  }, [activePinnedMessage]);



  const getPinnedNavigationMessageId = useCallback((message?: Message | null) => {
    if (!message) return null;
    const targetId = message.notificationType === 'message_pin'
      ? String(message.metadata?.pinnedMessageId || '').trim()
      : '';
    if (targetId) return targetId;
    return String(message.id || '').trim() || null;
  }, []);

  const navigatePinned = useCallback((direction: 'prev' | 'next') => {
    if (pinnedMessages.length <= 1 || activePinnedMessageIndex < 0) return;

    const targetIndex = direction === 'prev'
      ? (activePinnedMessageIndex - 1 + pinnedMessages.length) % pinnedMessages.length
      : (activePinnedMessageIndex + 1) % pinnedMessages.length;

    const targetPinnedMessage = pinnedMessages[targetIndex];
    const targetMessageId = getPinnedNavigationMessageId(targetPinnedMessage);
    if (!targetMessageId) return;

    setActivePinnedMessageId(targetPinnedMessage.id);
    requestAnimationFrame(() => scrollToMessage(targetMessageId));
  }, [activePinnedMessageIndex, pinnedMessages, getPinnedNavigationMessageId]);

  const handlePinnedOverlayPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pinnedOverlayDragStartRef.current = { x: event.clientX, y: event.clientY };
    suppressPinnedOverlayTapRef.current = false;
  }, []);

  const handlePinnedOverlayPointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const start = pinnedOverlayDragStartRef.current;
    pinnedOverlayDragStartRef.current = null;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absY < 18 || absY <= absX + 8) return;

    suppressPinnedOverlayTapRef.current = true;
    if (deltaY < 0) {
      navigatePinned('next');
    } else {
      navigatePinned('prev');
    }

    window.setTimeout(() => {
      suppressPinnedOverlayTapRef.current = false;
    }, 120);
  }, [navigatePinned]);

  useEffect(() => {
    if (!selectedChat) {
      setActivePinnedMessageId(null);
      return;
    }

    if (pinnedMessages.length === 0) {
      setActivePinnedMessageId(null);
      return;
    }

    const hasCurrentPinned = activePinnedMessageId
      ? pinnedMessages.some((msg) => msg.id === activePinnedMessageId)
      : false;

    if (!hasCurrentPinned) {
      setActivePinnedMessageId(pinnedMessages[0].id);
    }
  }, [selectedChat?.id, pinnedMessages, activePinnedMessageId]);

  const isNoAutoScrollChat = useCallback((chat: Chat | null | undefined) => {
    if (!chat) return false;
    const chatId = String(chat.id || '');
    return Boolean(
      chat.isFavoritesChat
      || chat.isNotificationsChat
      || chatId.startsWith('favorites_')
      || chatId.startsWith('notifications-')
      || chatId.startsWith('notifications_')
      || chat.title === 'Избранное'
      || chat.title === 'Уведомления'
    );
  }, []);

  const suppressAutoScrollTemporarily = useCallback((durationMs: number = 1200) => {
    suppressAutoScrollUntilRef.current = Date.now() + durationMs;
  }, []);

  const isAutoScrollSuppressed = useCallback(() => {
    return Date.now() < suppressAutoScrollUntilRef.current;
  }, []);

  const getMessageTailKey = useCallback((message: Message | undefined | null) => {
    if (!message) return null;

    const attachmentCount = Array.isArray(message.attachments) ? message.attachments.length : 0;
    return [
      String(message.chatId || ''),
      String(message.authorId || ''),
      String(message.replyToId || ''),
      String(message.content || ''),
      String(attachmentCount),
    ].join('|');
  }, []);

  // Функция выбора чата с обновлением URL и localStorage
  const selectChat = useCallback((chat: Chat | null, options?: { fromNotification?: boolean; syncUrl?: boolean; restoreComposer?: boolean }) => {
    const previousChat = selectedChat;
    const openedFromNotification = Boolean(options?.fromNotification && chat);
    const shouldSyncUrl = options?.syncUrl !== false;
    const shouldRestoreComposer = options?.restoreComposer !== false;
    if (!chat) {
      lastManualChatCloseAtRef.current = Date.now();
    }

    if (previousChat) {
      chatTimelineRef.current?.saveScrollPosition();
      const wasNearBottom = isTimelineNearBottom();
      chatNearBottomRef.current[previousChat.id] = wasNearBottom;
      if (previousChat.id === selectedChatId) {
        setSelectedChatNearBottom(wasNearBottom);
      }
    }

    const currentMessage = messageInputRef.current?.value || '';

    // Предзагружаем кэш сообщений синхронно — ДО первого рендера нового чата.
    // Это позволяет ChatTimeline получить сообщения в componentDidMount и
    // восстановить scroll position без промигивания (нет пустого frame).
    let cachedInitMessages: Message[] = [];
    if (chat?.id && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`messages_chat_cache_${chat.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedInitMessages = parsed;
            // Помечаем как гидратированный — loadMessages не будет читать кэш повторно
            hydratedMessagesCacheRef.current.add(chat.id);
          }
        }
      } catch { /* ignore */ }
    }

    activeMessagesChatIdRef.current = chat?.id || null;
    // Signal/Telegram-стиль: если есть кэш - показываем его мгновенно, без skeleton
    // Если кэша нет - показываем предыдущий чат замороженным (не чистим messages сразу)
    if (cachedInitMessages.length > 0) {
      // Есть кэш - мгновенное переключение
      setMessagesWithTimelineSnapshot(chat?.id || null, cachedInitMessages, 'reset');
      setIsLoadingMessages(false);
      // Используем startTransition для обновления UI синхронно с данными
      startTransition(() => {
        setSelectedChatId(chat?.id || null);
        setShowChatInfo(false);
        setIsSelectionMode(false);
        setSelectedMessages(new Set());
      });
    } else if (chat) {
      // Нет кэша - показываем предыдущие messages пока грузятся новые
      // (не чистим messages, будет freeze-эффект как в Telegram)
      setIsLoadingMessages(true);
      // Используем startTransition для плавного перехода
      startTransition(() => {
        setSelectedChatId(chat?.id || null);
        setShowChatInfo(false);
        setIsSelectionMode(false);
        setSelectedMessages(new Set());
      });
      // messages останутся от предыдущего чата и будут выглядеть как "loading" overlay
    } else {
      // Закрытие чата - чистим
      setMessagesWithTimelineSnapshot(null, [], 'reset');
      setIsLoadingMessages(false);
      startTransition(() => {
        setSelectedChatId(null);
        setShowChatInfo(false);
        setIsSelectionMode(false);
        setSelectedMessages(new Set());
      });
    }

    pendingRestoreChatScrollRef.current = chat?.id || null;
    openFromNotificationChatIdRef.current = openedFromNotification && chat ? chat.id : null;
    suppressAutoScrollTemporarily(1800);
    if (chat?.id) {
      chatNearBottomRef.current[chat.id] = false;
      skipNextAutoScrollRef.current[chat.id] = true;
    }

    // Откладываем тяжёлую работу с drafts/composer после клика
    setTimeout(() => {
      if (previousChat && currentMessage.trim()) {
        setChatDrafts(prev => ({
          ...prev,
          [previousChat.id]: currentMessage
        }));
      } else if (previousChat && !currentMessage.trim()) {
        setChatDrafts(prev => {
          const newDrafts = { ...prev };
          delete newDrafts[previousChat.id];
          return newDrafts;
        });
      }

      const draftText = shouldRestoreComposer && chat ? (chatDrafts[chat.id] || '') : '';
      setNewMessage(draftText);

      if (!messageInputRef.current) return;
      syncComposerHeight(draftText);
    }, 0);
    
    if (typeof window !== 'undefined') {
      if (!chat) {
        localStorage.removeItem('selectedChatId');
        if (shouldSyncUrl) {
          router.replace('/account?tab=messages', { scroll: false });
        }
        return;
      }

      localStorage.setItem('selectedChatId', chat.id);
      localStorage.setItem('lastOpenedChatId', chat.id);
      if (shouldSyncUrl) {
        router.replace(`/account?tab=messages&chat=${encodeURIComponent(chat.id)}`, { scroll: false });
      }
    }
  }, [selectedChat, chatDrafts, messageInputRef, syncComposerHeight, suppressAutoScrollTemporarily, router, setMessagesWithTimelineSnapshot]);

  useEffect(() => {
    activeMessagesChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  // Загрузка настроек чата
  useEffect(() => {
    const defaultSettings = {
      bubbleStyle: 'modern' as 'modern' | 'classic' | 'minimal',
      fontSize: 13,
      fontSizeMobile: 15,
      bubbleColor: '#545190',
      bubbleColorLight: '#252546',
      bubbleTextColor: '#ffffff',
      bubbleTextColorLight: '#ffffff',
      bubbleColorOpponent: '#38414d',
      bubbleColorOpponentLight: '#e5e7eb',
      chatBackgroundDark: '#0f172a',
      chatBackgroundLight: '#f8fafc',
      chatBackgroundImageDark: '',
      chatBackgroundImageLight: '',
      chatOverlayImageDark: '',
      chatOverlayImageLight: '',
      chatOverlayScale: 100,
      chatOverlayOpacity: 1,
      bubbleOpacity: 0.92,
      colorPreset: 0,
    };

    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      const settings = { ...defaultSettings, ...JSON.parse(savedSettings) };
      setChatSettings(settings);
      console.log('[Messages] Загружены настройки чата:', {
        overlayDark: settings.chatOverlayImageDark,
        overlayLight: settings.chatOverlayImageLight,
        scale: settings.chatOverlayScale,
        opacity: settings.chatOverlayOpacity
      });
      // Устанавливаем CSS переменную для desktop font size при загрузке
      if (settings.fontSize) {
        document.documentElement.style.setProperty('--desktop-font-size', `${settings.fontSize}px`);
      }
    } else {
      console.log('[Messages] Нет сохраненных настроек, используем дефолтные');
    }
    
    // Слушатель изменений настроек
    const handleSettingsChange = (e: CustomEvent) => {
      setChatSettings((prev) => ({ ...prev, ...(e.detail || {}) }));
      // Обновляем CSS переменную для desktop font size
      if (e.detail.fontSize) {
        document.documentElement.style.setProperty('--desktop-font-size', `${e.detail.fontSize}px`);
      }
    };
    
    window.addEventListener('chatSettingsChanged', handleSettingsChange as EventListener);
    return () => {
      window.removeEventListener('chatSettingsChanged', handleSettingsChange as EventListener);
    };
  }, []);

  useEffect(() => {
    console.log('useEffect[]: Loading current user and users');
    loadCurrentUser();
    loadUsers();
  }, []);

  // Обработчик открытия чата из уведомлений Electron
  useEffect(() => {
    if (typeof window === 'undefined' || !window.sharDesktop?.onOpenChat) return;

    const unsubscribe = window.sharDesktop.onOpenChat((chatId: string) => {
      console.log('Opening chat from notification:', chatId);
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        selectChat(chat, { fromNotification: true });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [chats]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const syncPointer = () => {
      setIsTouchPointer(mediaQuery.matches);
    };

    syncPointer();
    mediaQuery.addEventListener('change', syncPointer);

    return () => {
      mediaQuery.removeEventListener('change', syncPointer);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsDesktopView(!(window.innerWidth < 773 || isTouchPointer));
  }, [isTouchPointer]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewportWidth = () => {
      setViewportWidth((prev) => (prev === window.innerWidth ? prev : window.innerWidth));
    };

    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth);

    return () => {
      window.removeEventListener('resize', updateViewportWidth);
    };
  }, []);

  // Периодическое обновление статуса пользователя и загрузка статусов других пользователей
  useEffect(() => {
    if (!currentUser) return;

    void updateUserStatus({ isOnline: true, force: true });
    void loadUserStatuses();

    const statusInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void updateUserStatus({ isOnline: true });
    }, 20000);

    const usersStatusInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void loadUserStatuses();
    }, 20000);

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        void updateUserStatus({ isOnline: false, force: true });
      } else {
        void updateUserStatus({ isOnline: true, force: true });
        void loadUserStatuses();
      }
    };

    const handleBeforeUnload = () => {
      fetch(`/api/users/${currentUser.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isOnline: false,
          lastSeen: new Date().toISOString()
        }),
        keepalive: true
      }).catch(() => undefined);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(statusInterval);
      clearInterval(usersStatusInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      void updateUserStatus({ isOnline: false, force: true });
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (selectedChat) {
      // Загружаем сообщения сразу без задержки
      void loadMessages(selectedChat.id, false);
      
      // Polling для обновления сообщений: не мешаем вводу в composer
      const chatId = selectedChat.id;
      const interval = setInterval(() => {
        // Не запрашиваем данные если вкладка не активна
        if (typeof document !== 'undefined' && document.hidden) return;

        // Не перетираем основной поток во время ввода текста
        if (typeof document !== 'undefined' && messageInputRef.current === document.activeElement) return;
        
        // Не обновляем если пользователь активен (печатает или взаимодействует)
        const timeSinceLastActivity = Date.now() - lastActivityTimeRef.current;
        if (!isUserActiveRef.current || timeSinceLastActivity > 1200) {
          loadMessages(chatId, true);
        }
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [selectedChat?.id]);

  // [ChatTimeline] Скролл-логика полностью перенесена в ChatTimeline.tsx (Signal-like класс-компонент).
  // Здесь только автоскролл к новым сообщениям когда пользователь у дна.
  useEffect(() => {
    if (!selectedChat || isLoadingMessages) return;
    if (pendingRestoreChatScrollRef.current === selectedChat.id) return;
    if (isAutoScrollSuppressed()) return;
    if (isNoAutoScrollChat(selectedChat)) return;

    const tailKey = messages.length > 0 ? getMessageTailKey(messages[messages.length - 1]) : null;
    const previousTail = lastMessageTailRef.current;

    if (previousTail.chatId !== selectedChat.id) {
      lastMessageTailRef.current = { chatId: selectedChat.id, tailKey };
      return;
    }

    if (skipNextAutoScrollRef.current[selectedChat.id]) {
      skipNextAutoScrollRef.current[selectedChat.id] = false;
      lastMessageTailRef.current = { chatId: selectedChat.id, tailKey };
      return;
    }

    if (previousTail.tailKey === tailKey) return;

    // ChatTimeline сам управляет позицией скролла через getSnapshotBeforeUpdate.
    // Здесь автоскролл только если пользователь был у дна.
    const shouldStickToBottom = chatNearBottomRef.current[selectedChat.id] ?? true;
    lastMessageTailRef.current = { chatId: selectedChat.id, tailKey };

    if (!shouldStickToBottom) return;

    const container = getScrollContainer();
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'auto',
      });
      chatNearBottomRef.current[selectedChat.id] = true;
      setSelectedChatNearBottom(true);
    });
  }, [selectedChat, messages, isLoadingMessages, isAutoScrollSuppressed, isNoAutoScrollChat, getMessageTailKey, getScrollContainer]);

  useEffect(() => {
    if (showTaskPicker) {
      loadTasks();
    }
  }, [showTaskPicker]);

  useEffect(() => {
    if (showEventPicker) {
      loadEvents();
    }
  }, [showEventPicker]);

  // Открываем стартовый чат один раз: сначала URL, затем fallback из localStorage.
  useEffect(() => {
    if (typeof window === 'undefined' || chats.length === 0 || hasResolvedInitialChatRef.current) return;
    if (!isAccountMessagesTab) return;

    hasResolvedInitialChatRef.current = true;

    const params = new URLSearchParams(window.location.search);
    let chatId = params.get('chat');

    if (!chatId) {
      chatId = localStorage.getItem('selectedChatId') || localStorage.getItem('lastOpenedChatId');
    }

    if (!chatId) return;

    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      selectChat(chat, { syncUrl: true });
    }
  }, [chats, selectChat, isAccountMessagesTab]);

  // После инициализации URL является источником истины для активного чата.
  useEffect(() => {
    if (!hasResolvedInitialChatRef.current || chats.length === 0) return;
    if (!isAccountMessagesTab) return;

    const targetChatId = String(searchParams.get('chat') || '').trim();
    const currentChatId = String(selectedChat?.id || '').trim();

    // Если URL больше не содержит chat-параметр, но чат всё ещё выбран в стейте —
    // это значит либо browser back, либо краткий период до обновления searchParams от router.replace.
    // Проверяем реальный URL (router.replace обновляет history синхронно через replaceState):
    // если и он пуст — это browser back, закрываем чат.
    if (!targetChatId) {
      if (typeof window !== 'undefined') {
        const fallbackChatId = String(
          localStorage.getItem('selectedChatId') || localStorage.getItem('lastOpenedChatId') || ''
        ).trim();
        if (fallbackChatId && fallbackChatId !== currentChatId) {
          const fallbackChat = chats.find((item) => String(item.id) === fallbackChatId);
          if (fallbackChat) {
            selectChat(fallbackChat, { syncUrl: true, restoreComposer: false });
          }
        }
      }
      return;
    }

    if (targetChatId === currentChatId) return;

    const chat = chats.find((item) => String(item.id) === targetChatId);
    if (chat) {
      selectChat(chat, { syncUrl: false, restoreComposer: false });
    }
  }, [searchParams, chats, selectedChat?.id, selectChat, isAccountMessagesTab]);
  
  // Отслеживание глобальной активности пользователя для предотвращения обновлений
  useEffect(() => {
    const handleMouseDown = () => {
      isUserActiveRef.current = true;
      lastActivityTimeRef.current = Date.now();
    };
    
    const handleMouseUp = () => {
      setTimeout(() => {
        isUserActiveRef.current = false;
      }, 500);
    };
    
    const handleDragStart = () => {
      isUserActiveRef.current = true;
      lastActivityTimeRef.current = Date.now();
    };
    
    const handleDragEnd = () => {
      setTimeout(() => {
        isUserActiveRef.current = false;
      }, 1000);
    };
    
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  const loadCurrentUser = async () => {
    try {
      const myAccountStr = localStorage.getItem('myAccount');
      
      if (!myAccountStr) {
        const username = localStorage.getItem('username');
        if (!username) return;
        
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const users = await usersRes.json();
          let currentUser = users.find((u: any) => u.name === username || u.username === username);
          
          if (currentUser) {
            localStorage.setItem('myAccount', JSON.stringify({ id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }));
            setCurrentUser(currentUser);
            return;
          } else {
            // Получаем Telegram ID если доступен
            const telegramId = localStorage.getItem('telegramId');
            const telegramUsername = localStorage.getItem('telegramUsername');
            
            const createRes = await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                name: username,
                email: `${username}@local.dev`,
                password: 'default123',
                role: 'user',
                ...(telegramId && { telegramId }),
                ...(telegramUsername && { telegramUsername })
              })
            });
            
            if (createRes.ok) {
              const newUser = await createRes.json();
              if (newUser && newUser.id) {
                localStorage.setItem('myAccount', JSON.stringify({ id: newUser.id, name: newUser.name, avatar: newUser.avatar }));
                setCurrentUser(newUser);
                return;
              } else {
                console.error('Invalid user data received:', newUser);
              }
            } else if (createRes.status === 409) {
              const retryRes = await fetch('/api/users');
              if (retryRes.ok) {
                const retryUsers = await retryRes.json();
                const existingUser = retryUsers.find((u: any) => 
                  u.name === username || u.username === username || u.email === `${username}@local.dev`
                );
                if (existingUser) {
                  localStorage.setItem('myAccount', JSON.stringify({ id: existingUser.id, name: existingUser.name, avatar: existingUser.avatar }));
                  setCurrentUser(existingUser);
                  return;
                }
              }
            }
          }
        }
        return;
      }
      
      const myAccount = JSON.parse(myAccountStr);
      const myAccountId = String(myAccount?.id || '').trim();

      if (!myAccountId) {
        localStorage.removeItem('myAccount');
        return;
      }

      let res: Response | null = null;
      try {
        res = await fetch(`/api/users/${encodeURIComponent(myAccountId)}`, { cache: 'no-store' });
      } catch (fetchError) {
        console.warn('Failed to fetch current user by id, fallback to users list:', fetchError);
      }

      if (res?.ok) {
        const user = await res.json();
        // Обновляем localStorage с актуальными данными включая аватар
        localStorage.setItem('myAccount', JSON.stringify({ id: user.id, name: user.name, avatar: user.avatar }));
        setCurrentUser(user);
      } else {
        localStorage.removeItem('myAccount');
        const username = localStorage.getItem('username');
        if (username) {
          const usersRes = await fetch('/api/users');
          if (usersRes.ok) {
            const users = await usersRes.json();
            const existingUser = users.find((u: any) => u.name === username || u.username === username);
            
            if (existingUser) {
              localStorage.setItem('myAccount', JSON.stringify({ id: existingUser.id, name: existingUser.name, avatar: existingUser.avatar }));
              setCurrentUser(existingUser);
              return;
            }
          }
          
          // Получаем Telegram ID если доступен
          const telegramId = localStorage.getItem('telegramId');
          const telegramUsername = localStorage.getItem('telegramUsername');
          
          const createRes = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: username,
              email: `${username}@local.dev`,
              password: 'default123',
              role: 'user',
              ...(telegramId && { telegramId }),
              ...(telegramUsername && { telegramUsername })
            })
          });
          
          if (createRes.ok) {
            const newUser = await createRes.json();
            localStorage.setItem('myAccount', JSON.stringify({ id: newUser.id, name: newUser.name, avatar: newUser.avatar }));
            setCurrentUser(newUser);
          }
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        // Генерируем shortId для пользователей если его нет
        const usersWithShortId = data.map((user: User) => ({
          ...user,
          shortId: user.shortId || generateShortId(user.name || user.username || user.email || user.id)
        }));
        setUsers(usersWithShortId);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };
  
  const updateUserStatus = async ({ isOnline = true, force = false }: { isOnline?: boolean; force?: boolean } = {}) => {
    if (!currentUser) return;

    const now = Date.now();
    const minInterval = 15000;

    if (!force && statusUpdateInFlightRef.current) return;
    if (!force && now - lastStatusUpdateRef.current < minInterval) return;

    statusUpdateInFlightRef.current = true;
    lastStatusUpdateRef.current = now;

    try {
      await fetch(`/api/users/${currentUser.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isOnline,
          lastSeen: new Date().toISOString()
        })
      });

      const nextLastSeen = new Date().toISOString();
      setUsers(prevUsers => prevUsers.map(user =>
        String(user.id) === String(currentUser.id)
          ? { ...user, isOnline, lastSeen: nextLastSeen }
          : user
      ));

      setCurrentUser(prev => prev
        ? { ...prev, isOnline, lastSeen: nextLastSeen }
        : prev
      );
    } catch (error) {
      console.error('Error updating user status:', error);
    } finally {
      statusUpdateInFlightRef.current = false;
    }
  };
  
  const loadUserStatuses = async () => {
    try {
      const res = await fetch('/api/users/statuses', { cache: 'no-store' });
      if (res.ok) {
        const statuses = await res.json();
        const statusList = Array.isArray(statuses) ? statuses : [];
        const statusById = new Map<string, any>();

        statusList.forEach((status: any) => {
          const rawId = status?.id ?? status?.userId ?? status?.user_id;
          const normalizedId = String(rawId ?? '').trim();
          if (!normalizedId) return;
          statusById.set(normalizedId, status);
        });

        setUsers(prevUsers => 
          prevUsers.map(user => {
            const status = statusById.get(String(user.id));
            if (!status) return user;

            const isOnline = status.isOnline ?? status.is_online ?? false;
            const lastSeen = status.lastSeen ?? status.last_seen ?? user.lastSeen;

            return { ...user, isOnline, lastSeen };
          })
        );
      }
    } catch (error) {
      console.error('Error loading user statuses:', error);
    }
  };

  // Функция генерации короткого ID из имени
  const generateShortId = (name: string): string => {
    // Берем первые буквы слов, или первые 3-4 символа
    const words = name.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 1) {
      // Если несколько слов - берем первые буквы
      return words.map(w => w[0]).join('').toLowerCase().substring(0, 4);
    } else {
      // Если одно слово - берем первые 3-4 символа
      return name.toLowerCase().replace(/[^a-z0-9а-я]/gi, '').substring(0, 4);
    }
  };

  const loadTasks = async () => {
    if (!currentUser) return;
    
    try {
      // Загружаем все задачи (для отображения общих задач с собеседником)
      const res = await fetch(`/api/todos`);
      if (res.ok) {
        const data = await res.json();
        console.log('[Messages] loadTasks - Получены данные:', data);
        // API возвращает объект с полем todos
        const tasksArray = data.todos || [];
        setTasks(tasksArray);
        const lists = Array.isArray(data.lists) ? data.lists : (Array.isArray(data) ? data : []);
        console.log('[Messages] loadTasks - Установка списков:', lists);
        setTodoLists(lists);
        console.log('[Messages] Loaded all tasks:', tasksArray.length, 'lists:', lists.length);
      } else {
        console.error('[Messages] loadTasks - Ошибка ответа API, статус:', res.status);
      }
    } catch (error) {
      console.error('[Messages] Error loading tasks:', error);
      setTasks([]);
    }
  };

  const loadEvents = async () => {
    if (!currentUser) return;
    
    try {
      const res = await fetch(`/api/events?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        const eventsArray = data.events || [];
        setEvents(eventsArray);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    }
  };

  const activeTabParam = searchParams.get('tab');

  // Функции форматирования текста
  const handleTextSelection = useCallback((contextMenuPoint?: { x: number; y: number }) => {
    if (!messageInputRef.current) return;
    
    const start = messageInputRef.current.selectionStart;
    const end = messageInputRef.current.selectionEnd;
    const selectedText = messageInputRef.current.value.substring(start, end);
    const hasSelection = Boolean(selectedText && start !== end);
    setTextSelection({ start, end, text: hasSelection ? selectedText : '' });

    if (!hasSelection) {
      setShowTextFormatMenu(false);
      return;
    }

    if (!messageInputRef.current || !composerContainerRef.current) return;
    const composerRect = composerContainerRef.current.getBoundingClientRect();

    const menuWidth = 220;
    const menuHeight = 280;

    let menuLeft = contextMenuPoint?.x ?? (composerRect.left + composerRect.width / 2);
    let menuTop = contextMenuPoint?.y ?? (composerRect.top - 5);

    if (menuLeft + menuWidth / 2 > window.innerWidth - 24) {
      menuLeft = window.innerWidth - menuWidth / 2 - 24;
    }
    if (menuLeft - menuWidth / 2 < 24) {
      menuLeft = menuWidth / 2 + 24;
    }
    if (menuTop - menuHeight < 8) {
      menuTop = menuHeight + 8;
    }

    setFormatMenuPosition({
      top: menuTop,
      left: menuLeft
    });
    setShowTextFormatMenu(true);

    if (hasSelection) {
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.setSelectionRange(start, end);
        }
      }, 0);
    }
  }, []);

  const applyFormatting = (formatType: 'bold' | 'italic' | 'underline' | 'link' | 'strikethrough' | 'code' | 'spoiler' | 'copy' | 'paste' | 'cut' | 'selectAll') => {
    if (!messageInputRef.current) return;
    
    const selectionStart = messageInputRef.current.selectionStart ?? 0;
    const selectionEnd = messageInputRef.current.selectionEnd ?? 0;
    const selectionText = messageInputRef.current.value.substring(selectionStart, selectionEnd);
    const hasCurrentSelection = selectionStart !== selectionEnd;
    const hasSavedSelection = textSelection.start !== textSelection.end;
    const start = hasCurrentSelection ? selectionStart : (hasSavedSelection ? textSelection.start : selectionStart);
    const end = hasCurrentSelection ? selectionEnd : (hasSavedSelection ? textSelection.end : selectionEnd);
    const text = hasCurrentSelection ? selectionText : (textSelection.text || selectionText);
    
    // Операции буфера обмена
    if (formatType === 'copy') {
      navigator.clipboard.writeText(text);
      setShowTextFormatMenu(false);
      return;
    }
    
    if (formatType === 'cut') {
      navigator.clipboard.writeText(text);
      const currentValue = messageInputRef.current.value;
      const newText = currentValue.substring(0, start) + currentValue.substring(end);
      messageInputRef.current.value = newText;
      setNewMessage(newText);
      setShowTextFormatMenu(false);
      syncComposerHeight(newText);
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.focus();
          messageInputRef.current.setSelectionRange(start, start);
        }
      }, 0);
      return;
    }
    
    if (formatType === 'paste') {
      const runPaste = async () => {
        try {
          const clipboardApi = navigator.clipboard as Clipboard & { read?: () => Promise<ClipboardItem[]> };

          if (clipboardApi?.read) {
            const items = await clipboardApi.read();
            const files: File[] = [];

            for (const item of items) {
              for (const type of item.types) {
                if (!type.startsWith('image/') && !type.startsWith('application/')) continue;
                const blob = await item.getType(type);
                const extension = type.includes('/') ? type.split('/')[1] : 'bin';
                const fileName = `clipboard-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${extension}`;
                files.push(new globalThis.File([blob], fileName, { type, lastModified: Date.now() }));
              }
            }

            if (files.length > 0) {
              await uploadFilesFromClipboard(files);
              setShowTextFormatMenu(false);
              return;
            }
          }

          const clipText = await navigator.clipboard.readText();
          if (!messageInputRef.current) return;
          const currentValue = messageInputRef.current.value;
          const newText = currentValue.substring(0, start) + clipText + currentValue.substring(end);
          messageInputRef.current.value = newText;
          setNewMessage(newText);
          setShowTextFormatMenu(false);
          syncComposerHeight(newText);
          setTimeout(() => {
            if (messageInputRef.current) {
              messageInputRef.current.focus();
              messageInputRef.current.setSelectionRange(start + clipText.length, start + clipText.length);
            }
          }, 0);
        } catch {
          setShowTextFormatMenu(false);
        }
      };

      void runPaste();
      return;
    }
    
    if (formatType === 'selectAll') {
      messageInputRef.current.select();
      setShowTextFormatMenu(false);
      return;
    }
    
    let formattedText = '';
    
    switch (formatType) {
      case 'bold':
        formattedText = `**${text}**`;
        break;
      case 'italic':
        formattedText = `*${text}*`;
        break;
      case 'underline':
        formattedText = `__${text}__`;
        break;
      case 'strikethrough':
        formattedText = `~~${text}~~`;
        break;
      case 'code':
        formattedText = `\`${text}\``;
        break;
      case 'spoiler':
        formattedText = `||${text}||`;
        break;
      case 'link':
        setShowTextFormatMenu(false);
        setShowLinkModal(true);
        return;
    }
    
    // Работаем напрямую с textarea через ref
    const currentValue = messageInputRef.current.value;
    const newText = currentValue.substring(0, start) + formattedText + currentValue.substring(end);
    messageInputRef.current.value = newText;
    
    // Обновляем state для синхронизации
    setNewMessage(newText);
    setShowTextFormatMenu(false);
    syncComposerHeight(newText);
    
    // Возвращаем фокус на textarea
    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
        const newCursorPos = start + formattedText.length;
        messageInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleLinkSubmit = () => {
    if (!messageInputRef.current || !linkUrl.trim()) {
      setShowLinkModal(false);
      setLinkUrl('');
      return;
    }

    const { start, end, text } = textSelection;
    const formattedText = `[${text}](${linkUrl.trim()})`;
    
    const currentValue = messageInputRef.current.value;
    const newText = currentValue.substring(0, start) + formattedText + currentValue.substring(end);
    messageInputRef.current.value = newText;
    
    setNewMessage(newText);
    setShowLinkModal(false);
    setLinkUrl('');
    syncComposerHeight(newText);
    
    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
        const newCursorPos = start + formattedText.length;
        messageInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const uploadFilesFromClipboard = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    if (isUploadingAttachments) return;

    const uploadFileWithProgress = (file: File, onProgress: (progress: number) => void) => {
      return new Promise<{ url: string }>((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file, file.name || `clipboard-${Date.now()}`);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const progress = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
          onProgress(progress);
        };

        xhr.onload = () => {
          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
            return;
          }

          try {
            const data = JSON.parse(xhr.responseText || '{}');
            resolve(data);
          } catch {
            reject(new Error('Invalid upload response'));
          }
        };

        xhr.onerror = () => reject(new Error('Upload network error'));
        xhr.onabort = () => reject(new Error('Upload aborted'));
        xhr.send(formData);
      });
    };

    const pendingItems = files.map((file) => ({
      clientUploadId: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'uploading' as const,
      progress: 0,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      name: file.name || `clipboard-${Date.now()}`,
      url: '',
    }));

    setAttachments((prev) => [...prev, ...pendingItems]);
    setIsUploadingAttachments(true);

    await Promise.all(files.map(async (file, index) => {
      const clientUploadId = pendingItems[index].clientUploadId;

      try {
        const uploadData = await uploadFileWithProgress(file, (progress) => {
          setAttachments((prev) => prev.map((att: any) => {
            if (att.clientUploadId !== clientUploadId) return att;
            return {
              ...att,
              progress,
            };
          }));
        });

        setAttachments((prev) => prev.map((att: any) => {
          if (att.clientUploadId !== clientUploadId) return att;
          return {
            ...att,
            status: 'ready',
            progress: 100,
            url: uploadData.url,
          };
        }));
      } catch (error) {
        console.error('Error uploading clipboard file:', error);
        setAttachments((prev) => prev.map((att: any) => {
          if (att.clientUploadId !== clientUploadId) return att;
          return {
            ...att,
            status: 'error',
            progress: 0,
          };
        }));
      }
    }));

    setIsUploadingAttachments(false);
  }, [isUploadingAttachments, setAttachments, setIsUploadingAttachments]);

  const loadChats = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    if (chatsLoadInFlightRef.current) {
      return;
    }

    chatsLoadInFlightRef.current = true;

    const cacheKey = `messages_chats_cache_${currentUser.id}`;
    if (hydratedChatsCacheKeyRef.current !== cacheKey) {
      hydratedChatsCacheKeyRef.current = cacheKey;
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cachedChats = JSON.parse(cachedRaw);
          if (Array.isArray(cachedChats) && cachedChats.length > 0) {
            setChats((prev) => (prev.length > 0 ? prev : cachedChats));
            setIsLoadingChats(false);
          }
        }
      } catch (error) {
        console.warn('Failed to restore chats cache:', error);
      }
    }

    // Убрали setIsLoadingChats(true) - loader только при initial load
    try {
      const res = await fetchWithTimeout(`/api/chats?user_id=${currentUser.id}&include_archived=true`, { cache: 'no-store' }, 15000);
      
      if (res.ok) {
        let data = await res.json();

        const normalizePinMap = (value: unknown): Record<string, boolean> => {
          if (!value || typeof value !== 'object') return {};
          return Object.entries(value as Record<string, unknown>).reduce<Record<string, boolean>>((acc, [key, raw]) => {
            if (typeof raw === 'string') {
              acc[key] = raw.trim().toLowerCase() === 'true';
            } else {
              acc[key] = raw === true;
            }
            return acc;
          }, {});
        };

        const hasPinForUser = (pinMapValue: unknown, userIdValue: string): boolean => {
          const pinMap = pinMapValue && typeof pinMapValue === 'object'
            ? (pinMapValue as Record<string, unknown>)
            : {};
          const normalizeId = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

          const direct = pinMap[userIdValue];
          if (typeof direct !== 'undefined') {
            if (typeof direct === 'string') return direct.trim().toLowerCase() === 'true';
            return direct === true;
          }

          const normalizedUserId = normalizeId(userIdValue);
          for (const [key, raw] of Object.entries(pinMap)) {
            if (normalizeId(key) === normalizedUserId) {
              if (typeof raw === 'string') return raw.trim().toLowerCase() === 'true';
              return raw === true;
            }
          }

          return false;
        };
        
        const hasNotificationsChat = data.some((chat: any) => chat.isNotificationsChat || chat.isSystemChat);
        const hasFavoritesChat = data.some((chat: any) => chat.isFavoritesChat);
        data = data.map((chat: any) => ({
          ...chat,
          pinnedByUser: normalizePinMap(chat.pinnedByUser || chat.pinned_by_user),
        }));
        
        if (!hasFavoritesChat) {
          const favoritesChatId = `favorites_${currentUser.id}`;
          const favoritesChat = {
            id: favoritesChatId,
            title: 'Избранное',
            isGroup: false,
            isFavoritesChat: true,
            participantIds: [currentUser.id],
            createdAt: new Date().toISOString(),
            readMessagesByUser: {},
            pinnedByUser: {},
            unreadCount: 0
          };
          data = [favoritesChat, ...data];
        }
        
        // Получаем или создаем чат уведомлений из backend
        if (!hasNotificationsChat) {
          try {
            const notifRes = await fetchWithTimeout(`/api/chats/notifications/${currentUser.id}`, { cache: 'no-store' }, 10000);
            if (notifRes.ok) {
              const notificationsChat = await notifRes.json();
              notificationsChat.pinnedByUser = normalizePinMap(notificationsChat.pinnedByUser || notificationsChat.pinned_by_user);
              data = [notificationsChat, ...data];
            }
          } catch (e) {
            console.error('Error fetching notifications chat:', e);
          }
        }
        
        const getChatSignature = (chat: any) => {
          const currentUserId = String(currentUser.id || '');
          return [
            String(chat?.id || ''),
            String(chat?.updatedAt || ''),
            String(chat?.unreadCount || 0),
            String(chat?.lastMessage?.id || ''),
            String(chat?.lastMessage?.createdAt || ''),
            String(chat?.lastMessage?.content || ''),
            hasPinForUser(chat?.pinnedByUser || chat?.pinned_by_user, currentUserId) ? '1' : '0',
          ].join('|');
        };

        const areChatListsEquivalent = (prevChats: Chat[], nextChats: any[]): boolean => {
          if (prevChats.length !== nextChats.length) return false;
          for (let index = 0; index < prevChats.length; index += 1) {
            if (getChatSignature(prevChats[index]) !== getChatSignature(nextChats[index])) {
              return false;
            }
          }
          return true;
        };

        // Оптимизация: легковесное сравнение данных перед обновлением state
        setChats(prevChats => {
          // Если данные не изменились, не обновляем state
          if (prevChats.length > 0 && areChatListsEquivalent(prevChats, data)) {
            return prevChats;
          }
          return data;
        });

        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {
          // Ignore localStorage quota/serialization issues
        }
        
        // Не перетираем активный chat object из фоновой синхронизации.
        // Источник фоновых обновлений для UI списка чатов - setChats, а не selectedChat,
        // иначе открытый чат получает лишние rerender/restore циклы.
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        console.warn('loadChats timeout: backend did not respond in time');
      }
      console.error('Error loading chats:', error);
    } finally {
      setIsLoadingChats(false); // 🚀 PERFORMANCE: End loading
      chatsLoadInFlightRef.current = false;
    }
  }, [currentUser, fetchWithTimeout]);

  // Load chats when currentUser is available
  useEffect(() => {
    if (currentUser) {
      loadChats();
    }
  }, [currentUser, loadChats]);

  const ensureNotificationsChat = async () => {
    if (!currentUser) return;
    
    try {
      const res = await fetch(`/api/chats/notifications/${currentUser.id}`);
      return res.ok;
    } catch (error) {
      console.error('Error ensuring notifications chat:', error);
      return false;
    }
  };

  const recoverFromMissingChat = useCallback((chatId: string) => {
    const normalizedTargetId = String(chatId || '').trim();
    if (!normalizedTargetId) return;

    if (selectedChat?.id === normalizedTargetId) {
      setMessagesWithTimelineSnapshot(normalizedTargetId, [], 'reset');
      setReplyToMessage(null);
      setAttachments([]);
      selectChat(null);
    }

    try {
      const cachedSelectedChatId = localStorage.getItem('selectedChatId');
      if (cachedSelectedChatId === normalizedTargetId) {
        localStorage.removeItem('selectedChatId');
      }
      localStorage.removeItem(`messages_chat_cache_${normalizedTargetId}`);
      localStorage.removeItem(`chat_scroll_v8_${normalizedTargetId}`);
    } catch {
      // Ignore localStorage errors
    }

    void loadChats();
  }, [selectedChat?.id, selectChat, loadChats, setMessagesWithTimelineSnapshot]);

  const loadMessages = useCallback(async (chatId: string, isPolling: boolean = false) => {
    const normalizedChatId = String(chatId || '').trim();
    if (!normalizedChatId) return;

    if (isPolling && pollingMessagesInFlightRef.current[normalizedChatId]) {
      return;
    }
    if (isPolling) {
      pollingMessagesInFlightRef.current[normalizedChatId] = true;
    }

    const requestSeq = ++latestMessagesRequestSeqRef.current;
    latestMessagesRequestByChatRef.current[normalizedChatId] = requestSeq;
    const isLatestActiveRequest = () => (
      activeMessagesChatIdRef.current === normalizedChatId
      && latestMessagesRequestByChatRef.current[normalizedChatId] === requestSeq
    );

    // Показываем спиннер только если кэш не был загружен в selectChat
    if (!isPolling && !hydratedMessagesCacheRef.current.has(normalizedChatId) && activeMessagesChatIdRef.current === normalizedChatId) {
      setIsLoadingMessages(true);
    }

    if (!isPolling && !hydratedMessagesCacheRef.current.has(normalizedChatId)) {
      hydratedMessagesCacheRef.current.add(normalizedChatId);
      try {
        const cacheKey = `messages_chat_cache_${normalizedChatId}`;
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cachedMessages = JSON.parse(cachedRaw);
          if (Array.isArray(cachedMessages) && cachedMessages.length > 0 && isLatestActiveRequest()) {
            // Применяем кэш только если он ещё не был предзагружен в selectChat.
            // Если selectChat уже добавил chatId в hydratedMessagesCacheRef,
            // этот блок вообще не выполнится (see: has(chatId) выше).
            setMessagesWithTimelineSnapshot(normalizedChatId, cachedMessages);
            setIsLoadingMessages(false);
          }
        }
      } catch (error) {
        console.warn('Failed to restore messages cache:', error);
      }
    }

    try {
      const res = await fetchWithTimeout(`/api/chats/${normalizedChatId}/messages`, { cache: 'no-store' }, 15000);
      if (res.ok) {
        const data = await res.json();

        if (currentUser) {
          void updateUserStatus({ isOnline: true });
        }
        
        // Уведомления о сообщениях централизованы в BrowserPushService.
        
        // Слияние с локальными pending-сообщениями (optimistic queue)
        const pendingForChat = pendingOutgoingRef.current.filter((msg) => msg.chatId === normalizedChatId);
        const unresolvedPending = pendingForChat.filter((pendingMsg) => {
          return !data.some((serverMsg: Message) => isSameOutgoingCandidate(serverMsg, pendingMsg));
        });

        pendingOutgoingRef.current = pendingOutgoingRef.current.filter((msg) => {
          if (msg.chatId !== normalizedChatId) return true;
          return unresolvedPending.some((pendingMsg) => pendingMsg.id === msg.id);
        });

        const mergedMessages = [...data, ...unresolvedPending].sort((a, b) => {
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return aTime - bTime;
        });

        if (isLatestActiveRequest()) {
          setMessagesWithTimelineSnapshot(normalizedChatId, (prev) => (hasMessagesChanged(prev, mergedMessages) ? mergedMessages : prev));
          if (!isPolling) {
            setIsLoadingMessages(false);
          }
        }

        try {
          localStorage.setItem(`messages_chat_cache_${normalizedChatId}`, JSON.stringify(mergedMessages));
        } catch {
          // Ignore localStorage quota/serialization issues
        }
        
        // Не делаем автоскролл при polling, чтобы исключить самопроизвольные перемотки.
        
        // Отмечаем сообщения как прочитанные (при любой загрузке, если есть новые сообщения)
        if (data.length > 0 && currentUser && isLatestActiveRequest()) {
          const lastMessage = data[data.length - 1];
          void fetchWithTimeout(`/api/chats/${normalizedChatId}/mark-read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.id,
              lastMessageId: lastMessage.id
            })
          }, 8000).catch((error) => {
            console.warn('mark-read request failed:', error);
          });
        }
        
        // При polling обновляем список чатов ограниченно по частоте,
        // чтобы избежать каскада фоновых запросов и UI подлагиваний.
        if (isPolling && currentUser) {
          const now = Date.now();
          if (now - lastPollingChatsRefreshAtRef.current > 12000) {
            lastPollingChatsRefreshAtRef.current = now;
            void loadChats();
          }
        } else if (!isPolling) {
          // Обновляем счетчики непрочитанных при первой загрузке
          void loadChats();
        }
      } else {
        const errorData = await res.json().catch(() => null);
        const detail = String(errorData?.detail || errorData?.error || '').toLowerCase();
        if (res.status === 404 && detail.includes('chat not found')) {
          recoverFromMissingChat(normalizedChatId);
        }
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        console.warn('loadMessages timeout for chat:', normalizedChatId);
      }
      console.error('Error loading messages:', error);
    } finally {
      if (!isPolling && isLatestActiveRequest()) setIsLoadingMessages(false);
      if (isPolling) {
        pollingMessagesInFlightRef.current[normalizedChatId] = false;
      }
    }
  }, [currentUser, loadChats, updateUserStatus, recoverFromMissingChat, hasMessagesChanged, setMessagesWithTimelineSnapshot, fetchWithTimeout]);

  const createChat = async () => {
    if (!currentUser || selectedUsers.length === 0) return;

    const participantIds = [...selectedUsers, currentUser.id];
    
    // Проверяем, есть ли уже личный чат с этим пользователем
    if (!isGroupChat && selectedUsers.length === 1) {
      const existingChat = chats.find(chat => 
        !chat.isGroup && 
        !chat.isNotificationsChat && 
        !chat.isFavoritesChat &&
        chat.participantIds?.length === 2 &&
        chat.participantIds?.includes(selectedUsers[0]) &&
        chat.participantIds?.includes(currentUser.id)
      );
      
      if (existingChat) {
        // Если чат уже существует - открываем его
        setShowNewChatModal(false);
        setSelectedUsers([]);
        selectChat(existingChat);
        return;
      }
    }
    
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds,
          title: isGroupChat ? groupTitle : undefined,
          isGroup: isGroupChat,
          creatorId: isGroupChat ? currentUser.id : undefined
        })
      });

      if (res.ok) {
        const newChat = await res.json();
        console.log('DEBUG - Создан новый чат:', {
          chatId: newChat.id,
          creatorId: newChat.creatorId,
          isGroup: newChat.isGroup,
          currentUserId: currentUser.id
        });
        setShowNewChatModal(false);
        setSelectedUsers([]);
        setIsGroupChat(false);
        setGroupTitle('');
        loadChats();
        selectChat(newChat);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const sendTypingIndicator = async (chatId: string) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/chats/${chatId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  };

  const recreateDeletedChatAndResend = useCallback(async (
    deletedChat: Chat,
    payload: {
      authorId: string;
      content: string;
      mentions: string[];
      replyToId?: string;
      attachments?: any[];
    }
  ): Promise<boolean> => {
    if (!currentUser?.id) return false;

    const participantIds = Array.from(
      new Set(
        [...(deletedChat.participantIds || []), currentUser.id]
          .map((id) => String(id || '').trim())
          .filter(Boolean)
      )
    );

    if (participantIds.length === 0) return false;

    const todoId = String((deletedChat as any).todoId || (deletedChat as any).todo_id || '').trim();

    try {
      const createRes = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds,
          isGroup: Boolean(deletedChat.isGroup),
          title: deletedChat.isGroup ? (deletedChat.title || 'Групповой чат') : undefined,
          creatorId: deletedChat.isGroup ? currentUser.id : undefined,
          todoId: todoId || undefined,
        }),
      });

      if (!createRes.ok) return false;

      const recreatedChat = await createRes.json();
      const recreatedChatId = String(recreatedChat?.id || '').trim();
      if (!recreatedChatId) return false;

      recoverFromMissingChat(deletedChat.id);

      const sendRes = await fetch(`/api/chats/${recreatedChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!sendRes.ok) return false;

      const sentMessage = await sendRes.json();
      selectChat(recreatedChat);
      setMessagesWithTimelineSnapshot(recreatedChatId, [sentMessage], 'reset');
      void loadMessages(recreatedChatId, false);
      void loadChats();
      return true;
    } catch (error) {
      console.error('Failed to recreate deleted chat:', error);
      return false;
    }
  }, [currentUser?.id, loadChats, loadMessages, recoverFromMissingChat, selectChat, setMessagesWithTimelineSnapshot]);

  const sendMessage = useCallback(async () => {
    const messageText = messageInputRef.current?.value || '';
    const readyAttachments = attachments.filter((att: any) => {
      if (!att || typeof att !== 'object') return false;
      if (att.status === 'uploading' || att.status === 'error') return false;
      if (att.type === 'file' || att.type === 'image') return Boolean(String(att.url || '').trim());
      return true;
    }).map((att: any) => {
      const { status, clientUploadId, progress, ...rest } = att;
      return rest;
    });

    // Проверяем: должен быть либо текст, либо вложения
    if ((!messageText.trim() && readyAttachments.length === 0) || !selectedChat || !currentUser || !selectedChat.id) return;

    const shouldKeepComposerFocus = typeof window !== 'undefined'
      && window.matchMedia('(pointer: coarse)').matches;
    const hadComposerFocus = typeof document !== 'undefined' && document.activeElement === messageInputRef.current;
    const keepComposerFocus = () => {
      if (!shouldKeepComposerFocus || !hadComposerFocus) return;
      const textarea = messageInputRef.current;
      if (!textarea) return;
      requestAnimationFrame(() => {
        textarea.focus({ preventScroll: true });
        const cursorPosition = textarea.value.length;
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      });
    };

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      chatId: selectedChat.id,
      authorId: currentUser.id,
      authorName: currentUser.name || currentUser.username || 'Вы',
      content: messageText,
      mentions: [],
      replyToId: replyToMessage?.id,
      attachments: readyAttachments.length > 0 ? readyAttachments : undefined,
      createdAt: new Date().toISOString(),
      isEdited: false,
    };

    pendingOutgoingRef.current = [...pendingOutgoingRef.current, optimisticMessage];
    setMessagesWithTimelineSnapshot(selectedChat.id, (prev) => [...prev, optimisticMessage]);
    forceScrollToBottom(false);

    if (messageInputRef.current) {
      messageInputRef.current.value = '';
    }
    syncComposerHeight('');
    keepComposerFocus();
    setReplyToMessage(null);
    setAttachments([]);

    if (selectedChat) {
      setChatDrafts(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[selectedChat.id];
        return newDrafts;
      });
    }

    const outboundPayload = {
      authorId: currentUser.id,
      content: messageText,
      mentions: [],
      replyToId: replyToMessage?.id,
      attachments: readyAttachments.length > 0 ? readyAttachments : undefined,
    };

    try {
      const res = await fetch(`/api/chats/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outboundPayload)
      });

      if (res.ok) {
        const newMsg = await res.json();
        pendingOutgoingRef.current = pendingOutgoingRef.current.filter((msg) => msg.id !== optimisticMessage.id);
        setMessagesWithTimelineSnapshot(selectedChat.id, prev => {
          const hasServerMessage = prev.some((msg) => msg.id === newMsg.id);
          const replaced = prev.map((msg) => (msg.id === optimisticMessage.id ? newMsg : msg));
          return hasServerMessage ? replaced.filter((msg) => msg.id !== optimisticMessage.id) : replaced;
        });
        forceScrollToBottom(false);
        
        void updateUserStatus({ isOnline: true, force: true });
        keepComposerFocus();

        loadChats();
      } else {
        const errorData = await res.json().catch(() => null);
        const detail = String(errorData?.detail || errorData?.error || '').toLowerCase();
        pendingOutgoingRef.current = pendingOutgoingRef.current.filter((msg) => msg.id !== optimisticMessage.id);
        setMessagesWithTimelineSnapshot(selectedChat.id, prev => prev.filter((msg) => msg.id !== optimisticMessage.id));

        if (res.status === 404 && detail.includes('chat not found')) {
          const recreatedAndResent = await recreateDeletedChatAndResend(selectedChat, outboundPayload);
          if (!recreatedAndResent) {
            recoverFromMissingChat(selectedChat.id);
            alert('Чат был удалён. Не удалось автоматически создать новый — откройте диалог снова.');
          }
        }
        keepComposerFocus();
      }
    } catch (error) {
      pendingOutgoingRef.current = pendingOutgoingRef.current.filter((msg) => msg.id !== optimisticMessage.id);
      setMessagesWithTimelineSnapshot(selectedChat.id, prev => prev.filter((msg) => msg.id !== optimisticMessage.id));
      console.error('Error sending message:', error);
      keepComposerFocus();
    } finally {
      if (shouldKeepComposerFocus) {
        window.setTimeout(keepComposerFocus, 80);
      }
    }
  }, [messageInputRef, selectedChat, currentUser, attachments, replyToMessage, messagesListRef, loadChats, syncComposerHeight, updateUserStatus, recoverFromMissingChat, recreateDeletedChatAndResend, isNoAutoScrollChat, isTimelineNearBottom, setMessagesWithTimelineSnapshot, forceScrollToBottom]);

  useEffect(() => {
    if (!selectedChat) return;
    if (chats.length === 0) return;

    const exists = chats.some((chat) => chat.id === selectedChat.id);
    if (!exists) {
      recoverFromMissingChat(selectedChat.id);
    }
  }, [selectedChat, chats, recoverFromMissingChat]);

  const updateMessage = useCallback(async (messageId: string, content: string): Promise<boolean> => {
    if (!selectedChat) return false;

    const sourceMessage = messages.find(m => m.id === messageId);
    const sourceContent = sourceMessage?.content || editingMessageText || '';

    // Если текст не изменился - просто закрываем редактирование без запроса
    if (content.trim() === sourceContent.trim()) {
      setEditingMessageId(null);
      setEditingMessageText('');
      setNewMessage(savedMessageText);
      if (messageInputRef.current) {
        syncComposerHeight(savedMessageText);
          messageInputRef.current.blur();
      }
      setSavedMessageText('');
      return true;
    }

    try {
      const res = await fetch(`/api/chats/${selectedChat.id}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (res.ok) {
        setEditingMessageId(null);
        setEditingMessageText('');
        setNewMessage(savedMessageText);
        if (messageInputRef.current) {
          syncComposerHeight(savedMessageText);
          messageInputRef.current.blur();
        }
        setSavedMessageText('');
        loadMessages(selectedChat.id, true); // Не скроллим при редактировании
        return true;
      }

      const errorText = await res.text();
      console.error('Error updating message:', errorText);
      return false;
    } catch (error) {
      console.error('Error updating message:', error);
      return false;
    }
  }, [selectedChat, editingMessageText, messages, savedMessageText, loadMessages, messageInputRef, syncComposerHeight]);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    const value = target.value;
    lastActivityTimeRef.current = Date.now();

    if (mentionDebounceRef.current) {
      clearTimeout(mentionDebounceRef.current);
    }

    mentionDebounceRef.current = setTimeout(() => {
      if (!selectedChat?.isGroup) {
        setShowMentionSuggestions(false);
        return;
      }

      const cursorPos = target.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPos);
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

      if (lastAtSymbol !== -1 && lastAtSymbol === textBeforeCursor.length - 1) {
        setShowMentionSuggestions(true);
        setMentionQuery('');
      } else if (lastAtSymbol !== -1) {
        const afterAt = textBeforeCursor.substring(lastAtSymbol + 1);
        if (!afterAt.includes(' ') && afterAt.length > 0) {
          setShowMentionSuggestions(true);
          setMentionQuery(afterAt.toLowerCase());
        } else {
          setShowMentionSuggestions(false);
        }
      } else {
        setShowMentionSuggestions(false);
      }
    }, 120);

    if (resizeAnimationFrameRef.current !== null) {
      cancelAnimationFrame(resizeAnimationFrameRef.current);
    }

    resizeAnimationFrameRef.current = requestAnimationFrame(() => {
      target.style.height = 'auto';
      const minHeight = 44;
      const maxHeight = 120;
      const hasOverflow = target.scrollHeight > maxHeight;
      const previousHeight = parseInt(target.style.height || `${minHeight}`, 10) || minHeight;
      const newHeight = Math.min(Math.max(target.scrollHeight, minHeight), maxHeight);
      target.style.height = `${newHeight}px`;
      target.style.overflowY = hasOverflow ? 'auto' : 'hidden';
      if (hasOverflow) {
        target.scrollTop = target.scrollHeight;
      }
      if (newHeight !== previousHeight && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('composer-resize', { detail: { height: newHeight } }));
      }
      resizeAnimationFrameRef.current = null;
    });
  }, [lastActivityTimeRef, selectedChat]);

  useEffect(() => {
    return () => {
      if (mentionDebounceRef.current) {
        clearTimeout(mentionDebounceRef.current);
      }
      if (selectionDebounceRef.current) {
        clearTimeout(selectionDebounceRef.current);
      }
      if (resizeAnimationFrameRef.current !== null) {
        cancelAnimationFrame(resizeAnimationFrameRef.current);
      }
    };
  }, []);

  const handleMessageKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;

    if (isCtrlOrMeta) {
      const code = e.code;
      const keyLower = (e.key || '').toLowerCase();

      if (code === 'KeyB') {
        e.preventDefault();
        applyFormatting('bold');
        return;
      }

      if (code === 'KeyI') {
        e.preventDefault();
        applyFormatting('italic');
        return;
      }

      if (code === 'KeyU') {
        e.preventDefault();
        applyFormatting('underline');
        return;
      }

      if (code === 'KeyK') {
        e.preventDefault();
        applyFormatting('link');
        return;
      }

      if (e.shiftKey && code === 'KeyX') {
        e.preventDefault();
        applyFormatting('strikethrough');
        return;
      }

      if (e.shiftKey && code === 'KeyM') {
        e.preventDefault();
        applyFormatting('code');
        return;
      }

      if (e.shiftKey && code === 'KeyP') {
        e.preventDefault();
        applyFormatting('spoiler');
        return;
      }

      const isCreateTaskShortcut =
        code === 'Slash' ||
        code === 'NumpadDivide' ||
        (e.shiftKey && code === 'Digit7') ||
        keyLower === '/' ||
        keyLower === '?';
      if (isCreateTaskShortcut) {
        e.preventDefault();
        setShowEventPicker(false);
        setShowAttachmentMenu(false);
        setShowTaskPicker(true);
        return;
      }

      const isCreateEventShortcut =
        code === 'NumpadMultiply' ||
        (e.shiftKey && code === 'Digit8') ||
        keyLower === '*';
      if (isCreateEventShortcut) {
        e.preventDefault();
        setShowTaskPicker(false);
        setShowAttachmentMenu(false);
        setShowEventPicker(true);
        return;
      }
    }

    if (e.key === 'Enter') {
      if (e.ctrlKey || e.shiftKey) {
        // Ctrl+Enter или Shift+Enter - перенос строки
        e.preventDefault();
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart || 0;
        const end = target.selectionEnd || 0;
        const value = target.value;
        const newValue = value.substring(0, start) + '\n' + value.substring(end);
        target.value = newValue;
        setNewMessage(newValue);
        // Устанавливаем курсор после переноса
        requestAnimationFrame(() => {
          target.selectionStart = start + 1;
          target.selectionEnd = start + 1;
          target.focus();
          syncComposerHeight(newValue);
        });
      } else {
        // Enter - отправка или сохранение
        e.preventDefault();
        if (editingMessageId) {
          const messageText = messageInputRef.current?.value || '';
          void updateMessage(editingMessageId, messageText);
        } else {
          sendMessage();
        }
      }
    } else if (e.key === 'Escape' && editingMessageId) {
      // Escape - отмена редактирования
      setEditingMessageId(null);
      if (messageInputRef.current) {
        syncComposerHeight(savedMessageText);
        messageInputRef.current.blur();
      }
      setSavedMessageText('');
    }
  }, [editingMessageId, savedMessageText, messageInputRef, updateMessage, sendMessage, syncComposerHeight, applyFormatting]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onGlobalShortcut = (event: KeyboardEvent) => {
      const isCtrlOrMeta = event.ctrlKey || event.metaKey;
      if (!isCtrlOrMeta) return;
      if (!selectedChat || selectedChat.isNotificationsChat) return;
      if (document.activeElement !== messageInputRef.current) return;

      const code = event.code;
      const keyLower = (event.key || '').toLowerCase();

      const isCreateTaskShortcut =
        code === 'Slash' ||
        code === 'NumpadDivide' ||
        (event.shiftKey && code === 'Digit7') ||
        keyLower === '/' ||
        keyLower === '?';

      if (isCreateTaskShortcut) {
        event.preventDefault();
        setShowEventPicker(false);
        setShowAttachmentMenu(false);
        setShowTaskPicker(true);
        return;
      }

      const isCreateEventShortcut =
        code === 'NumpadMultiply' ||
        (event.shiftKey && code === 'Digit8') ||
        keyLower === '*';

      if (isCreateEventShortcut) {
        event.preventDefault();
        setShowTaskPicker(false);
        setShowAttachmentMenu(false);
        setShowEventPicker(true);
      }
    };

    window.addEventListener('keydown', onGlobalShortcut, { capture: true });
    return () => {
      window.removeEventListener('keydown', onGlobalShortcut, { capture: true });
    };
  }, [selectedChat, messageInputRef]);

  const deleteMessage = async (messageId: string) => {
    if (!selectedChat) return;

    try {
      const res = await fetch(`/api/chats/${selectedChat.id}/messages/${messageId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        loadMessages(selectedChat.id, true); // Не скроллим при удалении
        loadChats();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот чат? Все сообщения будут потеряны.')) {
      return;
    }

    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        if (selectedChat?.id === chatId) {
          selectChat(null);
        }
        loadChats();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const togglePinChat = async (chatId: string) => {
    if (!currentUser) return;

    const getPinState = (targetChat: any, userId: string): boolean => {
      const pinMap = targetChat?.pinnedByUser || targetChat?.pinned_by_user || {};
      const normalizeId = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const userIdRaw = String(userId ?? '');
      const directRaw = pinMap?.[userIdRaw];

      const toBool = (raw: unknown) => {
        if (typeof raw === 'string') return raw.toLowerCase() === 'true';
        return raw === true;
      };

      if (typeof directRaw !== 'undefined') {
        return toBool(directRaw);
      }

      const normalizedUserId = normalizeId(userIdRaw);
      for (const [key, value] of Object.entries(pinMap as Record<string, unknown>)) {
        if (normalizeId(key) === normalizedUserId) {
          return toBool(value);
        }
      }

      return false;
    };

    const getPinOrder = (targetChat: any, userId: string): number | null => {
      const orderMap = targetChat?.pinnedOrderByUser || targetChat?.pinned_order_by_user || {};
      const normalizeId = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const userIdRaw = String(userId ?? '');

      const parseOrder = (raw: unknown): number | null => {
        if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
        if (typeof raw === 'string' && raw.trim() !== '') {
          const parsed = Number.parseInt(raw, 10);
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      };

      const directRaw = orderMap?.[userIdRaw];
      const directParsed = parseOrder(directRaw);
      if (directParsed !== null) {
        return directParsed;
      }

      const normalizedUserId = normalizeId(userIdRaw);
      for (const [key, value] of Object.entries(orderMap as Record<string, unknown>)) {
        if (normalizeId(key) === normalizedUserId) {
          return parseOrder(value);
        }
      }

      return null;
    };

    const chat = chats.find(c => c.id === chatId);
    const isPinned = getPinState(chat, currentUser.id);
    const newPinState = !isPinned;
    const previousPinState = isPinned;
    const previousPinOrder = getPinOrder(chat, currentUser.id);
    const maxPinOrder = chats.reduce((maxOrder, targetChat) => {
      const order = getPinOrder(targetChat, currentUser.id);
      if (order === null) return maxOrder;
      return Math.max(maxOrder, order);
    }, -1);
    const nextPinOrder = newPinState ? maxPinOrder + 1 : null;

    // Оптимистичное обновление сразу
    setChats(prevChats => 
      prevChats.map(c => 
        c.id === chatId 
          ? {
              ...c,
              pinnedByUser: { ...(c.pinnedByUser || {}), [currentUser.id]: newPinState },
              pinnedOrderByUser: newPinState
                ? { ...(c.pinnedOrderByUser || {}), [currentUser.id]: nextPinOrder ?? 0 }
                : Object.fromEntries(Object.entries(c.pinnedOrderByUser || {}).filter(([key]) => key !== currentUser.id)),
            }
          : c
      )
    );
    
    try {
      const res = await fetch(`/api/chats/${encodeURIComponent(chatId)}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          isPinned: newPinState,
          pinOrder: nextPinOrder,
        })
      });

      if (!res.ok) {
        throw new Error(`Backend pin sync failed (${res.status})`);
      }

      const payload = await res.json().catch(() => null);
      if (!payload?.success) {
        throw new Error('Backend payload is not success');
      }

      const serverPinned = typeof payload?.isPinned === 'boolean' ? payload.isPinned : newPinState;
      const serverPinOrderRaw = payload?.pinOrder;
      const serverPinOrder = typeof serverPinOrderRaw === 'number'
        ? serverPinOrderRaw
        : Number.isFinite(Number.parseInt(String(serverPinOrderRaw ?? ''), 10))
          ? Number.parseInt(String(serverPinOrderRaw), 10)
          : nextPinOrder;
      setChats(prevChats =>
        prevChats.map(c =>
          c.id === chatId
            ? {
                ...c,
                pinnedByUser: { ...(c.pinnedByUser || {}), [currentUser.id]: serverPinned },
                pinnedOrderByUser: serverPinned
                  ? { ...(c.pinnedOrderByUser || {}), [currentUser.id]: serverPinOrder ?? 0 }
                  : Object.fromEntries(Object.entries(c.pinnedOrderByUser || {}).filter(([key]) => key !== currentUser.id)),
              }
            : c
        )
      );
      await loadChats();
    } catch (error) {
      console.error('Error toggling pin:', error);
      setChats(prevChats =>
        prevChats.map(c =>
          c.id === chatId
            ? {
                ...c,
                pinnedByUser: { ...(c.pinnedByUser || {}), [currentUser.id]: previousPinState },
                pinnedOrderByUser: previousPinState
                  ? { ...(c.pinnedOrderByUser || {}), [currentUser.id]: previousPinOrder ?? 0 }
                  : Object.fromEntries(Object.entries(c.pinnedOrderByUser || {}).filter(([key]) => key !== currentUser.id)),
              }
            : c
        )
      );

      const maybeMessage = String((error as Error)?.message || '').toLowerCase();
      if (maybeMessage.includes('404')) {
        recoverFromMissingChat(chatId);
      }
    }
  };

  const toggleArchiveChat = async (chatId: string, nextArchived?: boolean) => {
    if (!currentUser) return;

    const getArchiveState = (targetChat: any): boolean => {
      if (!targetChat) return false;
      const map = targetChat.archivedByUser || targetChat.archived_by_user || {};
      const raw = map?.[currentUser.id];
      if (typeof raw === 'string') return raw.toLowerCase() === 'true';
      if (raw === true) return true;
      return Boolean(targetChat.isArchivedForUser || targetChat.is_archived_for_user);
    };

    const chat = chats.find(c => c.id === chatId);
    const isProtectedSystemChat = Boolean(chat?.isFavoritesChat || chat?.isNotificationsChat || chat?.isSystemChat);
    if (isProtectedSystemChat) {
      return;
    }
    const currentArchived = getArchiveState(chat as any);
    const shouldArchive = typeof nextArchived === 'boolean' ? nextArchived : !currentArchived;

    setChats(prev => prev.map(c => {
      if (c.id !== chatId) return c;
      return {
        ...c,
        archivedByUser: {
          ...(c.archivedByUser || (c as any).archived_by_user || {}),
          [currentUser.id]: shouldArchive,
        },
        isArchivedForUser: shouldArchive,
      } as Chat;
    }));

    if (selectedChat?.id === chatId && shouldArchive && !showArchivedChats) {
      selectChat(null);
    }

    try {
      const response = await fetch(`/api/chats/${chatId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          isArchived: shouldArchive,
        }),
      });

      if (!response.ok) {
        throw new Error(`Archive sync failed (${response.status})`);
      }

      await loadChats();
    } catch (error) {
      console.error('Error toggling archive state:', error);
      // rollback
      setChats(prev => prev.map(c => {
        if (c.id !== chatId) return c;
        return {
          ...c,
          archivedByUser: {
            ...(c.archivedByUser || (c as any).archived_by_user || {}),
            [currentUser.id]: currentArchived,
          },
          isArchivedForUser: currentArchived,
        } as Chat;
      }));
    }
  };

  const togglePinMessage = useCallback(async (message: Message) => {
    if (!selectedChat || !currentUser) return;
    if (linkedTaskBanner.id) return;

    const shouldPin = !Boolean(message.metadata?.isPinned);

    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(selectedChat.id)}/messages/${encodeURIComponent(message.id)}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          isPinned: shouldPin,
        }),
      });

      if (!response.ok) {
        console.error('Failed to toggle message pin:', response.status);
        return;
      }

      await loadMessages(selectedChat.id);
    } catch (error) {
      console.error('Error toggling message pin:', error);
    }
  }, [selectedChat, currentUser, loadMessages, linkedTaskBanner.id]);

  // Добавить участника в групповой чат
  const addParticipant = async (userId: string) => {
    if (!selectedChat || !selectedChat.isGroup) return;
    
    try {
      const res = await fetch(`/api/chats/${selectedChat.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (res.ok) {
        setChats(prev => prev.map(chat => 
          chat.id === selectedChat.id
            ? { ...chat, participantIds: [...chat.participantIds, userId] }
            : chat
        ));
        loadChats();
        setShowAddParticipantModal(false);
        setParticipantSearchQuery('');
      }
    } catch (error) {
      console.error('Error adding participant:', error);
    }
  };

  // Переслать сообщение(я)
  const forwardMessage = async () => {
    if (isForwardingMessages || selectedChatsForForward.length === 0) return;
    
    // Если есть множественный выбор, пересылаем выбранные сообщения
    const messagesToForward = (isSelectionMode && selectedMessages.size > 0
      ? Array.from(selectedMessages).map(id => messages.find(m => m.id === id)).filter((m): m is Message => !!m)
      : forwardingMessage ? [forwardingMessage] : []);
    
    if (messagesToForward.length === 0) return;
    
    try {
      setIsForwardingMessages(true);
      console.log('Forwarding messages:', messagesToForward.map(m => m.id), 'to chats:', selectedChatsForForward);
      
      // Пересылаем каждое сообщение c таймаутом, чтобы UI не зависал бесконечно.
      const forwardSingleMessage = async (message: Message) => {
        const sourceChatId = message.chatId || selectedChat?.id;
        if (!sourceChatId) {
          throw new Error('Не удалось определить исходный чат для пересылки');
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 15000);

        try {
          const res = await fetch(
            `/api/chats/${encodeURIComponent(sourceChatId)}/messages/${encodeURIComponent(message.id)}/forward`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetChatIds: selectedChatsForForward }),
              signal: controller.signal,
            }
          );

          if (!res.ok) {
            let errorMessage = 'Ошибка при пересылке';
            try {
              const data = await res.json();
              errorMessage = data.detail || data.error || errorMessage;
            } catch {
              const rawText = await res.text();
              if (rawText) {
                errorMessage = rawText;
              }
            }
            throw new Error(errorMessage);
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            throw new Error('Таймаут пересылки: сервер не ответил за 15 секунд');
          }
          throw err;
        } finally {
          window.clearTimeout(timeoutId);
        }
      };

      await Promise.all(messagesToForward.map((message) => forwardSingleMessage(message)));
      
      setShowForwardModal(false);
      setForwardingMessage(null);
      setSelectedChatsForForward([]);
      setIsSelectionMode(false);
      setSelectedMessages(new Set());
      loadChats();
      
      // Если мы пересылаем в текущий открытый чат, обновляем сообщения
      if (selectedChat && selectedChatsForForward.includes(selectedChat.id)) {
        loadMessages(selectedChat.id);
      }
      
      alert(`Успешно переслано ${messagesToForward.length} сообщени${messagesToForward.length === 1 ? 'е' : messagesToForward.length < 5 ? 'я' : 'й'}`);
    } catch (error) {
      console.error('Error forwarding message:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Ошибка при пересылке сообщения: ${errorMessage}`);
    } finally {
      setIsForwardingMessages(false);
    }
  };

  // Удалить участника из группового чата
  const removeParticipant = async (userId: string) => {
    if (!selectedChat || !selectedChat.isGroup) return;
    if (!confirm('Вы уверены, что хотите удалить участника из группы?')) return;
    
    try {
      const res = await fetch(`/api/chats/${selectedChat.id}/participants/${userId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setChats(prev => prev.map(chat => 
          chat.id === selectedChat.id
            ? { ...chat, participantIds: chat.participantIds.filter((id: string) => id !== userId) }
            : chat
        ));
        loadChats();
      }
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  };

  // Переименовать групповой чат (только для создателя)
  const renameChat = async (newTitle: string) => {
    if (!selectedChat || !selectedChat.isGroup || !newTitle.trim()) return;
    if (String(selectedChat.creatorId ?? '') !== String(currentUser?.id ?? '')) return;
    
    try {
      const res = await fetch(`/api/chats/${selectedChat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      });

      if (res.ok) {
        setChats(prev => prev.map(chat => 
          chat.id === selectedChat.id
            ? { ...chat, title: newTitle.trim() }
            : chat
        ));
        loadChats();
        setShowRenameChatModal(false);
        setNewChatName('');
      }
    } catch (error) {
      console.error('Error renaming chat:', error);
    }
  };

  const updateChatAvatar = async (file: File) => {
    if (!selectedChat || !selectedChat.isGroup || String(selectedChat.creatorId ?? '') !== String(currentUser?.id ?? '')) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Не удалось загрузить файл аватара');
      }

      const uploadData = await uploadRes.json();
      const avatarUrl = uploadData?.url;
      if (!avatarUrl) {
        throw new Error('Сервер не вернул URL аватара');
      }

      const updateRes = await fetch(`/api/chats/${encodeURIComponent(selectedChat.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarUrl }),
      });

      if (!updateRes.ok) {
        throw new Error('Не удалось сохранить аватар чата');
      }

      setChats(prev => prev.map(chat =>
        chat.id === selectedChat.id
          ? { ...chat, avatar: avatarUrl }
          : chat
      ));

      await loadChats();
    } catch (error) {
      console.error('Error updating chat avatar:', error);
      alert('Не удалось обновить аватар чата');
    }
  };

  const getChatAvatar = useCallback((chat: Chat): string => {
    if (chat.isFavoritesChat) return 'F';
    if (chat.isSystemChat || chat.isNotificationsChat) return 'N';
    if (chat.isGroup) return 'Г'; // Для группы показываем 'Г'
    
    if (!currentUser) return 'C';
    
    const otherParticipants = users.filter(u => 
      chat.participantIds?.includes(u.id) && u.id !== currentUser.id
    );
    
    if (otherParticipants.length === 0) return 'F';
    return otherParticipants[0].name?.[0] || otherParticipants[0].username?.[0] || 'U';
  }, [currentUser, users]);

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return u.id !== currentUser?.id;
    const query = searchQuery.toLowerCase();
    return (
      u.id !== currentUser?.id &&
      (u.name?.toLowerCase().includes(query) ||
       u.username?.toLowerCase().includes(query) ||
       u.email?.toLowerCase().includes(query))
    );
  });

  // Фильтрация чатов по поисковому запросу - мемоизирована
  const filterChatsBySearch = useCallback((chatList: Chat[]) => {
    if (!searchQuery) return chatList;
    const query = searchQuery.toLowerCase();
    return chatList.filter(chat => {
      // Поиск по названию чата
      if (chat.title?.toLowerCase().includes(query)) return true;
      // Поиск по именам участников
      const participants = users.filter(u => chat.participantIds?.includes(u.id) && u.id !== currentUser?.id);
      return participants.some(p => 
        p.name?.toLowerCase().includes(query) || 
        p.username?.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, users, currentUser?.id]);

  const reorderPinnedChats = useCallback(async (orderedPinnedChatIds: string[]) => {
    if (!currentUser || orderedPinnedChatIds.length === 0) return;

    const orderedSet = new Set(orderedPinnedChatIds);

    setChats(prevChats =>
      prevChats.map(chat => {
        if (!orderedSet.has(chat.id)) return chat;
        const orderIndex = orderedPinnedChatIds.indexOf(chat.id);
        return {
          ...chat,
          pinnedOrderByUser: {
            ...(chat.pinnedOrderByUser || {}),
            [currentUser.id]: orderIndex,
          },
        };
      })
    );

    try {
      await Promise.all(orderedPinnedChatIds.map((chatId, index) =>
        fetch(`/api/chats/${encodeURIComponent(chatId)}/pin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            isPinned: true,
            pinOrder: index,
          }),
        })
      ));
      await loadChats();
    } catch (error) {
      console.error('Error reordering pinned chats:', error);
      await loadChats();
    }
  }, [currentUser, loadChats]);

  // Разделяем чаты на закрепленные и обычные - мемоизировано для стабильности
  const { pinnedChats, unpinnedChats } = useMemo(() => {
    const userId = currentUser?.id || '';
    const isArchivedForCurrentUser = (chat: Chat): boolean => {
      const map = (chat as any).archivedByUser || (chat as any).archived_by_user || {};
      const raw = map?.[userId];
      const byMap = typeof raw === 'string' ? raw.toLowerCase() === 'true' : raw === true;
      return Boolean(byMap || (chat as any).isArchivedForUser || (chat as any).is_archived_for_user);
    };

    const getPinState = (chat: Chat): boolean => {
      const pinMap = (chat as any).pinnedByUser || (chat as any).pinned_by_user || {};
      const normalizeId = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const directRaw = pinMap?.[userId];
      if (typeof directRaw !== 'undefined') {
        if (typeof directRaw === 'string') return directRaw.toLowerCase() === 'true';
        return directRaw === true;
      }

      const normalizedUserId = normalizeId(userId);
      for (const [key, value] of Object.entries(pinMap as Record<string, unknown>)) {
        if (normalizeId(key) === normalizedUserId) {
          if (typeof value === 'string') return value.toLowerCase() === 'true';
          return value === true;
        }
      }

      return false;
    };

    const getPinOrder = (chat: Chat): number => {
      const orderMap = (chat as any).pinnedOrderByUser || (chat as any).pinned_order_by_user || {};
      const directRaw = orderMap?.[userId];
      if (typeof directRaw === 'number' && Number.isFinite(directRaw)) return directRaw;
      if (typeof directRaw === 'string') {
        const parsed = Number.parseInt(directRaw, 10);
        if (Number.isFinite(parsed)) return parsed;
      }
      return Number.MAX_SAFE_INTEGER;
    };

    const sourceChats = chats.filter(chat => isArchivedForCurrentUser(chat) === showArchivedChats);
    const allPinnedChats = sourceChats
      .filter(chat => getPinState(chat))
      .sort((a, b) => {
        const orderDiff = getPinOrder(a) - getPinOrder(b);
        if (orderDiff !== 0) return orderDiff;
        const aTime = new Date(a.lastMessage?.createdAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.lastMessage?.createdAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
    const allUnpinnedChats = sourceChats
      .filter(chat => !getPinState(chat))
      .sort((a, b) => {
        const aTime = new Date(a.lastMessage?.createdAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.lastMessage?.createdAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
    
    return {
      pinnedChats: filterChatsBySearch(allPinnedChats),
      unpinnedChats: filterChatsBySearch(allUnpinnedChats)
    };
  }, [chats, currentUser?.id, searchQuery, showArchivedChats]); // Заменили filterChatsBySearch на searchQuery

  const messagesContainerRef = useRef<HTMLDivElement>(null); // Ref для основного контейнера страницы
  const chatPanelRef = useRef<HTMLDivElement>(null); // Ref для мобильного chat-панели (position:fixed, keyboard fix)

  // Синхронизируем состояние открытия чата с оболочкой account мгновенно
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isOpen = Boolean(selectedChatId);
    if (lastReportedChatOpenStateRef.current === isOpen) {
      return;
    }

    lastReportedChatOpenStateRef.current = isOpen;
    window.dispatchEvent(new CustomEvent('chat-selection-changed', {
      detail: { isOpen }
    }));
  }, [selectedChatId]);

  // На тач-устройствах выключаем режим collapsed и используем стандартный mobile-переход со стрелкой назад
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(pointer: coarse)');
    const syncCollapsedState = (isTouch: boolean) => {
      if (isTouch) {
        setIsChatListCollapsed(false);
      }
    };

    syncCollapsedState(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncCollapsedState(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // --- FIX MOBILE KEYBOARD ---
  // Используем direct DOM manipulation чтобы избежать ре-рендеров при ресайзе (клавиатура)
  // Это предотвращает закрытие клавиатуры
  useEffect(() => {
    document.body.style.cursor = '';
    document.documentElement.style.cursor = '';

    let prevHeight = window.innerHeight;
    let rafId: number | null = null;
    const isTouchViewport = window.matchMedia('(pointer: coarse)').matches;
    const isTauriRuntime = localStorage.getItem('_platform') === 'tauri';

    if (!isTouchViewport) {
      const nextIsDesktop = !(window.innerWidth < 773 || isTouchPointer);
      setIsDesktopView(prev => (prev === nextIsDesktop ? prev : nextIsDesktop));
      return () => {
        document.body.style.cursor = '';
        document.documentElement.style.cursor = '';
      };
    }
    
    // Функция обновления высоты
    const updateHeight = () => {
      if (!messagesContainerRef.current) return;
      
      let vh = window.innerHeight;
      // На мобильных window.visualViewport.height показывает реальную видимую область (без клавиатуры)
      if (isTouchViewport && window.visualViewport) {
        vh = window.visualViewport.height;
      }

      if (Math.abs(vh - prevHeight) < 1) {
        return;
      }
      
      messagesContainerRef.current.style.height = `${vh}px`;
      // Обновляем высоту мобильного chat-панели (position:fixed не реагирует на dvh в старых iOS)
      if (chatPanelRef.current) {
        chatPanelRef.current.style.height = `calc(${vh}px - var(--shar-mobile-top-inset, 0px) - var(--shar-mobile-bottom-inset, 0px))`;
      }
      
      // Также подстраиваем body, чтобы не было скролла за пределы
      document.body.style.height = `${vh}px`;
      
      // Обновляем isDesktopView только при фактическом изменении
      const nextIsDesktop = !(window.innerWidth < 773 || isTouchPointer);
      setIsDesktopView(prev => (prev === nextIsDesktop ? prev : nextIsDesktop));
      
      prevHeight = vh;
    };

    const scheduleUpdateHeight = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateHeight();
        rafId = null;
      });
    };

    // Блокируем скролл основной страницы
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyWidth = document.body.style.width;
    const originalBodyHeight = document.body.style.height;
    const originalBodyTop = document.body.style.top;
    const originalBodyBackground = document.body.style.background;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlBackground = document.documentElement.style.background;

    document.body.style.overflow = 'hidden';
    if (!isTauriRuntime) {
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
    }
    document.documentElement.style.overflow = 'hidden';
    
    /* 
    // Убираем фон body на мобильных для прозрачности инпута
    if (window.innerWidth < 768) {
      document.body.style.background = 'var(--bg-primary)';
      document.documentElement.style.background = 'var(--bg-primary)';
    }
    */
    
    // Инициализация
    scheduleUpdateHeight();

    // Слушатели
    if (isTouchViewport && window.visualViewport) {
      window.visualViewport.addEventListener('resize', scheduleUpdateHeight);
    }
    window.addEventListener('resize', scheduleUpdateHeight);

    return () => {
      // Очистка
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.width = originalBodyWidth;
      document.body.style.height = originalBodyHeight;
      document.body.style.top = originalBodyTop;
      document.body.style.background = originalBodyBackground;
      document.body.style.cursor = '';
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.background = originalHtmlBackground;
      document.documentElement.style.cursor = '';

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      if (isTouchViewport && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', scheduleUpdateHeight);
      }
      window.removeEventListener('resize', scheduleUpdateHeight);
    };
  }, [isTouchPointer]);

  const desktopChatBackgroundColor = theme === 'dark'
    ? (chatSettings?.chatBackgroundDark || '#0f172a')
    : (chatSettings?.chatBackgroundLight || '#f8fafc');
  const desktopChatBackgroundImage = theme === 'dark'
    ? String(chatSettings?.chatBackgroundImageDark || '').trim()
    : String(chatSettings?.chatBackgroundImageLight || '').trim();
  const desktopChatOverlayImage = theme === 'dark'
    ? String(chatSettings?.chatOverlayImageDark || '').trim()
    : String(chatSettings?.chatOverlayImageLight || '').trim();
  const desktopOverlayScale = Math.max(20, Math.min(200, Number(chatSettings?.chatOverlayScale ?? 100) || 100));
  const desktopOverlayOpacity = Math.max(0, Math.min(1, Number(chatSettings?.chatOverlayOpacity ?? 1) || 1));

  const isTauriMobileRuntime = typeof window !== 'undefined' && localStorage.getItem('_platform') === 'tauri';
  const mobileTopInset = isTauriMobileRuntime
    ? 'max(env(safe-area-inset-top, 0px), 26px)'
    : 'env(safe-area-inset-top, 0px)';
  const mobileBottomInset = isTauriMobileRuntime
    ? 'max(env(safe-area-inset-bottom, 0px), 28px)'
    : 'env(safe-area-inset-bottom, 0px)';
  const isElectronDesktop = isDesktopView && isElectronEnvironment;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('_platform') !== 'tauri') return;

    const root = document.documentElement;
    const applyInset = (nextInset: number) => {
      const safeInset = Math.max(0, Math.round(Number(nextInset) || 0));
      root.style.setProperty('--shar-mobile-keyboard-inset', `${safeInset}px`);
      window.dispatchEvent(new CustomEvent('shar-keyboard-inset-change', { detail: { inset: safeInset } }));
    };

    (window as any).__setSharKeyboardInset = applyInset;
    applyInset(0);

    return () => {
      if ((window as any).__setSharKeyboardInset === applyInset) {
        delete (window as any).__setSharKeyboardInset;
      }
      root.style.removeProperty('--shar-mobile-keyboard-inset');
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateElectronEnvironment = () => {
      setIsElectronEnvironment(
        Boolean(window.sharDesktop?.windowControls) ||
        document.documentElement.classList.contains('electron-app') ||
        document.documentElement.hasAttribute('data-electron-react-shell')
      );
    };

    updateElectronEnvironment();
    const rafId = requestAnimationFrame(updateElectronEnvironment);
    const timeoutId = window.setTimeout(updateElectronEnvironment, 50);

    const observer = new MutationObserver(updateElectronEnvironment);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-electron-react-shell']
    });

    window.addEventListener('resize', updateElectronEnvironment);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener('resize', updateElectronEnvironment);
    };
  }, []);

  console.log('[Messages] Overlay для чата:', {
    theme,
    desktopChatOverlayImage: desktopChatOverlayImage ? desktopChatOverlayImage.substring(0, 50) + '...' : 'НЕТ',
    desktopOverlayScale,
    desktopOverlayOpacity,
  });

  return (
    <>
      {selectedChat && (isElectronDesktop || !isDesktopView) ? (
        <style jsx global>{`
          .desktop-navigation,
          .bottom-nav-fixed {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `}</style>
      ) : null}

      <div 
        ref={messagesContainerRef}
        className={`${isDesktopView ? 'bg-transparent' : 'bg-[var(--bg-primary)] px-2'} text-[var(--text-primary)] flex w-full max-w-full overflow-hidden overflow-x-hidden rounded-none overscroll-none min-w-0 cursor-default relative`}
        style={{
          '--shar-mobile-top-inset': mobileTopInset,
          '--shar-mobile-bottom-inset': mobileBottomInset,
          height: isDesktopView
            ? (isElectronDesktop
                ? '100%'
                : '100dvh')
            : '100dvh',
          maxHeight: isDesktopView
            ? (isElectronDesktop
                ? '100%'
                : '100dvh')
            : '100dvh',
          ...(isDesktopView
            ? {
                backgroundColor: desktopChatBackgroundColor,
                ...(desktopChatBackgroundImage
                  ? {
                      backgroundImage: `url('${desktopChatBackgroundImage}')`,
                      backgroundSize: 'cover',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center center'
                    }
                  : {})
              }
            : {})
        } as React.CSSProperties}
      >
      {isDesktopView && !selectedChat && desktopChatOverlayImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url('${desktopChatOverlayImage}')`,
            backgroundSize: `${desktopOverlayScale * 3}px`,
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center center',
            backgroundAttachment: 'fixed',
            opacity: desktopOverlayOpacity,
            zIndex: 0,
          }}
        />
      )}

      {/* Левая панель - список чатов (единый блок с разными состояниями) */}
      <ChatSidebar
        selectedChat={selectedChat}
        isElectronDesktop={isElectronDesktop}
        isChatListCollapsed={isChatListCollapsed}
        setIsChatListCollapsed={setIsChatListCollapsed}
        showArchivedChats={showArchivedChats}
        setShowArchivedChats={setShowArchivedChats}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setShowNewChatModal={setShowNewChatModal}
        isLoadingChats={isLoadingChats}
        chats={chats}
        pinnedChats={pinnedChats}
        unpinnedChats={unpinnedChats}
        hoveredChatId={hoveredChatId}
        selectChat={selectChat}
        setHoveredChatId={setHoveredChatId}
        setContextMenuChat={setContextMenuChat}
        setChatContextMenuPosition={setChatContextMenuPosition}
        setShowChatContextMenu={setShowChatContextMenu}
        getChatTitle={getChatTitleWrapper}
        getChatAvatarData={getChatAvatarDataWrapper}
        currentUser={currentUser}
        users={users}
        chatDrafts={chatDrafts}
        onReorderPinnedChats={reorderPinnedChats}
        canReorderPinnedChats={!searchQuery.trim()}
        ChatListSkeleton={ChatListSkeleton}
      />

      {/* Правая панель - чат */}
      {selectedChat ? (
        <div
          className="flex-1 min-h-0 min-w-0 flex overflow-hidden bg-transparent"
          ref={chatPanelRef}
          style={!isDesktopView
            ? {
                position: 'fixed',
                top: 'var(--shar-mobile-top-inset, 0px)',
                left: 0,
                right: 0,
                height: 'calc(100dvh - var(--shar-mobile-top-inset, 0px) - var(--shar-mobile-bottom-inset, 0px))',
                zIndex: 45,
              }
            : {
                margin: '-10px 5px 5px 0',
                height: '100%',
                borderRadius: '20px',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-secondary)',
              }
          }
        >
          {/* Контейнер чата */}
          <div className="flex-1 min-h-0 min-w-0 flex flex-col relative bg-transparent overflow-hidden" style={{ borderRadius: isDesktopView ? '20px' : '0' }}>
          <ChatHeader
            selectedChat={selectedChat}
            isSelectionMode={isSelectionMode}
            selectedMessages={selectedMessages}
            messages={messages}
            currentUser={currentUser}
            users={users}
            typingUsers={typingUsers}
            showChatMenu={showChatMenu}
            editingMessageId={editingMessageId}
            newMessage={newMessage}
            savedMessageText={savedMessageText}
            messageInputRef={messageInputRef as React.RefObject<HTMLTextAreaElement>}
            setIsSelectionMode={setIsSelectionMode}
            setSelectedMessages={setSelectedMessages}
            setShowForwardModal={setShowForwardModal}
            setSavedMessageText={setSavedMessageText}
            setEditingMessageId={setEditingMessageId}
            setEditingMessageText={setEditingMessageText}
            setNewMessage={setNewMessage}
            deleteMessage={deleteMessage}
            selectChat={selectChat}
            setShowChatInfo={setShowChatInfo}
            setChatInfoTab={(tab) => setChatInfoTab(tab as 'profile' | 'media' | 'files' | 'links' | 'participants' | 'tasks')}
            getChatTitle={getChatTitleWrapper}
            getChatAvatarData={getChatAvatarDataWrapper}
            setShowChatMenu={setShowChatMenu}
            setShowMessageSearch={setShowMessageSearch}
            showMessageSearch={showMessageSearch}
            messageSearchQuery={messageSearchQuery}
            setMessageSearchQuery={setMessageSearchQuery}
            linkedTaskId={linkedTaskBanner.id}
            linkedTaskTitle={linkedTaskBanner.title}
            linkedTaskStatus={linkedTaskBanner.status}
            openLinkedTask={(taskId) => router.push(`/account?tab=tasks&task=${encodeURIComponent(taskId)}`)}
            pinnedMessageId={linkedTaskBanner.id ? null : (activePinnedMessage?.id || null)}
            pinnedMessagePreview={linkedTaskBanner.id ? null : activePinnedPreview}
            pinnedMessageCount={linkedTaskBanner.id ? 0 : pinnedMessages.length}
            pinnedMessagePosition={linkedTaskBanner.id ? 0 : (activePinnedMessageIndex + 1)}
            showPreviousPinned={() => {
              navigatePinned('prev');
            }}
            showNextPinned={() => {
              navigatePinned('next');
            }}
            openPinnedMessage={(_messageId) => {
              const targetMessageId = getPinnedNavigationMessageId(activePinnedMessage);
              if (!targetMessageId) return;
              scrollToMessage(targetMessageId);
            }}
            unpinMessage={() => {
              if (activePinnedMessage) {
                void togglePinMessage(activePinnedMessage);
              }
            }}
            togglePinChat={togglePinChat}
            deleteChat={deleteChat}
            toggleArchiveChat={toggleArchiveChat}
          />

          {activePinnedMessage && !linkedTaskBanner.id && isPinnedOverlayMobileView && (
            <div className="absolute top-[56px] md:top-[58px] left-0 right-0 z-20 px-2 md:px-4 lg:px-8 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-1.5 rounded-[50px] border border-[var(--border-light)] bg-[var(--bg-glass)]/95 backdrop-blur-xl px-2.5 py-1 shadow-[var(--shadow-card)]">
                <button
                  onClick={() => {
                    navigatePinned('prev');
                  }}
                  className="w-6 h-6 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-glass-hover)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={pinnedMessages.length <= 1}
                  title="Предыдущее закрепленное"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                </button>
                <button
                  onClick={() => {
                    if (suppressPinnedOverlayTapRef.current) {
                      suppressPinnedOverlayTapRef.current = false;
                      return;
                    }
                    const targetMessageId = getPinnedNavigationMessageId(activePinnedMessage);
                    if (!targetMessageId) return;
                    scrollToMessage(targetMessageId);
                  }}
                  onPointerDown={handlePinnedOverlayPointerDown}
                  onPointerUp={handlePinnedOverlayPointerUp}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-[9px] text-[var(--text-muted)] leading-none">{activePinnedMessageIndex + 1}/{pinnedMessages.length} закреп</p>
                  <p className="text-[11px] md:text-xs truncate text-[var(--text-primary)] leading-tight mt-0.5">
                    {activePinnedPreview}
                  </p>
                </button>
                <button
                  onClick={() => {
                    navigatePinned('next');
                  }}
                  className="w-6 h-6 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-glass-hover)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={pinnedMessages.length <= 1}
                  title="Следующее закрепленное"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                </button>
                <button
                  onClick={() => void togglePinMessage(activePinnedMessage)}
                  className="w-7 h-7 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-glass-hover)] flex items-center justify-center"
                  title="Открепить"
                >
                  <PinOff className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            </div>
          )}
          
          <div className="flex-1 min-h-0 flex flex-col relative">
            <div
              className={[
                'absolute inset-0',
                'visible',
              ].join(' ')}
            >
              <ChatTimeline
                key={selectedChat.id}
                chatId={selectedChat.id}
                messages={messages}
                messageSearchQuery={messageSearchQuery}
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
                composerContainerRef={composerContainerRef as React.RefObject<HTMLDivElement>}
                messagesEndRef={messagesEndRef}
                router={router}
                setSelectedMessages={setSelectedMessages}
                setIsSelectionMode={setIsSelectionMode}
                setContextMenuMessage={setContextMenuMessage}
                setContextMenuPosition={setContextMenuPosition}
                setShowMessageContextMenu={setShowMessageContextMenu}
                scrollToMessage={scrollToMessage}
                setCurrentImageUrl={setCurrentImageUrl}
                setShowImageModal={setShowImageModal}
                hasPinnedMessage={Boolean(activePinnedMessage) && !linkedTaskBanner.id && isPinnedOverlayMobileView}
                scrollBottomPadding={desktopComposerDockOffset}
                onNearBottomChange={(near) => {
                  chatNearBottomRef.current[selectedChat.id] = near;
                  setSelectedChatNearBottom(near);
                }}
                onViewportReadyChange={(ready) => {
                  if (ready) {
                    pendingRestoreChatScrollRef.current = null;
                  }
                }}
              />
            </div>

            {/* Индикатор загрузки при переключении чата */}
            {isLoadingMessages && (
              <div className="absolute inset-0 bg-white/80 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-30 pointer-events-none">
                <div className="bg-white dark:bg-gray-800 rounded-2xl px-6 py-4 shadow-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Загрузка сообщений...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Кнопка прокрутки вниз */}
            {!selectedChatNearBottom && (
              <button
                onClick={() => {
                  const container = getScrollContainer();
                  if (container) container.scrollTop = container.scrollHeight;
                }}
                className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-[var(--bg-glass)]/90 backdrop-blur-xl border border-[var(--border-light)] shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                aria-label="Прокрутить вниз"
              >
                <ChevronDown className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
            )}
          </div>

          {/* Message input */}
          <MessageInput
            selectedChat={selectedChat}
            isDragging={isDragging}
            attachments={attachments}
            isUploadingAttachments={isUploadingAttachments}
            editingMessageId={editingMessageId}
            replyToMessage={replyToMessage}
            showEmojiPicker={showEmojiPicker}
            showAttachmentMenu={showAttachmentMenu}
            showMentionSuggestions={showMentionSuggestions}
            mentionQuery={mentionQuery}
            users={users}
            currentUser={currentUser}
            composerContainerRef={composerContainerRef as React.RefObject<HTMLDivElement>}
            messageInputRef={messageInputRef as React.RefObject<HTMLTextAreaElement>}
            fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
            isUserActiveRef={isUserActiveRef}
            lastActivityTimeRef={lastActivityTimeRef}
            savedMessageText={savedMessageText}
            setIsDragging={setIsDragging}
            setAttachments={setAttachments}
            setIsUploadingAttachments={setIsUploadingAttachments}
            setEditingMessageId={setEditingMessageId}
            setNewMessage={setNewMessage}
            setSavedMessageText={setSavedMessageText}
            setReplyToMessage={setReplyToMessage}
            setShowEmojiPicker={setShowEmojiPicker}
            setShowAttachmentMenu={setShowAttachmentMenu}
            setShowMentionSuggestions={setShowMentionSuggestions}
            handleTextSelection={handleTextSelection}
            handleMessageChange={handleMessageChange}
            handleMessageKeyDown={handleMessageKeyDown}
            scrollToMessage={scrollToMessage}
            updateMessage={updateMessage}
            sendMessage={sendMessage}
          />

          <TextFormattingMenu
            showTextFormatMenu={showTextFormatMenu}
            formatMenuPosition={formatMenuPosition}
            setShowTextFormatMenu={setShowTextFormatMenu}
            applyFormatting={applyFormatting}
          />

          {/* Link Modal */}
          {showLinkModal && (
            <>
              <div 
                className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkUrl('');
                }}
              />
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl backdrop-blur-xl rounded-2xl p-6 min-w-[320px] max-w-[90vw]">
                <h3 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">Вставить ссылку</h3>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLinkSubmit();
                    } else if (e.key === 'Escape') {
                      setShowLinkModal(false);
                      setLinkUrl('');
                    }
                  }}
                  placeholder="https://example.com"
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleLinkSubmit}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
                  >
                    Вставить
                  </button>
                  <button
                    onClick={() => {
                      setShowLinkModal(false);
                      setLinkUrl('');
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-glass)] text-[var(--text-primary)] font-medium transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </>
          )}
          </div>

          {/* Chat Info Panel - Профиль собеседника */}
          {showChatInfo && (
            <ChatInfoPanel
              showChatInfo={showChatInfo}
              setShowChatInfo={setShowChatInfo}
              selectedChat={selectedChat}
              currentUser={currentUser}
              users={users}
              messages={messages}
              tasks={tasks}
              chatInfoTab={chatInfoTab}
              setChatInfoTab={(tab) => setChatInfoTab(tab as 'profile' | 'media' | 'files' | 'links' | 'participants' | 'tasks')}
              setNewChatName={setNewChatName}
              setShowRenameChatModal={setShowRenameChatModal}
              setShowAddParticipantModal={setShowAddParticipantModal}
              removeParticipant={removeParticipant}
              scrollToMessage={scrollToMessage}
              getChatAvatarData={getChatAvatarDataWrapper}
              getChatTitle={getChatTitleWrapper}
              onUpdateChatAvatar={updateChatAvatar}
            />
          )}
        </div>
      ) : (
        <div className={`${isTouchPointer ? 'hidden' : 'flex'} flex-1 items-center justify-center text-[var(--text-muted)] px-4 pb-[calc(env(safe-area-inset-bottom)+86px)] md:pb-0`}>
          <div className="text-center rounded-3xl px-5 py-4.5 border border-[var(--border-light)] bg-[var(--bg-glass)]/55 backdrop-blur-xl shadow-[var(--shadow-card)]">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full border border-[var(--border-light)] bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] flex items-center justify-center shadow-[var(--shadow-card)]">
              <MessageCircle className="w-8 h-8 opacity-70" />
            </div>
            <p className="text-[17px] leading-none font-semibold tracking-tight text-[var(--text-primary)]">Выберите чат</p>
            <p className="text-[11px] mt-1.5 text-[var(--text-secondary)]">или создайте новый</p>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onCreateChat={createChat}
        isGroupChat={isGroupChat}
        setIsGroupChat={setIsGroupChat}
        groupTitle={groupTitle}
        setGroupTitle={setGroupTitle}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedUsers={selectedUsers}
        setSelectedUsers={setSelectedUsers}
        filteredUsers={filteredUsers}
      />

      {/* Rename Chat Modal */}
      <RenameChatModal
        isOpen={showRenameChatModal}
        onClose={() => setShowRenameChatModal(false)}
        onRename={renameChat}
        newChatName={newChatName}
        setNewChatName={setNewChatName}
      />

      {/* Add Participant Modal */}
      <AddParticipantModal
        isOpen={showAddParticipantModal}
        onClose={() => setShowAddParticipantModal(false)}
        onAddParticipant={addParticipant}
        searchQuery={participantSearchQuery}
        setSearchQuery={setParticipantSearchQuery}
        users={users}
        currentUser={currentUser}
        selectedChat={selectedChat}
      />

      {/* Attachment Modals - Task Picker, Event Picker, Attachment Menu */}
      <AttachmentModals
        showTaskPicker={showTaskPicker}
        setShowTaskPicker={setShowTaskPicker}
        showEventPicker={showEventPicker}
        setShowEventPicker={setShowEventPicker}
        showAttachmentMenu={showAttachmentMenu}
        setShowAttachmentMenu={setShowAttachmentMenu}
        tasks={tasks}
        events={events}
        currentUser={currentUser}
        setAttachments={setAttachments}
        isUploadingAttachments={isUploadingAttachments}
        setIsUploadingAttachments={setIsUploadingAttachments}
        fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
      />

      {/* Forward Message Modal */}
      <ForwardModal
        isOpen={showForwardModal}
        onClose={() => {
          if (isForwardingMessages) return;
          setShowForwardModal(false);
          setForwardingMessage(null);
        }}
        onForward={forwardMessage}
        isForwarding={isForwardingMessages}
        message={forwardingMessage}
        selectedMessages={selectedMessages}
        isSelectionMode={isSelectionMode}
        messages={messages}
        chats={chats}
        currentUser={currentUser}
        users={users}
        selectedChat={selectedChat}
        selectedChatsForForward={selectedChatsForForward}
        setSelectedChatsForForward={setSelectedChatsForForward}
      />

      {/* Read By Modal */}
      <ReadByModal
        isOpen={showReadByModal}
        onClose={() => {
          setShowReadByModal(false);
          setReadByMessage(null);
        }}
        message={readByMessage}
        chat={selectedChat}
        users={users}
      />

      {/* Message Context Menu */}
      <MessageContextMenu
        message={contextMenuMessage}
        position={contextMenuPosition}
        currentUser={currentUser}
        messageInputRef={messageInputRef as React.RefObject<HTMLTextAreaElement>}
        onClose={() => {
          setShowMessageContextMenu(false);
          setContextMenuMessage(null);
        }}
        onReply={(msg) => {
          setReplyToMessage(msg);
          messageInputRef.current?.focus();
        }}
        onForward={(msg) => {
          setForwardingMessage(msg);
          setShowForwardModal(true);
        }}
        onEdit={(msgId, content) => {
          setEditingMessageId(msgId);
          setSavedMessageText(messageInputRef.current?.value || '');
          if (messageInputRef.current) {
            syncComposerHeight(content);
          }
          setNewMessage(content);
          messageInputRef.current?.focus();
        }}
        onDelete={(messageId) => {
          void deleteMessage(messageId);
        }}
        onShowTaskSelector={(msg) => {
          setCreatingTaskFromMessage(msg);
          setShowTaskListSelector(true);
        }}
        onLoadTodoLists={async () => {
          try {
            // Получаем userId из всех возможных источников
            let userId = currentUser?.id;
            if (!userId) {
              const myAccountRaw = localStorage.getItem('myAccount');
              if (myAccountRaw) {
                const myAccount = JSON.parse(myAccountRaw);
                userId = myAccount?.id;
              }
            }
            
            const userIdQuery = userId ? `?userId=${encodeURIComponent(userId)}` : '';
            console.log('[Messages] Загрузка списков задач для userId:', userId);
            
            const res = await fetch(`/api/todos${userIdQuery}`);
            if (res.ok) {
              const data = await res.json();
              console.log('[Messages] Todo lists загружены из API:', data);
              const lists = Array.isArray(data.lists) ? data.lists : (Array.isArray(data) ? data : []);
              console.log('[Messages] Установка todoLists:', lists);
              setTodoLists(lists);
            } else {
              console.error('[Messages] Ошибка загрузки списков задач, статус:', res.status);
            }
          } catch (error) {
            console.error('[Messages] Error loading todo lists:', error);
          }
        }}
        onShowEventSelector={(msg) => {
          setCreatingEventFromMessage(msg);
          setShowEventCalendarSelector(true);
        }}
        onLoadCalendars={async () => {
          try {
            const username = localStorage.getItem('username') || '';
            const myAccountRaw = localStorage.getItem('myAccount');
            const myAccount = myAccountRaw ? JSON.parse(myAccountRaw) : null;
            const params = new URLSearchParams();
            if (myAccount?.id) params.set('userId', myAccount.id);
            if (username) params.set('username', username);
            if (myAccount?.department) params.set('department', myAccount.department);
            const res = await fetch(`/api/calendar-lists?${params.toString()}`);
            if (res.ok) {
              const data = await res.json();
              setCalendarLists(Array.isArray(data) ? data : data.lists || []);
            }
          } catch (error) {
            console.error('Error loading calendars:', error);
          }
        }}
        onTogglePin={(msg) => {
          void togglePinMessage(msg);
        }}
        canPinMessage={!linkedTaskBanner.id}
      />

      {/* Image Modal - Telegram-style image viewer with zoom */}
      <ImageModal
        isOpen={showImageModal}
        imageUrl={currentImageUrl}
        onClose={() => setShowImageModal(false)}
        zoom={imageZoom}
        setZoom={setImageZoom}
      />

      {/* Модалка выбора списка и создания задачи из сообщения */}
      <TaskListSelector
        show={showTaskListSelector}
        message={creatingTaskFromMessage}
        todoLists={todoLists}
        currentUserId={currentUser?.id}
        onClose={() => {
          setShowTaskListSelector(false);
          setCreatingTaskFromMessage(null);
        }}
        onTaskCreated={() => {
          loadTasks();
        }}
      />

      {/* Modal выбора календаря для создания события */}
      <EventCalendarSelector
        show={showEventCalendarSelector}
        message={creatingEventFromMessage}
        calendarLists={calendarLists}
        onClose={() => {
          setShowEventCalendarSelector(false);
          setCreatingEventFromMessage(null);
        }}
      />

      {/* Chat Context Menu */}
      {showChatContextMenu && contextMenuChat && (
        <ChatContextMenu
          chat={contextMenuChat}
          position={chatContextMenuPosition}
          currentUser={currentUser}
          onClose={() => {
            setShowChatContextMenu(false);
            setContextMenuChat(null);
          }}
          onTogglePin={(chatId) => {
            togglePinChat(chatId);
          }}
          onToggleArchive={(chatId, isArchived) => {
            void toggleArchiveChat(chatId, isArchived);
          }}
        />
      )}
      </div>
    </>
  );
}
