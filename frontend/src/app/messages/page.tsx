'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();

  // Проверка авторизации
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated || isAuthenticated !== 'true') {
      router.push('/login');
      return;
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

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // 🚀 PERFORMANCE: Loading states для LCP optimization
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
  const [showReadByModal, setShowReadByModal] = useState(false);
  const [readByMessage, setReadByMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({});
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
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
    bubbleColor: '#3c3d96', // цвет для темной темы
    bubbleColorLight: '#453de6', // цвет для светлой темы
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
  const useDarkTextOnBubble = needsDarkText(currentBubbleColor);
  const myBubbleTextClass = useDarkTextOnBubble ? 'text-gray-900' : 'text-white';
  const myBubbleTextMutedClass = useDarkTextOnBubble ? 'text-gray-700' : 'text-white/70';
  const composerContextOffset = editingMessageId || replyToMessage ? 46 : 0;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesListRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
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
  const hydratedMessagesCacheRef = useRef<Set<string>>(new Set());
  const hydratedChatsCacheKeyRef = useRef<string | null>(null);

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
    if (!selectedChat) return { id: null as string | null, title: null as string | null };

    const chatWithTask = selectedChat as Chat & {
      todoId?: string;
      todo_id?: string;
      taskTitle?: string;
    };

    const taskIdRaw = chatWithTask.todoId || chatWithTask.todo_id || null;
    const taskId = taskIdRaw ? String(taskIdRaw).trim() : null;

    if (!taskId) return { id: null as string | null, title: null as string | null };

    const taskTitle = chatWithTask.taskTitle || 'Привязано к задаче';
    return { id: taskId, title: taskTitle };
  }, [selectedChat]);

  // Функция выбора чата с обновлением URL и localStorage
  const selectChat = useCallback((chat: Chat | null) => {
    const previousChat = selectedChat;
    if (!chat) {
      lastManualChatCloseAtRef.current = Date.now();
    }

    const currentMessage = messageInputRef.current?.value || '';

    setSelectedChat(chat);
    setShowChatInfo(false);
    setIsSelectionMode(false);
    setSelectedMessages(new Set());

    if (chat && messagesListRef.current) {
      const container = messagesListRef.current;
      container.scrollTop = container.scrollHeight;
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

      const draftText = chat ? (chatDrafts[chat.id] || '') : '';
      setNewMessage(draftText);

      if (!messageInputRef.current) return;
      syncComposerHeight(draftText);
    }, 0);
    
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);

      if (!chat) {
        url.searchParams.delete('chat');
        localStorage.removeItem('selectedChatId');
        window.history.replaceState({}, '', url.toString());
        return;
      }

      requestAnimationFrame(() => {
        url.searchParams.set('chat', chat.id);
        localStorage.setItem('selectedChatId', chat.id);
        window.history.replaceState({}, '', url.toString());
      });
    }
  }, [selectedChat, chatDrafts, messageInputRef, syncComposerHeight]);

  // Загрузка настроек чата
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setChatSettings(settings);
      // Устанавливаем CSS переменную для desktop font size при загрузке
      if (settings.fontSize) {
        document.documentElement.style.setProperty('--desktop-font-size', `${settings.fontSize}px`);
      }
    }
    
    // Слушатель изменений настроек
    const handleSettingsChange = (e: CustomEvent) => {
      setChatSettings(e.detail);
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

  // Периодическое обновление статуса пользователя и загрузка статусов других пользователей
  useEffect(() => {
    if (!currentUser) return;

    void updateUserStatus({ isOnline: true, force: true });
    void loadUserStatuses();

    const statusInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void updateUserStatus({ isOnline: true });
    }, 60000);

    const usersStatusInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void loadUserStatuses();
    }, 45000);

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
      loadMessages(selectedChat.id, false);
      
      // Polling для обновления сообщений каждые 5 секунд (только если пользователь не активен)
      const chatId = selectedChat.id;
      const interval = setInterval(() => {
        // Не запрашиваем данные если вкладка не активна
        if (typeof document !== 'undefined' && document.hidden) return;
        
        // Не обновляем если пользователь активен (печатает или взаимодействует)
        const timeSinceLastActivity = Date.now() - lastActivityTimeRef.current;
        if (!isUserActiveRef.current || timeSinceLastActivity > 2000) {
          loadMessages(chatId, true);
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [selectedChat?.id]);

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

  // Открываем чат из URL параметра или localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && chats.length > 0 && !selectedChat) {
      if (Date.now() - lastManualChatCloseAtRef.current < 700) {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      let chatId = params.get('chat');
      
      // Если нет в URL, пробуем из localStorage
      if (!chatId) {
        chatId = localStorage.getItem('selectedChatId');
      }
      
      if (chatId) {
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
          selectChat(chat);
        }
      }
    }
  }, [chats, selectedChat, selectChat]);
  
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

  const scrollToBottom = (smooth: boolean = true) => {
    if (messagesListRef.current) {
      messagesListRef.current.scrollTo({
        top: messagesListRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

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
        // API возвращает объект с полем todos
        const tasksArray = data.todos || [];
        setTasks(tasksArray);
        setTodoLists(Array.isArray(data.lists) ? data.lists : []);
        console.log('Loaded all tasks:', tasksArray.length);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
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
  const handleTextSelection = useCallback(() => {
    if (!messageInputRef.current) return;
    
    // Debounce для предотвращения блокировки на каждое движение мыши
    if (selectionDebounceRef.current) {
      clearTimeout(selectionDebounceRef.current);
    }
    
    selectionDebounceRef.current = setTimeout(() => {
      if (!messageInputRef.current) return;
      
      const start = messageInputRef.current.selectionStart;
      const end = messageInputRef.current.selectionEnd;
      const selectedText = messageInputRef.current.value.substring(start, end);
      
      // Показываем меню только если выделено больше 3 символов
      if (selectedText && start !== end && selectedText.length > 3) {
        setTextSelection({ start, end, text: selectedText });
        
        // Используем requestAnimationFrame для getBoundingClientRect (избегаем блокировки)
        requestAnimationFrame(() => {
          if (!messageInputRef.current) return;
          const textarea = messageInputRef.current;
          const rect = textarea.getBoundingClientRect();

          const styles = window.getComputedStyle(textarea);
          const paddingLeft = parseFloat(styles.paddingLeft || '0') || 0;
          const paddingRight = parseFloat(styles.paddingRight || '0') || 0;
          const paddingTop = parseFloat(styles.paddingTop || '0') || 0;
          const lineHeight = parseFloat(styles.lineHeight || '20') || 20;
          const contentWidth = Math.max(40, textarea.clientWidth - paddingLeft - paddingRight);

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.font = styles.font || `${styles.fontSize} ${styles.fontFamily}`;

          const getCaretCoords = (index: number) => {
            const text = textarea.value.slice(0, Math.max(0, Math.min(index, textarea.value.length)));
            let line = 0;
            let x = 0;

            for (let i = 0; i < text.length; i += 1) {
              const char = text[i];

              if (char === '\n') {
                line += 1;
                x = 0;
                continue;
              }

              const charWidth = ctx.measureText(char).width;

              if (x > 0 && x + charWidth > contentWidth) {
                line += 1;
                x = 0;
              }

              x += charWidth;
            }

            return { line, x };
          };

          const startCaret = getCaretCoords(start);
          const endCaret = getCaretCoords(end);

          const isSameLine = startCaret.line === endCaret.line;
          const selectedCenterX = isSameLine
            ? (startCaret.x + endCaret.x) / 2
            : contentWidth / 2;

          const menuLeft = rect.left + paddingLeft + selectedCenterX;
          const menuTop = rect.top + paddingTop + (Math.min(startCaret.line, endCaret.line) * lineHeight) - 44;

          const clampedLeft = Math.max(24, Math.min(window.innerWidth - 24, menuLeft));
          const clampedTop = Math.max(8, menuTop);

          setFormatMenuPosition({
            top: clampedTop,
            left: clampedLeft
          });
          setShowTextFormatMenu(true);
        });
      } else {
        setShowTextFormatMenu(false);
      }
    }, 200); // Увеличен debounce до 200ms для лучшего INP
  }, []);

  const applyFormatting = (formatType: 'bold' | 'italic' | 'underline' | 'link') => {
    if (!messageInputRef.current) return;
    
    const { start, end, text } = textSelection;
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
      case 'link':
        const url = prompt('Введите URL:');
        if (url) {
          formattedText = `[${text}](${url})`;
        } else {
          return;
        }
        break;
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

  const loadChats = useCallback(async () => {
    if (!currentUser) {
      return;
    }

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
      const res = await fetch(`/api/chats?user_id=${currentUser.id}`);
      
      if (res.ok) {
        let data = await res.json();
        
        const getSystemChatPinState = (chatId: string): boolean => {
          const stored = localStorage.getItem(`chat_pin_${chatId}`);
          return stored === null ? true : stored === 'true';
        };
        
        const hasNotificationsChat = data.some((chat: any) => chat.isNotificationsChat || chat.isSystemChat);
        const hasFavoritesChat = data.some((chat: any) => chat.isFavoritesChat);
        
        // Обновляем состояние закрепления для системных чатов из localStorage
        data = data.map((chat: any) => {
          const isSystemChat = chat.isFavoritesChat || chat.isNotificationsChat || chat.isSystemChat;
          const remotePinKey = `chat_pin_remote_${currentUser.id}_${chat.id}`;
          const remotePinValue = localStorage.getItem(remotePinKey);

          if (isSystemChat) {
            return {
              ...chat,
              pinnedByUser: { 
                ...(chat.pinnedByUser || {}),
                [currentUser.id]: getSystemChatPinState(chat.id) 
              }
            };
          }

          if (remotePinValue !== null) {
            return {
              ...chat,
              pinnedByUser: {
                ...(chat.pinnedByUser || {}),
                [currentUser.id]: remotePinValue === 'true'
              }
            };
          }

          return chat;
        });
        
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
            pinnedByUser: { [currentUser.id]: getSystemChatPinState(favoritesChatId) },
            unreadCount: 0
          };
          data = [favoritesChat, ...data];
        }
        
        // Получаем или создаем чат уведомлений из backend
        if (!hasNotificationsChat) {
          try {
            const notifRes = await fetch(`/api/chats/notifications/${currentUser.id}`);
            if (notifRes.ok) {
              const notificationsChat = await notifRes.json();
              // Устанавливаем локальное состояние закрепления
              if (!notificationsChat.pinnedByUser) {
                notificationsChat.pinnedByUser = {};
              }
              notificationsChat.pinnedByUser[currentUser.id] = getSystemChatPinState(notificationsChat.id);
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
            chat?.pinnedByUser?.[currentUserId] ? '1' : '0',
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
        // Сохраняем локальные изменения pinnedByUser при обновлении
        setChats(prevChats => {
          // Если данные не изменились, не обновляем state
          if (prevChats.length > 0 && areChatListsEquivalent(prevChats, data)) {
            return prevChats;
          }
          
          // Сохраняем локальное состояние закрепления при обновлении
          if (prevChats.length > 0) {
            return data.map((newChat: any) => {
              const oldChat = prevChats.find(c => c.id === newChat.id);
              const isSystemChat = newChat.isFavoritesChat || newChat.isNotificationsChat || newChat.isSystemChat;
              if (isSystemChat && oldChat?.pinnedByUser) {
                // Для системных чатов сохраняем локальное состояние закрепления
                return {
                  ...newChat,
                  pinnedByUser: {
                    ...newChat.pinnedByUser,
                    ...oldChat.pinnedByUser
                  }
                };
              }
              return newChat;
            });
          }
          
          return data;
        });

        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {
          // Ignore localStorage quota/serialization issues
        }
        
        // Обновляем selectedChat с новыми данными (например, readMessagesByUser)
        // Но НЕ вызываем setSelectedChat чтобы не триггерить useEffect
        setSelectedChat((prev: Chat | null) => {
          if (!prev) return prev;
          const updatedChat = data.find((c: any) => c.id === prev.id);
          if (updatedChat && JSON.stringify(updatedChat.readMessagesByUser) !== JSON.stringify(prev.readMessagesByUser)) {
            // Только обновляем если изменились данные о прочтении
            return { ...prev, readMessagesByUser: updatedChat.readMessagesByUser };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoadingChats(false); // 🚀 PERFORMANCE: End loading
    }
  }, [currentUser]);

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

  const loadMessages = useCallback(async (chatId: string, isPolling: boolean = false) => {
    if (!isPolling) setIsLoadingMessages(true); // 🚀 PERFORMANCE

    if (!isPolling && !hydratedMessagesCacheRef.current.has(chatId)) {
      hydratedMessagesCacheRef.current.add(chatId);
      try {
        const cacheKey = `messages_chat_cache_${chatId}`;
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cachedMessages = JSON.parse(cachedRaw);
          if (Array.isArray(cachedMessages) && cachedMessages.length > 0) {
            setMessages(cachedMessages);
            setIsLoadingMessages(false);
          }
        }
      } catch (error) {
        console.warn('Failed to restore messages cache:', error);
      }
    }

    try {
      const res = await fetch(`/api/chats/${chatId}/messages`);
      if (res.ok) {
        const data = await res.json();

        if (currentUser) {
          void updateUserStatus({ isOnline: true });
        }
        
        // Проверяем был ли пользователь внизу ДО обновления сообщений
        const container = messagesListRef.current;
        const wasAtBottom = container 
          ? (container.scrollHeight - container.scrollTop - container.clientHeight < 50) 
          : true;
        
        // Проверяем есть ли НОВЫЕ сообщения (сравниваем количество)
        const hasNewMessages = data.length > messages.length;
        
        // Звуковое уведомление ОТКЛЮЧЕНО - раздражает пользователей
        // if (isPolling && hasNewMessages && notificationSound && data.length > 0) {
        //   const lastMessage = data[data.length - 1];
        //   if (lastMessage.authorId !== currentUser?.id) {
        //     // Проверяем настройки уведомлений для этого чата
        //     const notificationsEnabled = localStorage.getItem(`chat_notifications_${chatId}`) !== 'false';
        //     if (notificationsEnabled) {
        //       notificationSound.play().catch(e => console.log('Звук заблокирован браузером'));
        //     }
        //   }
        // }
        
        // Слияние с локальными pending-сообщениями (optimistic queue)
        const pendingForChat = pendingOutgoingRef.current.filter((msg) => msg.chatId === chatId);
        const unresolvedPending = pendingForChat.filter((pendingMsg) => {
          return !data.some((serverMsg: Message) => isSameOutgoingCandidate(serverMsg, pendingMsg));
        });

        pendingOutgoingRef.current = pendingOutgoingRef.current.filter((msg) => {
          if (msg.chatId !== chatId) return true;
          return unresolvedPending.some((pendingMsg) => pendingMsg.id === msg.id);
        });

        const mergedMessages = [...data, ...unresolvedPending].sort((a, b) => {
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return aTime - bTime;
        });

        setMessages(mergedMessages);

        try {
          localStorage.setItem(`messages_chat_cache_${chatId}`, JSON.stringify(mergedMessages));
        } catch {
          // Ignore localStorage quota/serialization issues
        }
        
        // Скролл к последнему сообщению:
        // - При первой загрузке всегда
        // - При polling только если пользователь был внизу И пришли новые сообщения
        // НО НЕ скроллим если клавиатура открыта (фокус на инпуте) - это вызывает баги
        const isKeyboardOpen = messageInputRef.current === document.activeElement;
        if (!isPolling || (wasAtBottom && hasNewMessages && !isKeyboardOpen)) {
          const scrollBehavior: ScrollBehavior = isPolling ? 'smooth' : 'auto';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (messagesListRef.current) {
                messagesListRef.current.scrollTo({
                  top: messagesListRef.current.scrollHeight,
                  behavior: scrollBehavior
                });
              }
            });
          });
        }
        
        // Отмечаем сообщения как прочитанные (при любой загрузке, если есть новые сообщения)
        if (data.length > 0 && currentUser) {
          const lastMessage = data[data.length - 1];
          await fetch(`/api/chats/${chatId}/mark-read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser.id,
              lastMessageId: lastMessage.id
            })
          });
        }
        
        // При polling обновляем данные чата (для галочек прочтения) - ПОСЛЕ mark-read
        if (isPolling && currentUser) {
          const chatRes = await fetch(`/api/chats?user_id=${currentUser.id}`);
          if (chatRes.ok) {
            const allChats = await chatRes.json();
            const updatedChat = allChats.find((c: Chat) => c.id === chatId);
            if (updatedChat) {
              setSelectedChat((prev: Chat | null) => prev ? { ...prev, readMessagesByUser: updatedChat.readMessagesByUser } : null);
              // Обновляем список чатов для badge - сохраняем локальные pinnedByUser
              setChats(prevChats => {
                return allChats.map((newChat: Chat) => {
                  const oldChat = prevChats.find(c => c.id === newChat.id);
                  const isSystemChat = newChat.isFavoritesChat || newChat.isNotificationsChat || newChat.isSystemChat;
                  if (isSystemChat && oldChat?.pinnedByUser) {
                    return {
                      ...newChat,
                      pinnedByUser: {
                        ...newChat.pinnedByUser,
                        ...oldChat.pinnedByUser
                      }
                    };
                  }
                  return newChat;
                });
              });
            }
          }
        } else if (!isPolling) {
          // Обновляем счетчики непрочитанных при первой загрузке
          loadChats();
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      if (!isPolling) setIsLoadingMessages(false); // 🚀 PERFORMANCE  
    }
  }, [messagesListRef, messages, messageInputRef, currentUser, loadChats, updateUserStatus]);

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

  const sendMessage = useCallback(async () => {
    const messageText = messageInputRef.current?.value || '';
    // Проверяем: должен быть либо текст, либо вложения
    if ((!messageText.trim() && attachments.length === 0) || !selectedChat || !currentUser || !selectedChat.id) return;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      chatId: selectedChat.id,
      authorId: currentUser.id,
      authorName: currentUser.name || currentUser.username || 'Вы',
      content: messageText,
      mentions: [],
      replyToId: replyToMessage?.id,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: new Date().toISOString(),
      isEdited: false,
    };

    pendingOutgoingRef.current = [...pendingOutgoingRef.current, optimisticMessage];
    setMessages((prev) => [...prev, optimisticMessage]);

    if (messageInputRef.current) {
      messageInputRef.current.value = '';
    }
      syncComposerHeight('');
      // Trigger dock offset recalculation for proportional scroll
      if (composerContainerRef.current) {
        const event = new Event('resize');
        window.dispatchEvent(event);
      }
    setReplyToMessage(null);
    setAttachments([]);

    if (selectedChat) {
      setChatDrafts(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[selectedChat.id];
        return newDrafts;
      });
    }

    setTimeout(() => {
      if (messagesListRef.current) {
        messagesListRef.current.scrollTo({
          top: messagesListRef.current.scrollHeight,
          behavior: 'auto'
        });
      }
    }, 60);

    try {
      const res = await fetch(`/api/chats/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentUser.id,
          content: messageText,
          mentions: [],
          replyToId: replyToMessage?.id,
          attachments: attachments.length > 0 ? attachments : undefined
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        pendingOutgoingRef.current = pendingOutgoingRef.current.filter((msg) => msg.id !== optimisticMessage.id);
        setMessages(prev => {
          const hasServerMessage = prev.some((msg) => msg.id === newMsg.id);
          const replaced = prev.map((msg) => (msg.id === optimisticMessage.id ? newMsg : msg));
          return hasServerMessage ? replaced.filter((msg) => msg.id !== optimisticMessage.id) : replaced;
        });
        
        void updateUserStatus({ isOnline: true, force: true });

        loadChats();
      } else {
        pendingOutgoingRef.current = pendingOutgoingRef.current.filter((msg) => msg.id !== optimisticMessage.id);
        setMessages(prev => prev.filter((msg) => msg.id !== optimisticMessage.id));
      }
    } catch (error) {
      pendingOutgoingRef.current = pendingOutgoingRef.current.filter((msg) => msg.id !== optimisticMessage.id);
      setMessages(prev => prev.filter((msg) => msg.id !== optimisticMessage.id));
      console.error('Error sending message:', error);
    }
  }, [messageInputRef, selectedChat, currentUser, attachments, replyToMessage, messagesListRef, loadChats, syncComposerHeight, updateUserStatus]);

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
          // Trigger dock offset recalculation for proportional scroll
          if (composerContainerRef.current) {
            const event = new Event('resize');
            window.dispatchEvent(event);
          }
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
  }, [editingMessageId, savedMessageText, messageInputRef, updateMessage, sendMessage, syncComposerHeight]);

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
      const raw = pinMap?.[userId];
      if (typeof raw === 'string') {
        return raw.toLowerCase() === 'true';
      }
      return raw === true;
    };

    const chat = chats.find(c => c.id === chatId);
    const isPinned = getPinState(chat, currentUser.id);
    const newPinState = !isPinned;
    const remotePinStorageKey = `chat_pin_remote_${currentUser.id}_${chatId}`;

    // Для системных чатов (Избранное, Уведомления) сохраняем в localStorage
    const isSystemChat = chat?.isFavoritesChat || chat?.isNotificationsChat || chat?.isSystemChat;
    
    if (isSystemChat) {
      // Сохраняем в localStorage и обновляем локальный state
      localStorage.setItem(`chat_pin_${chatId}`, String(newPinState));
      
      // Обновляем локальный state немедленно
      setChats(prevChats => 
        prevChats.map(c => 
          c.id === chatId 
            ? { ...c, pinnedByUser: { ...c.pinnedByUser, [currentUser.id]: newPinState } }
            : c
        )
      );
      return;
    }

    // Для обычных чатов используем API
    // Оптимистичное обновление сразу
    setChats(prevChats => 
      prevChats.map(c => 
        c.id === chatId 
          ? { ...c, pinnedByUser: { ...c.pinnedByUser, [currentUser.id]: newPinState } }
          : c
      )
    );
    localStorage.setItem(remotePinStorageKey, String(newPinState));
    
    try {
      const res = await fetch(`/api/chats/${chatId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          isPinned: newPinState
        })
      });

      if (!res.ok) {
        console.warn(`[togglePinChat] Backend pin sync failed (${res.status}), keeping local state`);
        return;
      }

      const payload = await res.json().catch(() => null);
      if (!payload?.success) {
        console.warn('[togglePinChat] Backend payload is not success, keeping local state');
        return;
      }

      const serverPinned = typeof payload?.isPinned === 'boolean' ? payload.isPinned : newPinState;
      localStorage.setItem(remotePinStorageKey, String(serverPinned));
      setChats(prevChats =>
        prevChats.map(c =>
          c.id === chatId
            ? { ...c, pinnedByUser: { ...(c.pinnedByUser || {}), [currentUser.id]: serverPinned } }
            : c
        )
      );
      setSelectedChat(prev =>
        prev?.id === chatId
          ? { ...prev, pinnedByUser: { ...(prev.pinnedByUser || {}), [currentUser.id]: serverPinned } }
          : prev
      );

      await loadChats();
    } catch (error) {
      console.error('Error toggling pin:', error);
      console.warn('[togglePinChat] Keeping local pin state due to sync error');
    }
  };

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
        loadChats();
        // Обновляем selectedChat локально
        setSelectedChat((prev: Chat | null) => prev ? {
          ...prev,
          participantIds: [...prev.participantIds, userId]
        } : null);
        setShowAddParticipantModal(false);
        setParticipantSearchQuery('');
      }
    } catch (error) {
      console.error('Error adding participant:', error);
    }
  };

  // Переслать сообщение(я)
  const forwardMessage = async () => {
    if (selectedChatsForForward.length === 0) return;
    
    // Если есть множественный выбор, пересылаем выбранные сообщения
    const messagesToForward = (isSelectionMode && selectedMessages.size > 0
      ? Array.from(selectedMessages).map(id => messages.find(m => m.id === id)).filter((m): m is Message => !!m)
      : forwardingMessage ? [forwardingMessage] : []);
    
    if (messagesToForward.length === 0) return;
    
    try {
      console.log('Forwarding messages:', messagesToForward.map(m => m.id), 'to chats:', selectedChatsForForward);
      
      // Пересылаем каждое сообщение
      for (const message of messagesToForward) {
        // Используем ID чата сообщения, так как пересылаемое сообщение может быть из другого чата
        const sourceChatId = message.chatId || selectedChat?.id;
        if (!sourceChatId) {
          throw new Error('Не удалось определить исходный чат для пересылки');
        }

        const res = await fetch(
          `/api/chats/${sourceChatId}/messages/${message.id}/forward`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetChatIds: selectedChatsForForward })
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
      }
      
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
        loadChats();
        // Обновляем selectedChat локально
        setSelectedChat((prev: Chat | null) => prev ? {
          ...prev,
          participantIds: prev.participantIds.filter((id: string) => id !== userId)
        } : null);
      }
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  };

  // Переименовать групповой чат (только для создателя)
  const renameChat = async (newTitle: string) => {
    if (!selectedChat || !selectedChat.isGroup || !newTitle.trim()) return;
    if (selectedChat.creatorId !== currentUser?.id) return;
    
    try {
      const res = await fetch(`/api/chats/${selectedChat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      });

      if (res.ok) {
        loadChats();
        // Обновляем selectedChat локально
        setSelectedChat((prev: Chat | null) => prev ? {
          ...prev,
          title: newTitle.trim()
        } : null);
        setShowRenameChatModal(false);
        setNewChatName('');
      }
    } catch (error) {
      console.error('Error renaming chat:', error);
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

  // Разделяем чаты на закрепленные и обычные - мемоизировано для стабильности
  const { pinnedChats, unpinnedChats } = useMemo(() => {
    const userId = currentUser?.id || '';
    const getPinState = (chat: Chat): boolean => {
      if (typeof window !== 'undefined') {
        const localPinned = localStorage.getItem(`chat_pin_remote_${userId}_${chat.id}`);
        if (localPinned !== null) {
          return localPinned === 'true';
        }
      }

      const pinMap = (chat as any).pinnedByUser || (chat as any).pinned_by_user || {};
      const raw = pinMap?.[userId];
      if (typeof raw === 'string') return raw.toLowerCase() === 'true';
      return raw === true;
    };

    const allPinnedChats = chats.filter(chat => getPinState(chat));
    const allUnpinnedChats = chats.filter(chat => !getPinState(chat));
    
    return {
      pinnedChats: filterChatsBySearch(allPinnedChats),
      unpinnedChats: filterChatsBySearch(allUnpinnedChats)
    };
  }, [chats, currentUser?.id, searchQuery]); // Заменили filterChatsBySearch на searchQuery

  const messagesContainerRef = useRef<HTMLDivElement>(null); // Ref для основного контейнера страницы

  // Синхронизируем состояние открытия чата с оболочкой account мгновенно
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('chat-selection-changed', {
      detail: { isOpen: !!selectedChat }
    }));
  }, [selectedChat]);

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

  useEffect(() => {
    if (activeTabParam !== 'messages' || !selectedChat || messages.length === 0) return;

    const now = Date.now();
    if (now - lastTabAutoScrollAtRef.current < 800) return;

    const container = messagesListRef.current;
    if (!container) return;

    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceToBottom < 180;

    if (!isNearBottom) return;

    lastTabAutoScrollAtRef.current = now;
    requestAnimationFrame(() => {
      scrollToBottom(false);
    });
  }, [activeTabParam, selectedChat?.id, messages.length]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const syncScrollOnVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (activeTabParam !== 'messages' || !selectedChat) return;

      const now = Date.now();
      if (now - lastTabAutoScrollAtRef.current < 1200) return;

      const container = messagesListRef.current;
      if (!container) return;

      const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceToBottom > 180) return;

      lastTabAutoScrollAtRef.current = now;
      requestAnimationFrame(() => scrollToBottom(false));
    };

    document.addEventListener('visibilitychange', syncScrollOnVisible);
    window.addEventListener('focus', syncScrollOnVisible);

    return () => {
      document.removeEventListener('visibilitychange', syncScrollOnVisible);
      window.removeEventListener('focus', syncScrollOnVisible);
    };
  }, [activeTabParam, selectedChat?.id]);

  // --- FIX MOBILE KEYBOARD ---
  // Используем direct DOM manipulation чтобы избежать ре-рендеров при ресайзе (клавиатура)
  // Это предотвращает закрытие клавиатуры
  useEffect(() => {
    document.body.style.cursor = '';
    document.documentElement.style.cursor = '';

    let prevHeight = window.innerHeight;
    let rafId: number | null = null;
    const isTouchViewport = window.matchMedia('(pointer: coarse)').matches;
    
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
      
      // Также подстраиваем body, чтобы не было скролла за пределы
      document.body.style.height = `${vh}px`;
      
      // Обновляем isDesktopView только при фактическом изменении
      const nextIsDesktop = !(window.innerWidth < 773 || isTouchPointer);
      setIsDesktopView(prev => (prev === nextIsDesktop ? prev : nextIsDesktop));
      
      // Если высота уменьшилась (клавиатура открылась) - скроллим к последнему сообщению
      if (vh < prevHeight && messagesListRef.current) {
        setTimeout(() => {
          if (messagesListRef.current) {
            messagesListRef.current.scrollTo({
              top: messagesListRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }
        }, 50);
      }
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
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = '0';
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
  }, []);

  return (
    <div 
      ref={messagesContainerRef}
      className="bg-[var(--bg-primary)] text-[var(--text-primary)] flex w-full max-w-full overflow-hidden overflow-x-hidden rounded-none overscroll-none min-w-0 cursor-default"
      style={{ height: '100dvh', maxHeight: '100dvh' }}
    >
      {/* Левая панель - список чатов (единый блок с разными состояниями) */}
      <ChatSidebar
        selectedChat={selectedChat}
        isChatListCollapsed={isChatListCollapsed}
        setIsChatListCollapsed={setIsChatListCollapsed}
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
        ChatListSkeleton={ChatListSkeleton}
      />

      {/* Правая панель - чат */}
      {selectedChat ? (
        <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden bg-transparent">
          {/* Контейнер чата */}
          <div className="flex-1 min-h-0 min-w-0 flex flex-col relative bg-transparent">
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
            openLinkedTask={(taskId) => router.push(`/account?tab=tasks&task=${encodeURIComponent(taskId)}`)}
            togglePinChat={togglePinChat}
            deleteChat={deleteChat}
          />
          
          <MessagesArea
            messagesListRef={messagesListRef}
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
          />

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
          </div>

          {/* Chat Info Panel - Профиль собеседника */}
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
          />
        </div>
      ) : (
        <div className={`${isTouchPointer ? 'hidden' : 'flex'} flex-1 items-center justify-center text-[var(--text-muted)]`}>
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Выберите чат</p>
            <p className="text-xs mt-1">или создайте новый</p>
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
          setShowForwardModal(false);
          setForwardingMessage(null);
        }}
        onForward={forwardMessage}
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
          requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
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
          requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
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
            const userIdQuery = currentUser?.id ? `?userId=${encodeURIComponent(currentUser.id)}` : '';
            const res = await fetch(`/api/todos${userIdQuery}`);
            if (res.ok) {
              const data = await res.json();
              setTodoLists(Array.isArray(data.lists) ? data.lists : []);
            }
          } catch (error) {
            console.error('Error loading todo lists:', error);
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
        />
      )}
    </div>
  );
}
