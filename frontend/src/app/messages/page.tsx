'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import React from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send, ArrowLeft, Users, Search, Plus, MoreVertical, Check, Edit3, Trash2, Reply, Pin, PinOff, X, Paperclip, FileText, Link as LinkIcon, Calendar, CalendarPlus, Image, File, Info, Grid, List, Play, Music, Download, CheckSquare, Mail, Phone, Upload, Smile, Star, Bell, ChevronLeft, ChevronRight, ChevronDown, Building, Globe, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import Avatar from '@/components/Avatar';
import EmojiPicker from '@/components/EmojiPicker';
import ChatListSkeleton from '@/components/ChatListSkeleton';

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

interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  role: 'admin' | 'user';
  lastSeen?: string;
  isOnline?: boolean;
  shortId?: string;
  avatar?: string;
}

interface Message {
  id: string;
  chatId: string;
  authorId: string;
  authorName: string;
  content: string;
  mentions: string[];
  replyToId?: string;
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
  isDeleted?: boolean;
  attachments?: any[];
  isSystemMessage?: boolean;
  linkedChatId?: string;
  linkedMessageId?: string;
  linkedTaskId?: string;
  linkedPostId?: string;
  notificationType?: string;
  metadata?: {
    taskTitle?: string;
    postTitle?: string;
    fromUserName?: string;
  };
}

interface Chat {
  id: string;
  title?: string;
  isGroup: boolean;
  isNotificationsChat?: boolean;
  isSystemChat?: boolean;
  isFavoritesChat?: boolean;
  participantIds: string[];
  creatorId?: string;
  createdAt: string;
  readMessagesByUser?: Record<string, string>;
  pinnedByUser?: Record<string, boolean>;
  lastMessage?: Message;
  unreadCount?: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  dueDate?: string;
  assignedTo?: string | string[];
  authorId?: string;
  createdAt: string;
  assignedById?: string;
  assignedToId?: string;
  assignedToIds?: string[];
}

// Компонент предпросмотра ссылки
function LinkPreview({ url, isMyMessage }: { url: string; isMyMessage: boolean }) {
  const [preview, setPreview] = useState<{
    title: string;
    description: string;
    image: string;
    siteName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const data = await res.json();
          setPreview(data);
        }
      } catch (error) {
        console.error('Error fetching preview:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (loading) {
    return (
      <div className={`mt-2 mb-5 block p-3 rounded-lg border ${isMyMessage ? 'bg-blue-600/20 border-blue-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'} animate-pulse`}>
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-white/10 rounded w-1/2"></div>
      </div>
    );
  }

  if (!preview) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-2 mb-5 block p-3 rounded-lg border ${isMyMessage ? 'bg-blue-600/20 border-blue-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'} hover:opacity-80 transition-opacity`}
      >
        <div className="flex items-start gap-2">
          <LinkIcon className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-primary)] truncate">{url}</p>
        </div>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 mb-5 block rounded-lg border overflow-hidden ${isMyMessage ? 'bg-blue-600/20 border-blue-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'} hover:opacity-90 transition-opacity`}
    >
      {preview.image && (
        <div className="w-full h-32 bg-black/20 overflow-hidden">
          <img 
            src={preview.image} 
            alt={preview.title}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onError={(e) => {
              console.log('Image load error:', preview.image);
              const target = e.target as HTMLImageElement;
              target.parentElement!.style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start gap-2 mb-1">
          <LinkIcon className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2 mb-1">
              {preview.title}
            </p>
            {preview.description && (
              <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 mb-1">
                {preview.description}
              </p>
            )}
            <p className="text-[9px] text-purple-400/70 truncate">
              {preview.siteName}
            </p>
          </div>
        </div>
      </div>
    </a>
  );
}

// Мемоизированный компонент элемента чата - предотвращает перерендеринг при выборе другого чата
interface ChatItemProps {
  chat: Chat;
  isSelected: boolean;
  isHovered?: boolean;
  onSelect: (chat: Chat) => void;
  onHover?: (chatId: string | null) => void;
  onContextMenu: (e: React.MouseEvent, chat: Chat) => void;
  getChatTitle: (chat: Chat) => string;
  getChatAvatarData: (chat: Chat) => { type: "user" | "group" | "favorites" | "notifications"; name: string; avatar?: string };
  currentUser: User | null;
  users: User[];
  chatDrafts: Record<string, string>;
  variant: 'collapsed-icon' | 'mobile' | 'desktop';
  isPinned?: boolean;
}

const ChatItem = React.memo<ChatItemProps>(({
  chat,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onContextMenu,
  getChatTitle,
  getChatAvatarData,
  currentUser,
  users,
  chatDrafts,
  variant,
  isPinned
}) => {
  const avatarData = getChatAvatarData(chat);
  const otherParticipantId = !chat.isGroup ? chat.participantIds?.find(id => id !== currentUser?.id) : undefined;
  const otherUser = otherParticipantId ? users.find(u => u.id === otherParticipantId) : undefined;
  const hasUnread = !chat.isFavoritesChat && (chat.unreadCount || 0) > 0;

  // Collapsed icon view (только desktop)
  if (variant === 'collapsed-icon') {
    return (
      <div
        key={chat.id}
        className="relative"
        onMouseEnter={() => onHover?.(chat.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        <button
          onClick={() => onSelect(chat)}
          className={`w-full flex justify-center py-1 relative ${isSelected ? 'bg-[var(--bg-tertiary)]' : 'hover:bg-[var(--bg-tertiary)]/50'}`}
        >
          <div className="relative">
            <Avatar
              src={avatarData.avatar || ''}
              name={avatarData.name}
              type={avatarData.type}
              size="lg"
              isOnline={otherUser?.isOnline}
            />
            {hasUnread && (
              <div className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-[#007aff]/80 to-[#007aff]/60 backdrop-blur-sm border-2 border-[var(--bg-secondary)] text-white text-[10px] font-bold flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,122,255,0.3)]">
                {chat.unreadCount! > 9 ? '9+' : chat.unreadCount}
              </div>
            )}
            {isSelected && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-1 h-8 bg-cyan-500 rounded-r-full" />
            )}
          </div>
        </button>
        {isHovered && (
          <div 
            className="absolute left-[72px] top-0 z-50 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px]"
            style={{ pointerEvents: 'none' }}
          >
            <div className="flex items-center gap-2 mb-2">
              {chat.pinnedByUser?.[currentUser?.id || ''] && <Pin className="w-3 h-3 text-cyan-400 flex-shrink-0" />}
              {chat.isGroup && <Users className="w-3 h-3 text-purple-400 flex-shrink-0" />}
              <span className="font-medium text-sm text-[var(--text-primary)] truncate select-none">{getChatTitle(chat)}</span>
            </div>
            {chat.lastMessage && (
              <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-1">
                <span className="text-[var(--text-secondary)]">{chat.lastMessage.authorName}:</span> {chat.lastMessage.content}
              </p>
            )}
            {hasUnread && (
              <div className="flex items-center gap-1.5 mt-2">
                <div className="min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-br from-[#007aff]/80 to-[#007aff]/60 backdrop-blur-sm border border-white/20 text-white text-[9px] font-bold flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,122,255,0.3)]">
                  {chat.unreadCount! > 9 ? '9+' : chat.unreadCount}
                </div>
                <span className="text-[10px] text-cyan-400">непрочитанных</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Mobile view (простой список)
  if (variant === 'mobile') {
    return (
      <div
        key={chat.id}
        className={`relative group ${isSelected ? 'bg-[var(--bg-tertiary)]' : ''}`}
        onContextMenu={(e) => onContextMenu(e, chat)}
      >
        <button
          onClick={() => onSelect(chat)}
          className="w-full px-3 py-1 hover:bg-[var(--bg-tertiary)] transition-all text-left"
        >
          <div className="flex gap-2 items-center">
            <Avatar
              src={avatarData.avatar || ''}
              name={avatarData.name}
              type={avatarData.type}
              size="md"
              isOnline={otherUser?.isOnline}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                {isPinned && !chat.isFavoritesChat && !chat.isSystemChat && !chat.isNotificationsChat && (
                  <Pin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                )}
                {chat.isGroup && (
                  <Users className="w-3 h-3 text-purple-400 flex-shrink-0" />
                )}
                <h3 className="font-medium text-sm truncate select-none">{getChatTitle(chat)}</h3>
              </div>
              {chatDrafts[chat.id] ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-red-400 truncate flex-1">
                    <span className="font-medium">Черновик:</span> {chatDrafts[chat.id]}
                  </p>
                </div>
              ) : chat.lastMessage ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-[var(--text-secondary)] truncate flex-1">
                    {chat.lastMessage.authorName}: {chat.lastMessage.content}
                  </p>
                  {hasUnread && (
                    <div className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-[#007aff]/80 to-[#007aff]/60 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,122,255,0.3)]">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            {chat.lastMessage && (
              <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap self-center">
                {new Date(chat.lastMessage.createdAt).toLocaleTimeString('ru-RU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            )}
          </div>
        </button>
      </div>
    );
  }

  // Desktop view (с градиентами)
  return (
    <div
      key={chat.id}
      className={`relative group mx-2 rounded-[50px] overflow-hidden backdrop-blur-xl transition-all duration-300 ${
        isSelected 
          ? 'bg-gradient-to-br from-[#007aff]/30 to-[#007aff]/10 border border-[#007aff]/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_3px_8px_rgba(59,130,246,0.2)]' 
          : 'bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/8 border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_2px_8px_rgba(0,0,0,0.2)]'
      }`}
      onContextMenu={(e) => onContextMenu(e, chat)}
    >
      <button
        onClick={() => onSelect(chat)}
        className="w-full px-2 transition-all text-left"
      >
        <div className="flex gap-2 items-center">
          <Avatar
            src={avatarData.avatar || ''}
            name={avatarData.name}
            type={avatarData.type}
            size="md"
            isOnline={otherUser?.isOnline}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isPinned && !chat.isFavoritesChat && !chat.isSystemChat && !chat.isNotificationsChat && (
                <Pin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
              )}
              {chat.isGroup && (
                <Users className="w-3 h-3 text-purple-400 flex-shrink-0" />
              )}
              <h3 className="font-medium text-sm truncate">{getChatTitle(chat)}</h3>
            </div>
            {chatDrafts[chat.id] ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-red-400 truncate flex-1">
                  <span className="font-medium">Черновик:</span> {chatDrafts[chat.id]}
                </p>
              </div>
            ) : chat.lastMessage ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-[var(--text-secondary)] truncate flex-1">
                  {chat.lastMessage.authorName}: {chat.lastMessage.content}
                </p>
                {hasUnread && (
                  <div className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-[#007aff]/80 to-[#007aff]/60 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_4px_rgba(0,122,255,0.3)]">
                    {chat.unreadCount}
                  </div>
                )}
              </div>
            ) : null}
          </div>
          {chat.lastMessage && (
            <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap self-center">
              {new Date(chat.lastMessage.createdAt).toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  // Оптимизация: перерендериваем только если изменились важные пропсы
  return (
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.unreadCount === nextProps.chat.unreadCount &&
    prevProps.chat.lastMessage?.id === nextProps.chat.lastMessage?.id &&
    prevProps.chat.lastMessage?.content === nextProps.chat.lastMessage?.content &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.chatDrafts[prevProps.chat.id] === nextProps.chatDrafts[nextProps.chat.id] &&
    prevProps.variant === nextProps.variant &&
    prevProps.isPinned === nextProps.isPinned
  );
});

ChatItem.displayName = 'ChatItem';

export default function MessagesPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // Форматирование даты для разделителей
  const formatMessageDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDate = new Date(date);
    messageDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    
    if (messageDate.getTime() === today.getTime()) {
      return 'Сегодня';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Вчера';
    } else {
      const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
      const day = messageDate.getDate();
      const month = months[messageDate.getMonth()];
      const year = messageDate.getFullYear();
      const currentYear = new Date().getFullYear();
      
      if (year === currentYear) {
        return `${day} ${month}`;
      } else {
        return `${day} ${month} ${year}`;
      }
    }
  };

  // Проверка, нужен ли разделитель даты
  const shouldShowDateSeparator = (currentMessage: Message, previousMessage: Message | undefined): boolean => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.createdAt);
    const previousDate = new Date(previousMessage.createdAt);
    
    currentDate.setHours(0, 0, 0, 0);
    previousDate.setHours(0, 0, 0, 0);
    
    return currentDate.getTime() !== previousDate.getTime();
  };
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
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isDesktopView, setIsDesktopView] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
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
  const [textareaHeight, setTextareaHeight] = useState(44); // Высота textarea для динамического отступа
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
  const [showEventCalendarSelector, setShowEventCalendarSelector] = useState(false);
  const [calendarLists, setCalendarLists] = useState<any[]>([]);
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesListRef = useRef<HTMLDivElement>(null); // Ref для списка сообщений (скролл-контейнер)
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const isUserActiveRef = useRef(false); // Флаг активности пользователя
  const lastActivityTimeRef = useRef(Date.now());
  const mentionDebounceRef = useRef<NodeJS.Timeout | null>(null); // Debounce для обработки упоминаний
  const messageDebounceRef = useRef<NodeJS.Timeout | null>(null); // Debounce для newMessage
  const resizeDebounceRef = useRef<NodeJS.Timeout | null>(null); // Debounce для auto-resize
  const selectionDebounceRef = useRef<NodeJS.Timeout | null>(null); // Debounce для handleTextSelection

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

  // Функция выбора чата с обновлением URL и localStorage
  const selectChat = useCallback((chat: Chat | null) => {
    const currentMessage = messageInputRef.current?.value || '';
    // Сохраняем черновик текущего чата
    if (selectedChat && currentMessage.trim()) {
      setChatDrafts(prev => ({
        ...prev,
        [selectedChat.id]: currentMessage
      }));
    } else if (selectedChat && !currentMessage.trim()) {
      // Удаляем черновик если пустой
      setChatDrafts(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[selectedChat.id];
        return newDrafts;
      });
    }
    
    setSelectedChat(chat);
    setShowChatInfo(false); // Закрываем панель информации при смене чата
    setIsSelectionMode(false); // Выходим из режима выделения
    setSelectedMessages(new Set()); // Очищаем выделение
    
    // Восстанавливаем черновик нового чата
    if (chat && chatDrafts[chat.id]) {
      setNewMessage(chatDrafts[chat.id]);
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.value = chatDrafts[chat.id];
          messageInputRef.current.style.height = 'auto';
          const newHeight = Math.min(messageInputRef.current.scrollHeight, 120);
          messageInputRef.current.style.height = newHeight + 'px';
          setTextareaHeight(newHeight);
        }
      }, 0);
    } else {
      setNewMessage('');
      if (messageInputRef.current) {
        messageInputRef.current.value = '';
        messageInputRef.current.style.height = '44px';
      }
      setTextareaHeight(44);
    }
    
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (chat) {
        url.searchParams.set('chat', chat.id);
        // Сохраняем в localStorage для восстановления при возврате
        localStorage.setItem('selectedChatId', chat.id);
      } else {
        url.searchParams.delete('chat');
        localStorage.removeItem('selectedChatId');
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, [selectedChat, chatDrafts, messageInputRef]);

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
    loadCurrentUser();
    loadUsers();
  }, []);

  // Периодическое обновление статуса пользователя и загрузка статусов других пользователей
  useEffect(() => {
    if (!currentUser) return;
    
    // ОТКЛЮЧЕНО для удаленной PostgreSQL - слишком медленно
    // updateUserStatus();
    
    // Обновляем статус каждые 5 минут (вместо 30 секунд)
    const statusInterval = setInterval(() => {
      // Не запрашиваем данные если вкладка не активна
      if (typeof document !== 'undefined' && document.hidden) return;
      // ОТКЛЮЧЕНО
      // updateUserStatus();
    }, 300000);
    
    // Загружаем статусы других пользователей каждые 2 минуты (вместо 10 секунд)
    const usersStatusInterval = setInterval(() => {
      // Не запрашиваем данные если вкладка не активна
      if (typeof document !== 'undefined' && document.hidden) return;
      // ОТКЛЮЧЕНО
      // loadUserStatuses();
    }, 120000);
    
    // Обновляем статус при выходе со страницы (ОТКЛЮЧЕНО для удаленной БД)
    const handleBeforeUnload = async () => {
      // ОТКЛЮЧЕНО - слишком медленно для удаленной PostgreSQL
      /*
      await fetch(`/api/users/${currentUser.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isOnline: false,
          lastSeen: new Date().toISOString()
        }),
        keepalive: true
      });
      */
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(usersStatusInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadChats();
    }
  }, [currentUser]);

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
      const params = new URLSearchParams(window.location.search);
      let chatId = params.get('chat');
      
      // Если нет в URL, пробуем из localStorage
      if (!chatId) {
        chatId = localStorage.getItem('selectedChatId');
      }
      
      if (chatId) {
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
          setSelectedChat(chat); // Используем setSelectedChat напрямую чтобы избежать обновления URL
        }
      }
    }
  }, [chats]);
  
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
              localStorage.setItem('myAccount', JSON.stringify({ id: newUser.id, name: newUser.name, avatar: newUser.avatar }));
              setCurrentUser(newUser);
              return;
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
      const res = await fetch(`/api/users/${myAccount.id}`);
      if (res.ok) {
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
  
  const updateUserStatus = async () => {
    if (!currentUser) return;
    try {
      await fetch(`/api/users/${currentUser.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          isOnline: true,
          lastSeen: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };
  
  const loadUserStatuses = async () => {
    try {
      const res = await fetch('/api/users/statuses');
      if (res.ok) {
        const statuses = await res.json();
        setUsers(prevUsers => 
          prevUsers.map(user => {
            const status = statuses.find((s: any) => s.id === user.id);
            return status ? { ...user, isOnline: status.isOnline, lastSeen: status.lastSeen } : user;
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
          setFormatMenuPosition({
            top: rect.top - 50,
            left: rect.left + (rect.width / 2)
          });
          setShowTextFormatMenu(true);
        });
      } else {
        setShowTextFormatMenu(false);
      }
    }, 200); // Увеличен debounce до 200ms для лучшего INP
  }, []);

  const formatMessageText = (text: string): string => {
    let formatted = text;
    
    // Жирный текст: **text**
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Курсив: *text*
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Подчеркнутый: __text__
    formatted = formatted.replace(/__(.+?)__/g, '<u>$1</u>');
    
    // Ссылки: [text](url)
    formatted = formatted.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>');
    
    return formatted;
  };

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
    if (!currentUser) return;
    
    setIsLoadingChats(true); // 🚀 PERFORMANCE: Start loading
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
          if (isSystemChat) {
            return {
              ...chat,
              pinnedByUser: { 
                ...(chat.pinnedByUser || {}),
                [currentUser.id]: getSystemChatPinState(chat.id) 
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
        
        // Оптимизация: сравниваем данные перед обновлением state
        // Сохраняем локальные изменения pinnedByUser при обновлении
        setChats(prevChats => {
          // Если данные не изменились, не обновляем state
          if (prevChats.length > 0 && JSON.stringify(prevChats) === JSON.stringify(data)) {
            return prevChats;
          }
          
          // Сохраняем локальное состояние закрепления при обновлении
          if (prevChats.length > 0) {
            return data.map((newChat: any) => {
              const oldChat = prevChats.find(c => c.id === newChat.id);
              if (oldChat?.pinnedByUser) {
                // Сохраняем локальное состояние закрепления
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
        
        // Отладочный лог для групповых чатов
        const groupChats = data.filter((c: any) => c.isGroup);
        if (groupChats.length > 0) {
          console.log('DEBUG - Загруженные групповые чаты:', groupChats.map((c: any) => ({
            id: c.id,
            title: c.title,
            creatorId: c.creatorId,
            participantIds: c.participantIds
          })));
        }
        
        // Обновляем selectedChat с новыми данными (например, readMessagesByUser)
        // Но НЕ вызываем setSelectedChat чтобы не триггерить useEffect
        if (selectedChat) {
          const updatedChat = data.find((c: any) => c.id === selectedChat.id);
          if (updatedChat && JSON.stringify(updatedChat.readMessagesByUser) !== JSON.stringify(selectedChat.readMessagesByUser)) {
            // Только обновляем если изменились данные о прочтении
            setSelectedChat(prev => prev ? { ...prev, readMessagesByUser: updatedChat.readMessagesByUser } : prev);
          }
        }
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoadingChats(false); // 🚀 PERFORMANCE: End loading
    }
  }, [currentUser, selectedChat]);

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
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`);
      if (res.ok) {
        const data = await res.json();
        
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
        
        // Оптимизация: не обновляем messages если данные не изменились
        setMessages(data);
        
        // Скролл к последнему сообщению:
        // - При первой загрузке всегда
        // - При polling только если пользователь был внизу И пришли новые сообщения
        // НО НЕ скроллим если клавиатура открыта (фокус на инпуте) - это вызывает баги
        const isKeyboardOpen = messageInputRef.current === document.activeElement;
        if (!isPolling || (wasAtBottom && hasNewMessages && !isKeyboardOpen)) {
          setTimeout(() => {
            if (messagesListRef.current) {
              messagesListRef.current.scrollTo({
                top: messagesListRef.current.scrollHeight,
                behavior: isPolling ? 'smooth' : 'auto'
              });
            }
          }, 100);
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
              setSelectedChat(prev => prev ? { ...prev, readMessagesByUser: updatedChat.readMessagesByUser } : null);
              // Обновляем список чатов для badge - сохраняем локальные pinnedByUser
              setChats(prevChats => {
                return allChats.map((newChat: Chat) => {
                  const oldChat = prevChats.find(c => c.id === newChat.id);
                  if (oldChat?.pinnedByUser) {
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
  }, [messagesListRef, messages, messageInputRef, currentUser, loadChats]);

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
        setMessages(prev => [...prev, newMsg]);
        if (messageInputRef.current) {
          messageInputRef.current.value = '';
          messageInputRef.current.style.height = '44px';
        }
        setTextareaHeight(44);
        setReplyToMessage(null);
        setAttachments([]);
        
        // Обновляем lastSeen пользователя при отправке сообщения
        try {
          await fetch(`/api/users/${currentUser.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lastSeen: new Date().toISOString() })
          });
        } catch (e) {
          // Игнорируем ошибки обновления статуса
        }
        
        // Удаляем черновик после отправки
        if (selectedChat) {
          setChatDrafts(prev => {
            const newDrafts = { ...prev };
            delete newDrafts[selectedChat.id];
            return newDrafts;
          });
        }
        
        loadChats();
        
        // Фокус уже сохранён благодаря preventDefault на кнопке
        // Скролл к последнему сообщению
        setTimeout(() => {
          if (messagesListRef.current) {
            messagesListRef.current.scrollTo({
              top: messagesListRef.current.scrollHeight,
              behavior: 'auto'
            });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [messageInputRef, selectedChat, currentUser, attachments, replyToMessage, messagesListRef, loadChats]);

  const updateMessage = useCallback(async (messageId: string, content: string) => {
    if (!selectedChat) return;

    // Если текст не изменился - просто закрываем редактирование без обновления
    if (content.trim() === editingMessageText.trim()) {
      setEditingMessageId(null);
      setEditingMessageText('');
      return;
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
        loadMessages(selectedChat.id, true); // Не скроллим при редактировании
      }
    } catch (error) {
      console.error('Error updating message:', error);
    }
  }, [selectedChat, editingMessageText, loadMessages]);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    const value = target.value;
    lastActivityTimeRef.current = Date.now();
    
    // Debounce для setNewMessage - увеличен до 300ms для лучшего INP
    if (messageDebounceRef.current) {
      clearTimeout(messageDebounceRef.current);
    }
    messageDebounceRef.current = setTimeout(() => {
      setNewMessage(value);
      
      // Обработка упоминаний только после обновления state
      if (selectedChat?.isGroup) {
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
      }
    }, 300);
    
    // Auto-resize с debounce для минимальной блокировки
    if (resizeDebounceRef.current) {
      clearTimeout(resizeDebounceRef.current);
    }
    
    // Функция для скролла к последнему сообщению
    const scrollToBottomOnResize = () => {
      if (messagesListRef.current) {
        const container = messagesListRef.current;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom) {
          setTimeout(() => {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            });
          }, 50);
        }
      }
    };
    
    // Немедленный resize для первого символа
    if (value.length <= 1 || value.length % 10 === 0) {
      target.style.height = 'auto';
      const lineHeight = 20;
      const maxHeight = lineHeight * 6;
      const newHeight = Math.min(target.scrollHeight, maxHeight);
      target.style.height = newHeight + 'px';
      setTextareaHeight(newHeight);
      scrollToBottomOnResize();
    } else {
      // Debounced resize для остальных случаев
      resizeDebounceRef.current = setTimeout(() => {
        target.style.height = 'auto';
        const lineHeight = 20;
        const maxHeight = lineHeight * 6;
        const newHeight = Math.min(target.scrollHeight, maxHeight);
        target.style.height = newHeight + 'px';
        setTextareaHeight(newHeight);
        scrollToBottomOnResize();
      }, 50);
    }
  }, [messageDebounceRef, resizeDebounceRef, lastActivityTimeRef, messagesListRef, selectedChat]);

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
          // Обновляем высоту
          target.style.height = 'auto';
          const lineHeight = 20;
          const maxHeight = lineHeight * 6;
          const newHeight = Math.min(target.scrollHeight, maxHeight);
          target.style.height = newHeight + 'px';
          setTextareaHeight(newHeight);
        });
      } else {
        // Enter - отправка или сохранение
        e.preventDefault();
        if (editingMessageId) {
          const messageText = messageInputRef.current?.value || '';
          updateMessage(editingMessageId, messageText);
          if (messageInputRef.current) {
            messageInputRef.current.value = savedMessageText;
          }
          setSavedMessageText('');
        } else {
          sendMessage();
        }
      }
    } else if (e.key === 'Escape' && editingMessageId) {
      // Escape - отмена редактирования
      setEditingMessageId(null);
      if (messageInputRef.current) {
        messageInputRef.current.value = savedMessageText;
      }
      setSavedMessageText('');
    }
  }, [editingMessageId, savedMessageText, messageInputRef, updateMessage, sendMessage]);

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

    const chat = chats.find(c => c.id === chatId);
    const isPinned = chat?.pinnedByUser?.[currentUser.id] || false;
    const newPinState = !isPinned;

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
        // Rollback при ошибке
        setChats(prevChats => 
          prevChats.map(c => 
            c.id === chatId 
              ? { ...c, pinnedByUser: { ...c.pinnedByUser, [currentUser.id]: !newPinState } }
              : c
          )
        );
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      // Rollback при ошибке
      setChats(prevChats => 
        prevChats.map(c => 
          c.id === chatId 
            ? { ...c, pinnedByUser: { ...c.pinnedByUser, [currentUser.id]: isPinned } }
            : c
        )
      );
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
        setSelectedChat(prev => prev ? {
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
        const sourceChatId = message.chatId;
        const res = await fetch(
          `/api/chats/${sourceChatId}/messages/${message.id}/forward`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetChatIds: selectedChatsForForward })
          }
        );
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.detail || 'Ошибка при пересылке');
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
      alert('Ошибка при пересылке сообщения: ' + error);
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
        setSelectedChat(prev => prev ? {
          ...prev,
          participantIds: prev.participantIds.filter(id => id !== userId)
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
        setSelectedChat(prev => prev ? {
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

  const getChatTitle = useCallback((chat: Chat): string => {
    if (chat.isFavoritesChat) return 'Избранное';
    if (chat.title) return chat.title;
    
    if (!currentUser) return 'Чат';
    
    const otherParticipants = users.filter(u => 
      chat.participantIds?.includes(u.id) && u.id !== currentUser.id
    );
    
    if (otherParticipants.length === 0) return 'Избранное';
    return otherParticipants.map(u => u.name || u.username || 'Пользователь').join(', ');
  }, [currentUser, users]);

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

  // Получить данные для аватарки чата
  const getChatAvatarData = useCallback((chat: Chat): { type: 'favorites' | 'notifications' | 'group' | 'user'; name: string; avatar?: string } => {
    if (chat.isFavoritesChat) return { type: 'favorites', name: 'Избранное' };
    if (chat.isSystemChat || chat.isNotificationsChat) return { type: 'notifications', name: 'Уведомления' };
    if (chat.isGroup) return { type: 'group', name: chat.title || 'Группа' };
    
    // Проверка на системные чаты по названию (для обратной совместимости)
    if (chat.title === 'Уведомления') return { type: 'notifications', name: 'Уведомления' };
    if (chat.title === 'Избранное') return { type: 'favorites', name: 'Избранное' };
    
    if (!currentUser) return { type: 'user', name: 'Чат' };
    
    const otherParticipants = users.filter(u => 
      chat.participantIds?.includes(u.id) && u.id !== currentUser.id
    );
    
    // Если нет других участников, проверяем тип чата
    if (otherParticipants.length === 0) {
      if (chat.isFavoritesChat) return { type: 'favorites', name: 'Избранное' };
      if (chat.isSystemChat || chat.isNotificationsChat) return { type: 'notifications', name: 'Уведомления' };
      return { type: 'user', name: 'Чат' };
    }
    
    const participant = otherParticipants[0];
    return { 
      type: 'user', 
      name: participant.name || participant.username || 'Пользователь',
      avatar: participant.avatar
    };
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
    const allPinnedChats = chats.filter(chat => chat.pinnedByUser?.[userId] === true);
    const allUnpinnedChats = chats.filter(chat => !chat.pinnedByUser?.[userId]);
    
    return {
      pinnedChats: filterChatsBySearch(allPinnedChats),
      unpinnedChats: filterChatsBySearch(allUnpinnedChats)
    };
  }, [chats, currentUser?.id, filterChatsBySearch]);

  const messagesContainerRef = useRef<HTMLDivElement>(null); // Ref для основного контейнера страницы

  // --- FIX MOBILE KEYBOARD ---
  // Используем direct DOM manipulation чтобы избежать ре-рендеров при ресайзе (клавиатура)
  // Это предотвращает закрытие клавиатуры
  useEffect(() => {
    let prevHeight = window.innerHeight;
    
    // Функция обновления высоты
    const updateHeight = () => {
      if (!messagesContainerRef.current) return;
      
      let vh = window.innerHeight;
      // На мобильных window.visualViewport.height показывает реальную видимую область (без клавиатуры)
      if (window.visualViewport) {
        vh = window.visualViewport.height;
      }
      
      messagesContainerRef.current.style.height = `${vh}px`;
      
      // Также подстраиваем body, чтобы не было скролла за пределы
      document.body.style.height = `${vh}px`;
      
      // Обновляем isDesktopView при изменении размера
      setIsDesktopView(window.innerWidth >= 768);
      
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
    updateHeight();

    // Слушатели
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight);
      window.visualViewport.addEventListener('scroll', updateHeight);
    }
    window.addEventListener('resize', updateHeight);

    return () => {
      // Очистка
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.width = originalBodyWidth;
      document.body.style.height = originalBodyHeight;
      document.body.style.top = originalBodyTop;
      document.body.style.background = originalBodyBackground;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.background = originalHtmlBackground;

      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateHeight);
        window.visualViewport.removeEventListener('scroll', updateHeight);
      }
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  return (
    <div 
      ref={messagesContainerRef}
      className="bg-[var(--bg-primary)] text-[var(--text-primary)] flex overflow-hidden rounded-none overscroll-none"
      style={{ height: '100dvh', maxHeight: '100dvh' }}
    >
      {/* Левая панель - список чатов (единый блок с разными состояниями) */}
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

      {/* Правая панель - чат */}
      {selectedChat ? (
        <div className={`flex-1 min-h-0 flex overflow-hidden bg-transparent ${selectedChat ? 'block' : 'hidden md:block'}`}>
          {/* Контейнер чата */}
          <div className="flex-1 min-h-0 flex flex-col relative bg-transparent">
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
              className="no-mobile-scale flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-glass)] text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-all md:hidden border border-[var(--border-glass)] backdrop-blur-sm -ml-1"
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
                return (
                  <Avatar
                    src={avatarData.avatar}
                    name={avatarData.name}
                    type={avatarData.type}
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
                    const otherParticipantId = selectedChat.participantIds?.find(id => id !== currentUser?.id);
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
          
          {/* Message Search Bar */}
          {showMessageSearch && (
            <div className="absolute top-[72px] md:top-16 left-2 right-2 z-20 px-2 md:px-4 lg:px-8 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
                <input
                  type="text"
                  placeholder="Поиск по чату..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-10 py-2.5 bg-gradient-to-br from-white/15 to-white/5 border border-white/20 rounded-[50px] text-sm focus:outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-white/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl"
                />
                <button
                  onClick={() => { setShowMessageSearch(false); setMessageSearchQuery(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={messagesListRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pt-20 md:pt-16 pb-0 md:pb-64 bg-transparent scrollbar-hide-mobile">
            <div className="px-2 md:px-4 lg:px-8 h-full">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] select-none">
                  <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-base font-medium">Нет сообщений</p>
                  <p className="text-sm mt-1 opacity-70">Начните общение</p>
                </div>
              ) : (
                <div className="space-y-1.5 md:space-y-[3px]">
                {messages.filter(message => {
                  if (!message) return false; // Пропускаем null/undefined сообщения
                  if (!messageSearchQuery.trim()) return true;
                  return message.content.toLowerCase().includes(messageSearchQuery.toLowerCase());
                }).map((message, index, filteredMessages) => {
                  // Защита от null authorId (для системных сообщений)
                  const authorId = message?.authorId || 'system';
                  const isMyMessage = authorId === currentUser?.id;
                  const isEditing = editingMessageId === message.id;
                  const replyTo = message.replyToId 
                    ? messages.find(m => m.id === message.replyToId)
                    : null;
                  
                  // Получаем автора сообщения для аватара
                  const messageAuthor = users.find(u => u.id === authorId);
                  
                  // Проверяем является ли это последнее сообщение в группе от одного автора
                  const nextMessage = filteredMessages[index + 1];
                  const nextAuthorId = nextMessage?.authorId || 'system';
                  const isLastInGroup = !nextMessage || nextAuthorId !== authorId;
                  
                  // Проверяем нужен ли разделитель даты
                  const previousMessage = index > 0 ? filteredMessages[index - 1] : undefined;
                  const showDateSeparator = shouldShowDateSeparator(message, previousMessage);

                    return (
                    <React.Fragment key={message.id}>
                      {/* Разделитель даты */}
                      {showDateSeparator && (
                        <div className="flex justify-center my-6 select-none">
                          <div className="px-2 py-0.5 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl border border-white/20 rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] flex items-center justify-center">
                            <span className="text-[10px] font-medium text-[var(--text-muted)] leading-none">
                              {formatMessageDate(new Date(message.createdAt))}
                            </span>
                          </div>
                        </div>
                      )}
                    <div
                      key={message.id}
                      ref={(el) => { messageRefs.current[message.id] = el; }}
                      className={`flex ${isMyMessage ? 'justify-end md:justify-start' : 'justify-start'} group transition-all duration-200 -mx-[20px] md:px-2 md:-mx-2 ${
                        selectedMessages.has(message.id) ? 'bg-[var(--accent-primary)]/20' : ''
                      } ${isMyMessage ? 'message-animation-right md:message-animation-left' : 'message-animation-left'}`}
                      onClick={(e) => {
                        if (isSelectionMode && !message.isDeleted) {
                          e.stopPropagation();
                          e.preventDefault();
                          setSelectedMessages(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(message.id)) {
                              newSet.delete(message.id);
                              if (newSet.size === 0) setIsSelectionMode(false);
                            } else {
                              newSet.add(message.id);
                            }
                            return newSet;
                          });
                        }
                      }}
                    onDoubleClick={(e) => {
                      if (!message.isDeleted && !message.isSystemMessage) {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsSelectionMode(true);
                        setSelectedMessages(new Set([message.id]));
                      }
                    }}
                    onContextMenu={(e) => {
                      if (!message.isDeleted && !message.isSystemMessage) {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenuMessage(message);
                        setContextMenuPosition({ top: e.clientY, left: e.clientX });
                        setShowMessageContextMenu(true);
                      }
                    }}
                  >
                    {/* Checkbox для выделения */}
                    {(isSelectionMode || selectedMessages.has(message.id)) && !message.isDeleted && (
                      <div className="absolute -right-8 top-1/2 -translate-y-1/2 z-10">
                        <div 
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
                            selectedMessages.has(message.id) 
                              ? 'bg-cyan-500 border-cyan-500' 
                              : 'border-[var(--text-muted)] hover:border-cyan-400'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMessages(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(message.id)) {
                                newSet.delete(message.id);
                                if (newSet.size === 0) setIsSelectionMode(false);
                              } else {
                                newSet.add(message.id);
                              }
                              return newSet;
                            });
                          }}
                        >
                          {selectedMessages.has(message.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                    </div>
                    )}
                    {/* Avatar - только на десктопе */}
                    <div className="hidden md:flex flex-shrink-0 mr-2 self-start">
                      <Avatar
                        src={messageAuthor?.avatar}
                        name={message.authorName || 'User'}
                        size="sm"
                        type={message.isSystemMessage ? 'notifications' : 'user'}
                      />
                    </div>

                    {/* Attachments вынесены на уровень аватарки - только когда нет текста */}
                    {message.attachments && message.attachments.length > 0 && message.attachments.filter(att => att.type !== 'image').length > 0 && !message.content.trim() && (
                      <div className={`flex flex-col gap-2 ${isMyMessage ? '-mr-[75px] md:mr-2' : 'mr-2'} max-w-[80%] md:max-w-[400px]`}>
                        {message.attachments.filter(att => att.type !== 'image').map((att, idx) => (
                          <div key={idx}>
                            {att.type === 'task' && (
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  const taskId = att.taskId || att.id;
                                  if (taskId) {
                                    requestAnimationFrame(() => {
                                      router.push(`/todos?task=${taskId}`);
                                    });
                                  }
                                }}
                                className="flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 bg-cyan-500/10 dark:bg-cyan-500/10 rounded-lg md:rounded-xl border border-cyan-500/50 dark:border-cyan-500/30 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/20 transition-colors w-full relative"
                              >
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-cyan-500/20 dark:bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-3 h-3 md:w-4 md:h-4 text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <div className="flex flex-col items-start min-w-0 flex-1">
                                  <span className="text-[9px] md:text-[10px] text-cyan-600 dark:text-cyan-400/70 uppercase">Задача</span>
                                  <span className="text-xs md:text-sm font-medium text-cyan-700 dark:text-cyan-300 truncate max-w-[120px] md:max-w-[200px]">{att.name}</span>
                                </div>
                                <span className="text-[9px] md:text-[10px] text-[var(--text-muted)] flex-shrink-0 self-end ml-2">
                                  {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                  {isMyMessage && <Check className="w-2.5 h-2.5 md:w-3 md:h-3 inline ml-0.5" />}
                                </span>
                              </button>
                            )}
                            {att.type === 'event' && (
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (att.id) {
                                    requestAnimationFrame(() => {
                                      router.push(`/account?tab=calendar&event=${att.id}`);
                                    });
                                  }
                                }}
                                className="flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 bg-green-500/10 dark:bg-green-500/10 rounded-lg md:rounded-xl border border-green-500/50 dark:border-green-500/30 hover:bg-green-500/20 dark:hover:bg-green-500/20 transition-colors w-full"
                              >
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-green-500/20 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                  <Calendar className="w-3 h-3 md:w-4 md:h-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex flex-col items-start min-w-0">
                                  <span className="text-[9px] md:text-[10px] text-green-600 dark:text-green-400/70 uppercase">Событие</span>
                                  <span className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 truncate max-w-[120px] md:max-w-[200px]">{att.name}</span>
                                </div>
                              </button>
                            )}
                            {att.type === 'link' && (
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (att.url) {
                                    requestAnimationFrame(() => {
                                      window.open(att.url, '_blank');
                                    });
                                  }
                                }}
                                className="flex flex-col items-start gap-1 px-3 py-2 bg-purple-500/10 dark:bg-purple-500/10 rounded-xl border-2 border-purple-500/50 dark:border-purple-500/30 hover:bg-purple-500/20 dark:hover:bg-purple-500/20 transition-colors w-full"
                              >
                                <span className="text-[10px] text-purple-600 dark:text-purple-400/70">Ссылка</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                    <LinkIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300 truncate max-w-[160px] md:max-w-[240px]">{att.name}</span>
                                </div>
                              </button>
                            )}
                            {att.type === 'file' && (
                              <div className="inline-flex flex-col items-start gap-1 px-2 py-1.5 bg-orange-500/10 dark:bg-orange-500/10 rounded-xl border-2 border-orange-500/50 dark:border-orange-500/30 max-w-[200px] md:max-w-[280px]">
                                <span className="text-[9px] text-orange-600 dark:text-orange-400/70">Файл</span>
                                <div className="flex items-center gap-1.5 w-full min-w-0">
                                  <div className="w-6 h-6 rounded-lg bg-orange-500/20 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                    <File className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                  </div>
                                  <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1 min-w-0">{att.name}</span>
                                  <button className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300 flex-shrink-0">
                                    Скачать
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div 
                      className={`max-w-[80%] md:max-w-[75%] lg:max-w-[65%] relative flex flex-col overflow-hidden ${message.linkedChatId && !isSelectionMode ? 'cursor-pointer' : ''}`}
                      onClick={(e) => {
                        if (!isSelectionMode) {
                          // Клик на системное сообщение с ссылкой на чат - переход к чату
                          if (message.linkedChatId) {
                            const linkedChat = chats.find(c => c.id === message.linkedChatId);
                            if (linkedChat) {
                              selectChat(linkedChat);
                            }
                          }
                        }
                      }}
                    >
                      {/* Reply indicator - кликабельный */}
                      {replyTo && (
                        <div className="mb-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToMessage(replyTo.id);
                            }}
                            className="text-[10px] text-[var(--text-muted)] px-3 hover:text-blue-400 transition-colors inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                            style={{ maxWidth: isMyMessage ? '200px' : '280px' }}
                          >
                            <Reply className="w-3 h-3 inline mr-1" />
                            Ответ на: {replyTo.content.substring(0, 50)}...
                          </button>
                        </div>
                      )}
                      
                      {/* Определяем переменные вне IIFE для использования в разметке */}
                      {(() => {
                        const content = message.content.trim();
                        const hasBasicChars = /[0-9a-zA-Zа-яА-ЯёЁ#*\-_+=<>!?@$%^&()\[\]{}|\\/:;"'.,`~]/.test(content);
                        const realEmojis = content.match(/(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\u{FE0F})?(?:\u{200D}(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\u{FE0F})?)*/gu) || [];
                        return null;
                      })()}
                      
                      {(() => {
                        // Определяем тип контента: только эмоджи или текст
                        // Исключаем цифры (0-9), символы # * и другие базовые символы, которые технически являются emoji
                        const content = message.content.trim();
                        // Если содержит цифры, буквы или базовые символы - это не чистый эмодзи
                        const hasBasicChars = /[0-9a-zA-Zа-яА-ЯёЁ#*\-_+=<>!?@$%^&()\[\]{}|\\/:;"'.,`~]/.test(content);
                        // Ищем только настоящие эмодзи (не цифры, символы)
                        const realEmojis = content.match(/(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\u{FE0F})?(?:\u{200D}(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\u{FE0F})?)*/gu) || [];
                        const isOnlyEmojis = !hasBasicChars && realEmojis.length > 0 && realEmojis.join('') === content.replace(/\s/g, '');
                        const emojiCount = isOnlyEmojis ? realEmojis.length : 0;
                        
                        // Проверяем, является ли сообщение только картинкой (без текста)
                        const hasOnlyImages = !message.content.trim() && message.attachments?.every(att => att.type === 'image');
                        const hasImages = message.attachments?.some(att => att.type === 'image');
                        const hasOnlyAttachments = !message.content.trim() && message.attachments && message.attachments.length > 0 && !hasOnlyImages;
                        const hasAttachments = !message.content.trim() && message.attachments && message.attachments.filter(att => att.type !== 'image').length > 0;
                        (window as any)._currentMessageState = { hasOnlyImages, isOnlyEmojis, hasAttachments };
                        
                        const isLargeEmoji = emojiCount === 1;
                        const isMediumEmoji = emojiCount >= 2 && emojiCount <= 5;
                        // Не показываем бабл для эмодзи, для сообщений только с картинками И для сообщений только с attachments без текста
                        const hasBackground = !isOnlyEmojis && !hasOnlyImages && !hasOnlyAttachments;
                        
                        // Настройки стилей - компактные на мобильных как в Telegram
                        const bubbleRadius = chatSettings.bubbleStyle === 'minimal' ? 'rounded-lg' : chatSettings.bubbleStyle === 'classic' ? 'rounded-2xl' : 'rounded-[18px]';
                        // Используем отдельные настройки для мобильных и десктопа
                        const mobileFontSize = chatSettings.fontSizeMobile || 15;
                        const desktopFontSize = chatSettings.fontSize || 13;
                        const fontSizeStyle = { fontSize: `${isDesktopView ? desktopFontSize : mobileFontSize}px`, lineHeight: isDesktopView ? '1.5' : '1.3' };
                        
                        return (
                          <>
                          <div
                            className={`${
                              hasBackground
                                ? `${bubbleRadius} px-2.5 py-1.5 md:px-3 md:py-2 relative min-w-[60px] md:min-w-[80px] w-fit max-w-full ${
                                    isMyMessage
                                      ? `text-white ${isLastInGroup ? 'rounded-br-sm md:rounded-br-[18px] md:rounded-bl-sm' : ''}`
                                      : message.isSystemMessage
                                        ? `bg-gradient-to-r from-orange-100 to-amber-100 dark:from-blue-500/10 dark:to-purple-500/10 border border-orange-200 dark:border-blue-500/20 hover:border-orange-300 dark:hover:border-blue-500/40 transition-colors ${isLastInGroup ? 'rounded-bl-sm' : ''}`
                                        : `bg-[var(--bg-tertiary)] ${isLastInGroup ? 'rounded-bl-sm' : ''}`
                                  } ${message.isDeleted ? 'opacity-60' : ''}`
                                : ''
                            }`}
                            style={isMyMessage && hasBackground ? { backgroundColor: theme === 'dark' ? chatSettings.bubbleColor : chatSettings.bubbleColorLight } : undefined}
                          >
                            {!isMyMessage && hasBackground && (
                              <p className={`text-[10px] font-medium mb-0.5 select-none ${message.isSystemMessage ? 'text-orange-600 dark:text-purple-400' : 'text-[var(--accent-primary)] dark:text-gray-300'} flex items-center gap-1.5`}>
                                <span>{message.authorName}</span>
                                {selectedChat?.isGroup && authorId === selectedChat.creatorId && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-500 text-[9px]">
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    Создатель
                                  </span>
                                )}
                              </p>
                            )}

                            {message.isDeleted ? (
                              <p className="text-xs text-[var(--text-secondary)] italic">
                                Сообщение удалено
                              </p>
                            ) : (
                              <>
                                {isLargeEmoji ? (
                                  <div className="relative">
                                    <p 
                                      className="text-5xl md:text-7xl my-1 emoji-content emoji-native message-content"
                                      dangerouslySetInnerHTML={{ __html: message.content }}
                                    />
                                    {/* Время под эмодзи */}
                                    <span className={`block text-right text-[9px] md:text-[11px] mt-1 ${isMyMessage ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]'}`}>
                                      {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                      {message.isEdited && <span className="ml-1">(изм.)</span>}
                                    </span>
                                  </div>
                                ) : isMediumEmoji ? (
                                  <div className="relative">
                                    <p 
                                      className="text-3xl md:text-4xl my-1 emoji-content emoji-native message-content"
                                      dangerouslySetInnerHTML={{ __html: message.content }}
                                    />
                                    {/* Время под эмодзи */}
                                    <span className={`block text-right text-[9px] md:text-[11px] mt-1 ${isMyMessage ? 'text-[var(--text-muted)]' : 'text-[var(--text-muted)]'}`}>
                                      {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                      {message.isEdited && <span className="ml-1">(изм.)</span>}
                                    </span>
                                  </div>
                                ) : (
                              <>
                                <span className="inline">
                                  <span
                                    className={`message-content ${isMyMessage ? myBubbleTextClass : 'text-[var(--text-primary)]'} whitespace-pre-wrap [overflow-wrap:anywhere] ${isEditing ? 'bg-blue-500/10 -mx-2 -my-1 px-2 py-1 rounded border border-blue-400/30' : ''}`}
                                    style={fontSizeStyle}
                                    dangerouslySetInnerHTML={{
                                      __html: formatMessageText(message.content)
                                        .replace(
                                          /(https?:\/\/[^\s<>"']+)/gi,
                                          `<a href="$1" target="_blank" rel="noopener noreferrer" class="${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-700 hover:text-gray-900' : 'text-white/80 hover:text-white') : 'text-blue-400 hover:text-blue-300'} underline">$1</a>`
                                        )
                                        .replace(
                                          /@([a-zA-Zа-яА-ЯёЁ0-9_]+(?:\s+[a-zA-Zа-яА-ЯёЁ0-9_]+)?)/g,
                                          `<span class="${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-900 font-medium' : 'text-white font-medium') : 'text-blue-400 font-medium'}">@$1</span>`
                                        )
                                    }}
                                  />
                                  {/* Невидимый спейсер для времени */}
                                  <span className="inline-block w-[80px] md:w-[90px]">&nbsp;</span>
                                </span>

                                {/* Кнопка перехода к задаче/публикации в уведомлениях */}
                                {message.isSystemMessage && (message.linkedTaskId || message.linkedPostId) && (
                                  <div className="mt-3 mb-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (message.linkedTaskId) {
                                          window.location.href = `/todos?task=${message.linkedTaskId}`;
                                        } else if (message.linkedPostId) {
                                          window.location.href = `/content-plan?post=${message.linkedPostId}`;
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-medium transition-colors"
                                    >
                                      <CheckSquare className="w-3.5 h-3.5" />
                                      {message.linkedTaskId ? 'Открыть задачу' : 'Открыть публикацию'}
                                    </button>
                                  </div>
                                )}

                                {/* Предпросмотр изображений и ссылок из текста */}
                                {(() => {
                                  const urls = message.content.match(/(https?:\/\/[^\s<>"']+)/gi) || [];
                              // Улучшенная проверка - расширение может быть в любом месте URL
                              const imageExtPattern = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)(\?|$|#)/i;
                              const imageUrls = urls.filter(url => imageExtPattern.test(url));
                              const otherUrls = urls.filter(url => !imageExtPattern.test(url));
                              
                              return (
                                <>
                                  {/* Предпросмотр изображений */}
                                  {imageUrls.length > 0 && (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                      {imageUrls.map((url, idx) => (
                                        <div 
                                          key={idx} 
                                          className="relative group rounded-lg overflow-hidden bg-black/20 cursor-pointer"
                                          onClick={() => {
                                            setCurrentImageUrl(url);
                                            setShowImageModal(true);
                                          }}
                                        >
                                          <img 
                                            src={url} 
                                            alt="Изображение"
                                            className="w-full h-auto max-h-64 object-cover hover:opacity-90 transition-opacity"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.parentElement!.style.display = 'none';
                                            }}
                                          />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <Download className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Предпросмотр ссылок (только первая) */}
                                  {otherUrls.length > 0 && <LinkPreview url={otherUrls[0]} isMyMessage={isMyMessage} />}
                                </>
                              );
                            })()}

                            {/* Attachments внутри bubble - когда есть текст */}
                            {message.attachments && message.attachments.length > 0 && message.attachments.filter(att => att.type !== 'image').length > 0 && message.content.trim() && (
                              <div className="flex flex-col gap-2 mt-2 mb-5 w-full">
                                {message.attachments.filter(att => att.type !== 'image').map((att, idx) => (
                                  <div key={idx} className="w-full">
                                    {att.type === 'task' && (
                                      <button 
                                        onClick={() => {
                                          const taskId = att.taskId || att.id;
                                          if (taskId) window.location.href = `/todos?task=${taskId}`;
                                        }}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 bg-cyan-500/10 dark:bg-cyan-500/10 rounded-lg md:rounded-xl border border-cyan-500/50 dark:border-cyan-500/30 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/20 transition-colors"
                                      >
                                        <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-cyan-500/20 dark:bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                          <FileText className="w-3 h-3 md:w-4 md:h-4 text-cyan-600 dark:text-cyan-400" />
                                        </div>
                                        <div className="flex flex-col items-start min-w-0 flex-1">
                                          <span className="text-[9px] md:text-[10px] text-cyan-600 dark:text-cyan-400/70 uppercase">Задача</span>
                                          <span className="text-xs md:text-sm font-medium text-cyan-700 dark:text-cyan-300 truncate w-full">{att.name}</span>
                                        </div>
                                      </button>
                                    )}
                                    {att.type === 'event' && (
                                      <button 
                                        onClick={() => { if (att.id) window.location.href = `/account?tab=calendar&event=${att.id}`; }}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 bg-green-500/10 dark:bg-green-500/10 rounded-lg md:rounded-xl border border-green-500/50 dark:border-green-500/30 hover:bg-green-500/20 dark:hover:bg-green-500/20 transition-colors"
                                      >
                                        <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-green-500/20 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                          <Calendar className="w-3 h-3 md:w-4 md:h-4 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="flex flex-col items-start min-w-0 flex-1">
                                          <span className="text-[9px] md:text-[10px] text-green-600 dark:text-green-400/70 uppercase">Событие</span>
                                          <span className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 truncate w-full">{att.name}</span>
                                        </div>
                                      </button>
                                    )}
                                    {att.type === 'link' && (
                                      <button 
                                        onClick={() => { if (att.url) window.open(att.url, '_blank'); }}
                                        className="w-full flex flex-col items-start gap-1 px-3 py-2 bg-purple-500/10 dark:bg-purple-500/10 rounded-xl border-2 border-purple-500/50 dark:border-purple-500/30 hover:bg-purple-500/20 dark:hover:bg-purple-500/20 transition-colors"
                                      >
                                        <span className="text-[10px] text-purple-600 dark:text-purple-400/70">Ссылка</span>
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                            <LinkIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                          </div>
                                          <span className="text-sm font-medium text-purple-700 dark:text-purple-300 truncate flex-1">{att.name}</span>
                                        </div>
                                      </button>
                                    )}
                                    {att.type === 'file' && (
                                      <div className="w-full flex flex-col items-start gap-1 px-2 py-1.5 bg-orange-500/10 dark:bg-orange-500/10 rounded-xl border-2 border-orange-500/50 dark:border-orange-500/30 max-w-[200px] md:max-w-[280px]">
                                        <span className="text-[9px] text-orange-600 dark:text-orange-400/70">Файл</span>
                                        <div className="flex items-center gap-1.5 w-full min-w-0">
                                          <div className="w-6 h-6 rounded-lg bg-orange-500/20 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                            <File className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                                          </div>
                                          <span className="text-xs font-medium text-[var(--text-primary)] truncate flex-1 min-w-0">{att.name}</span>
                                          <button className="text-[10px] font-medium text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300 flex-shrink-0">
                                            Скачать
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Изображения из attachments - внутри bubble */}
                            {message.attachments && message.attachments.filter(att => att.type === 'image').length > 0 && (
                              <div className="mt-2 mb-1">
                                <div className={`grid gap-1 ${message.attachments.filter(att => att.type === 'image').length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                  {message.attachments.filter(att => att.type === 'image').map((att, idx) => (
                                    <div 
                                      key={idx}
                                      className="relative group rounded-lg overflow-hidden bg-black/20 cursor-pointer"
                                      onClick={() => {
                                        setCurrentImageUrl(att.url);
                                        setShowImageModal(true);
                                      }}
                                    >
                                      <img 
                                        src={att.url} 
                                        alt={att.name || 'Изображение'}
                                        className="w-full h-auto max-h-64 object-cover hover:opacity-90 transition-opacity rounded-lg"
                                        style={{ maxWidth: message.attachments!.filter(a => a.type === 'image').length === 1 ? '300px' : '200px' }}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center rounded-lg">
                                        <Download className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Время и галочки - только для сообщений БЕЗ вложений */}
                            {!hasOnlyImages && !isOnlyEmojis && !hasAttachments && (
                                <span className="absolute bottom-0.5 right-2 flex items-center gap-0.5 select-none pointer-events-auto">
                                  <span className={`text-[9px] md:text-[11px] select-none ${isMyMessage ? (useDarkTextOnBubble ? 'text-gray-700' : 'text-white/80') : 'text-[var(--text-muted)]'}`}>
                                    {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                    {message.isEdited && <span className="ml-1">(изм.)</span>}
                                  </span>
                                  {isMyMessage && !message.isDeleted && (
                                    <Check className={`w-2.5 h-2.5 md:w-3.5 md:h-3.5 ${useDarkTextOnBubble ? 'text-gray-700' : 'text-white/80'}`} />
                                  )}
                                </span>
                            )}
                          </>
                        )}
                      </>
                      )}
                      </div>
                    </>
                    );
                  })()}

                    </div>
                  </div>
                    </React.Fragment>
                );
              })}
                </div>
            )}
              <div ref={messagesEndRef} className="h-16 md:h-auto transition-all duration-150" style={{ height: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${Math.max(141, 97 + textareaHeight)}px` : undefined }} />
            </div>
          </div>

          {/* Message input */}
          <div
            className={`absolute bottom-0 md:bottom-[50px] left-0 right-0 z-30 px-[2px] md:px-4 lg:px-8 py-2 pb-[max(env(safe-area-inset-bottom,8px),8px)] ${
              isDragging ? 'scale-[1.02]' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);
              
              const files = Array.from(e.dataTransfer.files);
              for (const file of files) {
                // Загружаем файл на сервер
                const formData = new FormData();
                formData.append('file', file);
                
                try {
                  const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                  });
                  
                  if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    setAttachments(prev => [...prev, {
                      type: file.type.startsWith('image/') ? 'image' : 'file',
                      name: file.name,
                      url: uploadData.url
                    }]);
                  } else {
                    console.error('Upload failed');
                  }
                } catch (error) {
                  console.error('Error uploading file:', error);
                }
              }
            }}
          >
            {/* Drag overlay */}
            {isDragging && (
              <div className="absolute inset-x-3 inset-y-0 bg-gradient-to-br from-blue-500/30 via-cyan-500/25 to-purple-500/30 border-4 border-blue-400/80 border-dashed rounded-[24px] flex items-center justify-center pointer-events-none z-50 backdrop-blur-md shadow-2xl">
                <div className="text-center animate-bounce">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/40 to-cyan-500/40 border-4 border-blue-400/70 flex items-center justify-center shadow-lg">
                    <Upload className="w-10 h-10 text-blue-300 animate-pulse" />
                  </div>
                  <p className="text-lg text-blue-300 font-bold mb-2">Отпустите файлы для загрузки</p>
                  <p className="text-sm text-blue-300/90 mt-1">Изображения и документы</p>
                </div>
              </div>
            )}
            
            {/* Attachments preview */}
            {!selectedChat?.isNotificationsChat && attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 px-2 md:px-4 lg:px-8">
                {attachments.map((att, idx) => (
                  <div key={idx} className="backdrop-blur-xl bg-[var(--bg-secondary)]/80 border border-[var(--border-color)]/30 rounded-lg px-3 py-1.5 text-xs text-[var(--text-secondary)] flex items-center gap-2 shadow-lg">
                    {att.type === 'task' && <FileText className="w-3 h-3" />}
                    {att.type === 'link' && <LinkIcon className="w-3 h-3" />}
                    {att.type === 'event' && <Calendar className="w-3 h-3" />}
                    {att.type === 'image' && <Image className="w-3 h-3" />}
                    {att.type === 'file' && <File className="w-3 h-3" />}
                    <span>{att.name}</span>
                    <button
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {selectedChat?.isNotificationsChat ? (
              /* Кнопка "Убрать звук" для чата уведомлений */
              <div className="flex justify-center items-center w-full px-2 md:px-4 lg:px-8">
                <button
                  onClick={() => {
                    // TODO: Реализовать отключение звука уведомлений
                    alert('Функция отключения звука будет реализована');
                  }}
                  className="h-11 px-6 rounded-full backdrop-blur-xl bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 flex items-center justify-center gap-2 text-amber-400 font-medium transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                  Убрать звук
                </button>
              </div>
            ) : (
            <div className="flex gap-1 md:gap-2 items-center relative bg-transparent">
              {/* Emoji button - только на десктопе */}
              {!selectedChat?.isNotificationsChat && (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="hidden md:flex w-11 h-11 rounded-full bg-gradient-to-br from-white/15 to-white/5 items-center justify-center transition-all duration-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] border border-white/20 backdrop-blur-sm flex-shrink-0 text-gray-400/90"
                >
                  <Smile className="w-5 h-5" />
                </button>
                
                {/* Emoji Picker Dropdown */}
                {showEmojiPicker && (
                  <EmojiPicker
                    onEmojiSelect={(emoji) => {
                      // Вставляем эмодзи напрямую в инпут через ref
                      if (messageInputRef.current) {
                        const start = messageInputRef.current.selectionStart || 0;
                        const end = messageInputRef.current.selectionEnd || 0;
                        const text = messageInputRef.current.value;
                        const newText = text.substring(0, start) + emoji + text.substring(end);
                        messageInputRef.current.value = newText;
                        // Устанавливаем курсор после эмодзи
                        const newCursorPos = start + emoji.length;
                        messageInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
                        messageInputRef.current.focus();
                        // Обновляем состояние для синхронизации
                        setNewMessage(newText);
                      }
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>
              )}
              
              {/* Attachment button */}
              {!selectedChat?.isNotificationsChat && (
              <button
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center transition-all duration-200 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] border border-white/20 backdrop-blur-sm flex-shrink-0 text-[var(--text-secondary)]"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  
                  for (const file of files) {
                    // Загружаем файл на сервер
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    try {
                      const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                      });
                      
                      if (uploadRes.ok) {
                        const uploadData = await uploadRes.json();
                        setAttachments(prev => [...prev, {
                          type: file.type.startsWith('image/') ? 'image' : 'file',
                          name: file.name,
                          url: uploadData.url
                        }]);
                      } else {
                        alert('Ошибка загрузки файла');
                      }
                    } catch (error) {
                      console.error('Error uploading file:', error);
                      alert('Ошибка загрузки файла');
                    }
                  }
                  // Сбрасываем input чтобы можно было загрузить те же файлы снова
                  e.target.value = '';
                }}
              />
              
              {/* Input container with reply/edit indicator */}
              <div className="flex-1 min-w-0 flex flex-col bg-transparent">
                {/* Edit indicator над инпутом */}
                {editingMessageId && (
                  <div className="mb-1 px-3 py-1.5 backdrop-blur-xl bg-blue-500/20 border border-blue-400/30 rounded-t-[18px] rounded-b-[18px] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="text-[11px] text-blue-400 font-medium">Редактирование сообщения</span>
                    </div>
                    <button
                      onClick={() => {
                        setEditingMessageId(null);
                        setNewMessage(savedMessageText);  // Восстанавливаем сохранённый текст
                        setSavedMessageText('');
                      }}
                      className="w-5 h-5 rounded-full hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                
                {/* Reply indicator над инпутом */}
                {replyToMessage && !editingMessageId && (
                  <div className="mx-1 mb-1 px-3 py-2 backdrop-blur-xl bg-[var(--bg-secondary)]/80 border border-white/10 rounded-[35px] flex items-center justify-between gap-2" style={{ maxHeight: '70%', overflowY: 'auto' }}>
                    <button
                      onClick={() => scrollToMessage(replyToMessage.id)}
                      className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity min-w-0 flex-1"
                    >
                      <Reply className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div className="overflow-hidden min-w-0">
                        <p className="text-[10px] text-blue-400 font-medium truncate">{replyToMessage.authorName}</p>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate max-w-[200px]">
                          {replyToMessage.content.length > 40 ? replyToMessage.content.substring(0, 40) + '...' : replyToMessage.content}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setReplyToMessage(null)}
                      className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                
                <textarea
                  ref={messageInputRef}
                  onSelect={handleTextSelection}
                  onFocus={() => {
                    isUserActiveRef.current = true;
                    lastActivityTimeRef.current = Date.now();
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      isUserActiveRef.current = false;
                    }, 500);
                  }}
                  onChange={handleMessageChange}
                  onKeyDown={handleMessageKeyDown}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.style.borderColor = 'rgb(59, 130, 246)';
                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
                  }}
                  onPaste={async (e) => {
                    // Универсальная обработка вставки: файлы и изображения из буфера
                    const items = e.clipboardData?.items;
                    if (!items) return;

                    const files: File[] = [];
                    for (let i = 0; i < items.length; i++) {
                      const item = items[i];
                      // Поддерживаем как item.kind === 'file', так и image-type
                      if (item.kind === 'file') {
                        const file = item.getAsFile();
                        if (file) files.push(file);
                      } else if (item.type && item.type.indexOf('image') !== -1) {
                        const file = item.getAsFile();
                        if (file) files.push(file);
                      }
                    }

                    if (files.length === 0) return;
                    e.preventDefault();

                    // Загружаем каждый файл на сервер и добавляем в attachments
                    for (const file of files) {
                      const formData = new FormData();
                      formData.append('file', file, file.name || 'pasted-image');
                      try {
                        const uploadRes = await fetch('/api/upload', {
                          method: 'POST',
                          body: formData
                        });

                        if (uploadRes.ok) {
                          const uploadData = await uploadRes.json();
                          setAttachments(prev => [...prev, {
                            type: file.type.startsWith('image/') ? 'image' : 'file',
                            name: file.name || (file.type.startsWith('image/') ? 'pasted-image' : 'file'),
                            url: uploadData.url
                          }]);
                        } else {
                          console.error('Upload failed for pasted file');
                        }
                      } catch (error) {
                        console.error('Error uploading pasted file:', error);
                      }
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.style.borderColor = '';
                    e.currentTarget.style.backgroundColor = '';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.style.borderColor = '';
                    e.currentTarget.style.backgroundColor = '';
                    
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
                      if (imageFiles.length > 0) {
                        // Добавляем изображения в список для отправки
                        const newAttachments = imageFiles.map(file => ({
                          file,
                          preview: URL.createObjectURL(file),
                          type: 'image' as const
                        }));
                        setAttachments(prev => [...prev, ...newAttachments]);
                      }
                    }
                  }}
                  
                  placeholder={selectedChat?.isNotificationsChat ? "Чат только для чтения" : editingMessageId ? "Редактируйте сообщение..." : "Сообщение..."}
                  disabled={selectedChat?.isNotificationsChat}
                  className={`w-full px-4 py-2.5 bg-gradient-to-br from-white/15 to-white/5 border border-white/20 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-white/30 resize-none overflow-hidden shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl disabled:opacity-50 disabled:cursor-not-allowed ${(replyToMessage && !editingMessageId) || editingMessageId ? 'rounded-b-[22px] rounded-t-none border-t-0' : 'rounded-[22px]'}`}
                  style={{ minHeight: '44px', maxHeight: '120px', lineHeight: '20px', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  rows={1}
                />

                {/* Mention suggestions dropdown */}
                {showMentionSuggestions && selectedChat?.isGroup && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                    {(() => {
                      const participants = users.filter(u => 
                        selectedChat.participantIds?.includes(u.id) && 
                        u.id !== currentUser?.id &&
                        (u.name?.toLowerCase().includes(mentionQuery) || 
                         u.username?.toLowerCase().includes(mentionQuery) ||
                         u.shortId?.toLowerCase().includes(mentionQuery))
                      );

                      if (participants.length === 0) {
                        return (
                          <div className="p-3 text-xs text-[var(--text-muted)] text-center">
                            Участники не найдены
                          </div>
                        );
                      }

                      return participants.map(user => (
                        <button
                          key={user.id}
                          onClick={() => {
                            const textarea = messageInputRef.current;
                            if (!textarea) return;
                            const cursorPos = textarea.selectionStart || 0;
                            const currentText = textarea.value;
                            const textBeforeCursor = currentText.substring(0, cursorPos);
                            const textAfterCursor = currentText.substring(cursorPos);
                            const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
                            
                            const mentionText = user.shortId || user.username || user.name || 'user';
                            const newText = 
                              textBeforeCursor.substring(0, lastAtSymbol) + 
                              '@' + mentionText + ' ' + 
                              textAfterCursor;
                            
                            textarea.value = newText;
                            setShowMentionSuggestions(false);
                            messageInputRef.current?.focus();
                          }}
                          className="w-full p-2 flex items-center gap-2 hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                        >
                          <Avatar
                            src={user.avatar}
                            name={user.name || user.username || 'Пользователь'}
                            size="xs"
                            type="user"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                              {user.name || user.username || 'Пользователь'}
                            </p>
                            {user.shortId && (
                              <p className="text-[10px] text-[var(--text-muted)]">@{user.shortId}</p>
                            )}
                          </div>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
              
              {/* Send or Save button */}
              {editingMessageId ? (
                <button
                  onClick={() => {
                    const messageText = messageInputRef.current?.value || '';
                    updateMessage(editingMessageId, messageText);
                    if (messageInputRef.current) {
                      messageInputRef.current.value = savedMessageText;
                    }
                    setSavedMessageText('');
                  }}
                  disabled={false}
                  className="w-11 h-11 rounded-full backdrop-blur-2xl bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 border border-white/30 flex items-center justify-center text-white transition-all flex-shrink-0 shadow-[0_8px_32px_-8px_rgba(34,197,94,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_40px_-8px_rgba(34,197,94,0.8),inset_0_1px_2px_rgba(255,255,255,0.25)]"
                >
                  <Check className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onMouseDown={(e) => {
                    // Предотвращаем потерю фокуса с textarea при клике на кнопку
                    e.preventDefault();
                  }}
                  onClick={sendMessage}
                  disabled={selectedChat?.isNotificationsChat}
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full backdrop-blur-2xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border border-white/30 disabled:from-white/5 disabled:to-white/5 disabled:border-white/10 flex items-center justify-center text-white disabled:text-[var(--text-muted)] transition-all flex-shrink-0 shadow-[0_8px_32px_-8px_rgba(59,130,246,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] hover:shadow-[0_8px_40px_-8px_rgba(59,130,246,0.8),inset_0_1px_2px_rgba(255,255,255,0.25)] disabled:shadow-none disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              )}
            </div>
            )}
          </div>

          {/* Text Formatting Menu */}
          {showTextFormatMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowTextFormatMenu(false)}
              />
              <div 
                className="fixed z-50 flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl p-1"
                style={{
                  top: `${formatMenuPosition.top}px`,
                  left: `${formatMenuPosition.left}px`,
                  transform: 'translateX(-50%)',
                  borderRadius: '35px'
                }}
              >
                <button
                  onClick={() => applyFormatting('bold')}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ borderRadius: '20px' }}
                  title="Жирный (** **)"
                >
                  <span className="font-bold text-sm">B</span>
                </button>
                <button
                  onClick={() => applyFormatting('italic')}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ borderRadius: '20px' }}
                  title="Курсив (* *)"
                >
                  <span className="italic text-sm">I</span>
                </button>
                <button
                  onClick={() => applyFormatting('underline')}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ borderRadius: '20px' }}
                  title="Подчеркнутый (__ __)"
                >
                  <span className="underline text-sm">U</span>
                </button>
                <button
                  onClick={() => applyFormatting('link')}
                  className="w-8 h-8 flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
                  style={{ borderRadius: '20px' }}
                  title="Гиперссылка"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
          </div>

          {/* Chat Info Panel - Профиль собеседника */}
          {showChatInfo && (
            <div className="fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-auto w-full lg:w-80 lg:min-w-[320px] border-l-0 lg:border-l border-[var(--border-color)] flex flex-col bg-[var(--bg-secondary)] flex-shrink-0 overflow-hidden">
              {(() => {
                // Определяем собеседника (не текущий пользователь)
                const otherParticipantId = selectedChat?.participantIds?.find(id => id !== currentUser?.id);
                const otherUser = otherParticipantId ? users.find(u => u.id === otherParticipantId) : null;
                
                // Статистика вложений
                const mediaCount = messages.filter(m => m.attachments?.some(a => a.type === 'image')).length;
                const fileCount = messages.filter(m => m.attachments?.some(a => a.type === 'file' || a.type === 'task')).length;
                const linkCount = messages.reduce((count, m) => {
                  const attachmentLinks = (m.attachments || []).filter(a => a.type === 'link').length;
                  const textLinks = (m.content.match(/(https?:\/\/[^\s<>"']+)/gi) || []).length;
                  return count + attachmentLinks + textLinks;
                }, 0);
                
                // Общие задачи (где ОБА участника задействованы - один заказчик, другой исполнитель или наоборот)
                const sharedTasks = tasks.filter(task => {
                  if (!otherUser || !currentUser) return false;
                  
                  // Получаем исполнителя (может быть assignedToId или assignedTo)
                  const executorId = (task as any).assignedToId || task.assignedTo;
                  // Получаем заказчика (может быть assignedById или authorId)
                  const customerId = (task as any).assignedById || task.authorId;
                  
                  // Проверяем что ОБА участника задействованы в задаче
                  const currentUserInvolved = executorId === currentUser.id || customerId === currentUser.id;
                  const otherUserInvolved = executorId === otherUser.id || customerId === otherUser.id;
                  
                  return currentUserInvolved && otherUserInvolved;
                });

                return (
                  <>
                    {/* Header */}
                    <div className="h-12 border-b border-[var(--border-color)] flex items-center px-4 gap-2 flex-shrink-0">
                      <button
                        onClick={() => setShowChatInfo(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-all lg:hidden"
                      >
                        <ArrowLeft className="w-4 h-4 text-[var(--text-primary)]" />
                      </button>
                      <span className="font-medium text-sm">{selectedChat?.isGroup ? 'Чат' : 'Профиль'}</span>
                      <button
                        onClick={() => setShowChatInfo(false)}
                        className="ml-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-all hidden lg:flex"
                      >
                        <X className="w-4 h-4 text-[var(--text-primary)]" />
                      </button>
                    </div>

                    {/* Profile section */}
                    <div className="p-4 border-b border-[var(--border-color)]">
                      <div className="flex flex-col items-center">
                        {(() => {
                          const avatarData = getChatAvatarData(selectedChat!);
                          return (
                            <div className="mb-3">
                              <Avatar
                                src={avatarData.avatar}
                                name={avatarData.name}
                                type={avatarData.type}
                                size="xl"
                              />
                            </div>
                          );
                        })()}
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-center">{getChatTitle(selectedChat!)}</h3>
                          {/* Кнопка переименования - только для создателя группы */}
                          {selectedChat?.isGroup && selectedChat.creatorId === currentUser?.id && (
                            <button
                              onClick={() => {
                                setNewChatName(selectedChat.title || '');
                                setShowRenameChatModal(true);
                              }}
                              className="w-6 h-6 rounded-full hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-colors"
                              title="Переименовать чат"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            </button>
                          )}
                        </div>
                        {selectedChat?.isGroup ? (
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {selectedChat.participantIds?.length || 0} участник{(selectedChat.participantIds?.length || 0) === 1 ? '' : (selectedChat.participantIds?.length || 0) < 5 ? 'а' : 'ов'}
                          </p>
                        ) : otherUser && otherUser.email && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--text-secondary)]">
                            <Mail className="w-3 h-3" />
                            <span>{otherUser.email}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Статистика вложений */}
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <button
                          onClick={() => setChatInfoTab('media')}
                          className={`p-2 rounded-lg text-center transition-all ${chatInfoTab === 'media' ? 'bg-cyan-500/20' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)]'}`}
                        >
                          <p className="text-lg font-bold text-[var(--text-primary)]">{mediaCount}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">Медиа</p>
                        </button>
                        <button
                          onClick={() => setChatInfoTab('files')}
                          className={`p-2 rounded-lg text-center transition-all ${chatInfoTab === 'files' ? 'bg-cyan-500/20' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)]'}`}
                        >
                          <p className="text-lg font-bold text-[var(--text-primary)]">{fileCount}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">Файлы</p>
                        </button>
                        <button
                          onClick={() => setChatInfoTab('links')}
                          className={`p-2 rounded-lg text-center transition-all ${chatInfoTab === 'links' ? 'bg-cyan-500/20' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)]'}`}
                        >
                          <p className="text-lg font-bold text-[var(--text-primary)]">{linkCount}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">Ссылки</p>
                        </button>
                      </div>
                    </div>

                    {/* Tab buttons */}
                    <div className="overflow-x-auto border-b border-[var(--border-color)]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                      <style jsx>{`
                        div::-webkit-scrollbar {
                          display: none;
                        }
                      `}</style>
                      <div className="flex min-w-max">
                        <button
                          onClick={() => setChatInfoTab('profile')}
                          className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
                            chatInfoTab === 'profile' 
                              ? 'text-cyan-400 border-b-2 border-cyan-400' 
                              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                          }`}
                        >
                          Задачи
                        </button>
                        {/* Вкладка Участники для групповых чатов */}
                        {selectedChat?.isGroup && (
                          <button
                            onClick={() => setChatInfoTab('participants')}
                            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
                              chatInfoTab === 'participants' 
                                ? 'text-cyan-400 border-b-2 border-cyan-400' 
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                            }`}
                          >
                            Участники
                          </button>
                        )}
                        <button
                          onClick={() => setChatInfoTab('media')}
                          className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
                            chatInfoTab === 'media' 
                              ? 'text-cyan-400 border-b-2 border-cyan-400' 
                              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                          }`}
                        >
                          Медиа
                        </button>
                        <button
                          onClick={() => setChatInfoTab('files')}
                          className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
                            chatInfoTab === 'files' 
                              ? 'text-cyan-400 border-b-2 border-cyan-400' 
                              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                          }`}
                        >
                          Файлы
                        </button>
                        <button
                          onClick={() => setChatInfoTab('links')}
                          className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all whitespace-nowrap ${
                            chatInfoTab === 'links' 
                              ? 'text-cyan-400 border-b-2 border-cyan-400' 
                              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                          }`}
                        >
                          Ссылки
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-3">
                      {chatInfoTab === 'profile' && (
                        <div>
                          {sharedTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                              <CheckSquare className="w-12 h-12 mb-3 opacity-50" />
                              <p className="text-sm">Нет общих задач</p>
                              <p className="text-xs mt-1 text-center">Задачи, где вы оба участвуете, появятся здесь</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {sharedTasks.slice(0, 10).map(task => (
                                <button
                                  key={task.id}
                                  onClick={() => window.location.href = `/todos?task=${task.id}`}
                                  className="w-full p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors text-left"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      task.status === 'done' ? 'bg-green-500/20' : 
                                      task.status === 'in_progress' ? 'bg-blue-500/20' : 'bg-gray-500/20'
                                    }`}>
                                      <CheckSquare className={`w-4 h-4 ${
                                        task.status === 'done' ? 'text-green-400' : 
                                        task.status === 'in_progress' ? 'text-blue-400' : 'text-gray-400'
                                      }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">{task.title}</p>
                                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                        {task.status === 'done' ? 'Выполнено' : 
                                         task.status === 'in_progress' ? 'В работе' : 'Ожидает'}
                                        {task.dueDate && ` • До ${new Date(task.dueDate).toLocaleDateString('ru-RU')}`}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                              {sharedTasks.length > 10 && (
                                <p className="text-center text-xs text-[var(--text-muted)] py-2">
                                  И ещё {sharedTasks.length - 10} задач...
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Вкладка Участники */}
                      {chatInfoTab === 'participants' && selectedChat?.isGroup && (
                        <div className="pb-20">
                          {/* Кнопка добавить участника - только для создателя */}
                          {selectedChat.creatorId === currentUser?.id && (
                            <button
                              onClick={() => setShowAddParticipantModal(true)}
                              className="w-full p-3 mb-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                <Plus className="w-4 h-4 text-cyan-400" />
                              </div>
                              <span className="text-sm text-[var(--text-primary)]">Добавить участника</span>
                            </button>
                          )}
                          
                          {/* Список участников */}
                          <div className="space-y-2">
                            {selectedChat.participantIds.map(participantId => {
                              const participant = users.find(u => u.id === participantId);
                              const isCreator = participantId === selectedChat.creatorId;
                              const isCurrentUser = participantId === currentUser?.id;
                              const canRemove = selectedChat.creatorId === currentUser?.id && !isCurrentUser;
                              
                              // Отладочное логирование
                              if (isCurrentUser) {
                                console.log('DEBUG - Информация о создателе чата:', {
                                  chatCreatorId: selectedChat.creatorId,
                                  currentUserId: currentUser?.id,
                                  participantId: participantId,
                                  isCreator: isCreator,
                                  canRemove: canRemove,
                                  chatTitle: selectedChat.title
                                });
                              }
                              
                              return (
                                <div key={participantId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                                  <Avatar
                                    src={participant?.avatar}
                                    name={participant?.name || participant?.username || 'Пользователь'}
                                    size="sm"
                                    type="user"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-[var(--text-primary)] truncate">
                                      {participant?.name || participant?.username || 'Пользователь'}
                                      {isCurrentUser && ' (вы)'}
                                    </p>
                                    {isCreator && (
                                      <p className="text-[10px] text-cyan-400">Создатель группы</p>
                                    )}
                                  </div>
                                  {canRemove && (
                                    <button
                                      onClick={() => removeParticipant(participantId)}
                                      className="w-7 h-7 rounded-full hover:bg-red-500/20 flex items-center justify-center text-red-400"
                                      title="Удалить из группы"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {chatInfoTab === 'media' && (
                        <div className="pb-20">
                          {(() => {
                            const mediaItems = messages
                              .filter(m => m.attachments?.some(a => a.type === 'image'))
                              .flatMap(m => (m.attachments || []).filter(a => a.type === 'image').map(a => ({ ...a, messageId: m.id, date: m.createdAt })));
                            
                            if (mediaItems.length === 0) {
                              return (
                                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                                  <Image className="w-12 h-12 mb-3 opacity-50" />
                                  <p className="text-sm">Нет медиафайлов</p>
                                  <p className="text-xs mt-1 text-center">Фото и видео из этого чата будут отображаться здесь</p>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="grid grid-cols-3 gap-1">
                                {mediaItems.map((item, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => item.messageId && scrollToMessage(item.messageId)}
                                    className="aspect-square rounded-lg bg-[var(--bg-tertiary)] overflow-hidden hover:opacity-80 transition-opacity relative group"
                                  >
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <Image className="w-6 h-6 text-[var(--text-muted)]" />
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <p className="text-[8px] text-white truncate">{item.name}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {chatInfoTab === 'files' && (
                        <div className="pb-20">
                          {(() => {
                            const fileItems = messages
                              .filter(m => m.attachments?.some(a => a.type === 'file' || a.type === 'task'))
                              .flatMap(m => (m.attachments || []).filter(a => a.type === 'file' || a.type === 'task').map(a => ({ ...a, messageId: m.id, date: m.createdAt, authorName: m.authorName })));
                            
                            if (fileItems.length === 0) {
                              return (
                                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                                  <File className="w-12 h-12 mb-3 opacity-50" />
                                  <p className="text-sm">Нет файлов</p>
                                  <p className="text-xs mt-1 text-center">Документы из этого чата появятся здесь</p>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="space-y-2">
                                {fileItems.map((item, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      if (item.type === 'task' && (item.taskId || item.id)) {
                                        window.location.href = `/todos?task=${item.taskId || item.id}`;
                                      } else if (item.messageId) {
                                        scrollToMessage(item.messageId);
                                      }
                                    }}
                                    className="w-full p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors text-left group"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        item.type === 'task' ? 'bg-cyan-500/20' : 'bg-orange-500/20'
                                      }`}>
                                        {item.type === 'task' ? (
                                          <FileText className="w-5 h-5 text-cyan-400" />
                                        ) : (
                                          <File className="w-5 h-5 text-orange-400" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                                        <p className="text-[10px] text-[var(--text-muted)]">
                                          {new Date(item.date).toLocaleDateString('ru-RU')}
                                        </p>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {chatInfoTab === 'links' && (
                        <div className="pb-20">
                          {(() => {
                            const linkItems: { url: string; name: string; messageId: string; date: string }[] = [];
                            
                            messages.forEach(m => {
                              if (m.attachments) {
                                m.attachments.filter(a => a.type === 'link').forEach(a => {
                                  linkItems.push({
                                    url: a.url || '',
                                    name: a.name || a.url || 'Ссылка',
                                    messageId: m.id,
                                    date: m.createdAt
                                  });
                                });
                              }
                              
                              const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
                              const matches = m.content.match(urlRegex);
                              if (matches) {
                                matches.forEach(url => {
                                  if (!linkItems.some(l => l.url === url)) {
                                    try {
                                      const urlObj = new URL(url);
                                      linkItems.push({ url, name: urlObj.hostname, messageId: m.id, date: m.createdAt });
                                    } catch {
                                      linkItems.push({ url, name: url.substring(0, 30), messageId: m.id, date: m.createdAt });
                                    }
                                  }
                                });
                              }
                            });
                            
                            if (linkItems.length === 0) {
                              return (
                                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                                  <LinkIcon className="w-12 h-12 mb-3 opacity-50" />
                                  <p className="text-sm">Нет ссылок</p>
                                  <p className="text-xs mt-1 text-center">Ссылки из этого чата появятся здесь</p>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="space-y-2">
                                {linkItems.map((item, idx) => (
                                  <div key={idx} className="p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                        <LinkIcon className="w-5 h-5 text-purple-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                                        <p className="text-[10px] text-blue-400 truncate">{item.url}</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={() => window.open(item.url, '_blank')}
                                        className="flex-1 py-1.5 text-[10px] font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-md transition-colors"
                                      >
                                        Открыть
                                      </button>
                                      <button
                                        onClick={() => scrollToMessage(item.messageId)}
                                        className="py-1.5 px-3 text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-primary)] rounded-md transition-colors"
                                      >
                                        К сообщению
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-[var(--text-muted)]">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Выберите чат</p>
            <p className="text-xs mt-1">или создайте новый</p>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed !inset-0 !p-0 !m-0 bg-black/50 backdrop-blur-sm z-[100] !overflow-hidden md:flex md:items-center md:justify-center md:p-4">
          <div className="!w-full !h-full md:relative md:inset-auto bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl md:border md:border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_4px_24px_rgba(0,0,0,0.4)] rounded-none md:rounded-[24px] md:w-full md:max-w-md md:h-auto md:max-h-[80vh] md:min-h-0 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
              <h3 className="font-semibold text-white">Новый чат</h3>
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setSelectedUsers([]);
                  setIsGroupChat(false);
                  setGroupTitle('');
                }}
                className="p-1.5 hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {/* Group chat toggle */}
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGroupChat}
                  onChange={(e) => setIsGroupChat(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--bg-tertiary)]"
                />
                <span className="text-sm">Групповой чат</span>
              </label>

              {/* Group title */}
              {isGroupChat && (
                <input
                  type="text"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="Название группы"
                  className="w-full px-4 py-2.5 mb-4 bg-white/5 border border-white/20 rounded-[20px] text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-white/40 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]"
                />
              )}

              {/* Search users */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                <input
                  type="text"
                  placeholder="Поиск пользователей..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/20 rounded-[25px] text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-white/40 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]"
                />
              </div>

              {/* Users list */}
              <div className="space-y-2">
                {filteredUsers.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-[20px] border border-white/10 hover:bg-white/10 cursor-pointer transition-all backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                  >
                    <input
                      type={isGroupChat ? 'checkbox' : 'radio'}
                      name="selectedUser"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (isGroupChat) {
                          setSelectedUsers(prev =>
                            e.target.checked
                              ? [...prev, user.id]
                              : prev.filter(id => id !== user.id)
                          );
                        } else {
                          setSelectedUsers([user.id]);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <Avatar
                      src={user.avatar}
                      name={user.name || user.username || 'Пользователь'}
                      size="sm"
                      type="user"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{user.name || user.username || 'Без имени'}</p>
                      {user.email && (
                        <p className="text-xs text-white/60">{user.email}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-white/10">
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setSelectedUsers([]);
                  setIsGroupChat(false);
                  setGroupTitle('');
                }}
                className="flex-1 py-2.5 bg-white/5 rounded-[20px] text-sm text-white hover:bg-white/10 transition-all border border-white/10"
              >
                Отмена
              </button>
              <button
                onClick={createChat}
                disabled={selectedUsers.length === 0 || (isGroupChat && !groupTitle.trim())}
                className="flex-1 py-2.5 bg-[#007aff]/20 text-white rounded-[20px] text-sm font-medium border border-[#007aff]/30 hover:bg-[#007aff]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Создать чат
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Chat Modal */}
      {showRenameChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                Переименовать чат
              </h3>
              <button
                onClick={() => {
                  setShowRenameChatModal(false);
                  setNewChatName('');
                }}
                className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Название группы..."
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-[var(--border-color)] rounded-xl text-sm text-gray-900 dark:text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-cyan-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newChatName.trim()) {
                    renameChat(newChatName);
                  }
                }}
              />
            </div>
            <div className="flex gap-2 p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => {
                  setShowRenameChatModal(false);
                  setNewChatName('');
                }}
                className="flex-1 py-2.5 bg-gray-200 dark:bg-[var(--bg-tertiary)] text-gray-700 dark:text-[var(--text-secondary)] rounded-xl text-sm font-medium hover:bg-gray-300 dark:hover:bg-[var(--bg-primary)] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => renameChat(newChatName)}
                disabled={!newChatName.trim()}
                className="flex-1 py-2.5 bg-cyan-500 text-white rounded-xl text-sm font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Participant Modal */}
      {showAddParticipantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] flex-shrink-0">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Добавить участника
              </h3>
              <button
                onClick={() => {
                  setShowAddParticipantModal(false);
                  setParticipantSearchQuery('');
                }}
                className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {/* Search users */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Поиск пользователей..."
                  value={participantSearchQuery}
                  onChange={(e) => setParticipantSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-[25px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-light)]"
                />
              </div>

              {/* Users list */}
              <div className="space-y-2">
                {(() => {
                  const availableUsers = users.filter(u => {
                    // Исключаем уже добавленных в группу
                    if (selectedChat?.participantIds?.includes(u.id)) return false;
                    // Исключаем самого себя
                    if (u.id === currentUser?.id) return false;
                    // Фильтруем по поиску
                    if (!participantSearchQuery) return true;
                    const query = participantSearchQuery.toLowerCase();
                    return (
                      u.name?.toLowerCase().includes(query) ||
                      u.username?.toLowerCase().includes(query) ||
                      u.email?.toLowerCase().includes(query)
                    );
                  });

                  if (availableUsers.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
                        <Users className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm">Нет доступных пользователей</p>
                      </div>
                    );
                  }

                  return availableUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => addParticipant(user.id)}
                      className="w-full flex items-center gap-3 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                    >
                      <Avatar
                        src={user.avatar}
                        name={user.name || user.username || 'Пользователь'}
                        size="sm"
                        type="user"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{user.name || user.username || 'Без имени'}</p>
                        {user.email && (
                          <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
                        )}
                      </div>
                      <Plus className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    </button>
                  ));
                })()}
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-[var(--border-color)] flex-shrink-0">
              <button
                onClick={() => {
                  setShowAddParticipantModal(false);
                  setParticipantSearchQuery('');
                }}
                className="flex-1 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:bg-[var(--bg-primary)]"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Picker Modal */}
      {showTaskPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Выбрать задачу
              </h3>
              <button
                onClick={() => setShowTaskPicker(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {(() => {
                // Фильтруем задачи - только те, где текущий пользователь участвует
                const allTasks = Array.isArray(tasks) ? tasks : [];
                const myTasks = allTasks.filter(task => {
                  if (!currentUser?.id) return false;
                  const userId = currentUser.id;
                  if (task.assignedById === userId) return true;
                  if (task.assignedToId === userId) return true;
                  if (task.assignedToIds?.includes(userId)) return true;
                  if (task.authorId === userId) return true;
                  return false;
                });
                
                console.log('DEBUG - Информация о задачах:', {
                  totalCount: allTasks.length,
                  filteredCount: myTasks.length,
                  currentUserId: currentUser?.id
                });
                
                return myTasks.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] text-center py-8">Нет доступных задач</p>
                ) : (
                  <div className="space-y-2">
                    {myTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => {
                        setAttachments(prev => [...prev, {
                          type: 'task',
                          name: task.title,
                          taskId: task.id
                        }]);
                        setShowTaskPicker(false);
                      }}
                      className="w-full text-left p-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {task.status && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                                {task.status}
                              </span>
                            )}
                            {task.priority && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                              </span>
                            )}
                          </div>
                        </div>
                        <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-2 p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowTaskPicker(false)}
                className="flex-1 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:bg-[var(--bg-primary)]"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Picker Modal */}
      {showEventPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                Выбрать событие
              </h3>
              <button
                onClick={() => setShowEventPicker(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {(() => {
                // Фильтруем события - только те где я участник или организатор
                const myEvents = Array.isArray(events) ? events.filter(event => {
                  if (!currentUser) return false;
                  // Я организатор
                  if (event.organizerId === currentUser.id) return true;
                  // Я в списке участников
                  if (Array.isArray(event.participants) && event.participants.some((p: any) => p.id === currentUser.id || p === currentUser.id)) return true;
                  return false;
                }) : [];

                // Сортируем по дате начала (ближайшие первыми)
                const sortedEvents = myEvents.sort((a, b) => {
                  const dateA = new Date(a.start || a.date);
                  const dateB = new Date(b.start || b.date);
                  return dateA.getTime() - dateB.getTime();
                });

                return sortedEvents.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] text-center py-8">Нет доступных мероприятий</p>
                ) : (
                  <div className="space-y-2">
                    {sortedEvents.map(event => (
                      <button
                        key={event.id}
                        onClick={() => {
                          setAttachments(prev => [...prev, {
                            type: 'event',
                            name: event.title,
                            eventId: event.id
                          }]);
                          setShowEventPicker(false);
                        }}
                        className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white truncate">{event.title}</h4>
                            {event.description && (
                              <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{event.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(event.start || event.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              </span>
                              {event.type && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                                  {event.type}
                                </span>
                              )}
                            </div>
                          </div>
                          <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-2 p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowEventPicker(false)}
                className="flex-1 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:bg-[var(--bg-primary)]"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Modal - Модалка выбора вложений */}
      {showAttachmentMenu && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowAttachmentMenu(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal */}
          <div 
            className="relative w-full sm:w-auto sm:min-w-[360px] max-w-md bg-gradient-to-br from-[#1e293b]/95 to-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-t-[25px] sm:rounded-[25px] shadow-2xl overflow-hidden pb-safe min-h-[50vh] sm:min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle для мобильных */}
            <div className="flex justify-center pt-3 pb-2 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-white/90">
                <Paperclip className="w-4 h-4 text-cyan-400" />
                Добавить вложение
              </h3>
              <button
                onClick={() => setShowAttachmentMenu(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
            
            {/* Drop Zone - только на десктопе */}
            <div 
              className="hidden md:block mx-4 mt-4 p-6 border-2 border-dashed border-white/10 rounded-[20px] hover:border-cyan-400/50 hover:bg-cyan-500/5 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-cyan-400', 'bg-cyan-500/10');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('border-cyan-400', 'bg-cyan-500/10');
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-cyan-400', 'bg-cyan-500/10');
                const files = Array.from(e.dataTransfer.files);
                if (files.length > 0) {
                  // Загружаем файлы на сервер
                  for (const file of files) {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    try {
                      const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                      });
                      
                      if (uploadRes.ok) {
                        const uploadData = await uploadRes.json();
                        setAttachments(prev => [...prev, {
                          type: file.type.startsWith('image/') ? 'image' : 'file',
                          name: file.name,
                          url: uploadData.url
                        }]);
                      }
                    } catch (error) {
                      console.error('Error uploading file:', error);
                    }
                  }
                  setShowAttachmentMenu(false);
                }
              }}
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                  <Upload className="w-7 h-7 text-[var(--text-muted)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">Перетащите файл сюда</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">или нажмите для выбора</p>
                </div>
              </div>
            </div>
            
            {/* Options grid */}
            <div className="p-4 grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setShowTaskPicker(true);
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Задача</span>
              </button>
              

              
              <button
                onClick={() => {
                  setShowEventPicker(true);
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Событие</span>
              </button>
              
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Image className="w-6 h-6 text-pink-400" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Фото</span>
              </button>
              
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <File className="w-6 h-6 text-orange-400" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Файл</span>
              </button>
              
              <button
                onClick={() => setShowAttachmentMenu(false)}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-gray-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <X className="w-6 h-6 text-gray-400" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Отмена</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Message Modal */}
      {showForwardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Переслать {isSelectionMode && selectedMessages.size > 0 ? `${selectedMessages.size} сообщени${selectedMessages.size === 1 ? 'е' : selectedMessages.size < 5 ? 'я' : 'й'}` : 'сообщение'}
              </h3>
              <button
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardingMessage(null);
                  setSelectedChatsForForward([]);
                }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              {/* Превью первого сообщения (если есть) */}
              {(() => {
                const firstMessage = isSelectionMode && selectedMessages.size > 0
                  ? messages.find(m => selectedMessages.has(m.id))
                  : forwardingMessage;
                
                return firstMessage && (
                  <div className="mb-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                    <p className="text-xs text-[var(--text-muted)] mb-1">
                      {isSelectionMode && selectedMessages.size > 1 
                        ? `Первое из ${selectedMessages.size} сообщений:`
                        : 'Сообщение:'}
                    </p>
                    <p className="text-sm text-[var(--text-primary)] line-clamp-3">{firstMessage.content}</p>
                  </div>
                );
              })()}
              
              <p className="text-sm text-[var(--text-secondary)] mb-3">Выберите чаты:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {chats
                  .filter(chat => {
                    // Фильтруем уведомления и текущий чат
                    if (chat.isNotificationsChat) return false;
                    // Если пересылаем одно сообщение, исключаем текущий чат (используем selectedChat)
                    if (forwardingMessage && selectedChat) return chat.id !== selectedChat.id;
                    // Если множественный выбор, исключаем текущий чат (если открыт)
                    if (isSelectionMode && selectedChat) return chat.id !== selectedChat.id;
                    return true;
                  })
                  .sort((a, b) => {
                    // Избранное всегда первым
                    if (a.isFavoritesChat) return -1;
                    if (b.isFavoritesChat) return 1;
                    return 0;
                  })
                  .map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        setSelectedChatsForForward(prev => 
                          prev.includes(chat.id) 
                            ? prev.filter(id => id !== chat.id)
                            : [...prev, chat.id]
                        );
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        selectedChatsForForward.includes(chat.id)
                          ? 'bg-cyan-500/20 border border-cyan-500/30'
                          : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)]'
                      }`}
                    >
                      {(() => {
                        const avatarData = getChatAvatarData(chat);
                        return (
                          <Avatar
                            src={avatarData.avatar}
                            name={avatarData.name}
                            type={avatarData.type}
                            size="lg"
                          />
                        );
                      })()}
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {getChatTitle(chat)}
                        </p>
                      </div>
                      {selectedChatsForForward.includes(chat.id) && (
                        <Check className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
              </div>
            </div>
            
            <div className="flex gap-2 p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardingMessage(null);
                  setSelectedChatsForForward([]);
                }}
                className="flex-1 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:bg-[var(--bg-primary)]"
              >
                Отмена
              </button>
              <button
                onClick={forwardMessage}
                disabled={selectedChatsForForward.length === 0}
                className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] rounded-lg text-sm text-white disabled:cursor-not-allowed"
              >
                Переслать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read By Modal */}
      {showReadByModal && readByMessage && selectedChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold">Информация о прочтении</h3>
              <button
                onClick={() => {
                  setShowReadByModal(false);
                  setReadByMessage(null);
                }}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {selectedChat.participantIds
                  .filter(id => id !== (readByMessage.authorId || 'system'))
                  .filter(participantId => {
                    const lastReadTime = selectedChat.readMessagesByUser?.[participantId];
                    return lastReadTime && new Date(lastReadTime) >= new Date(readByMessage.createdAt);
                  })
                  .map(participantId => {
                    const participant = users.find(u => u.id === participantId);
                    const lastReadTime = selectedChat.readMessagesByUser?.[participantId];
                    const hasRead = lastReadTime && new Date(lastReadTime) >= new Date(readByMessage.createdAt);
                    
                    return (
                      <div key={participantId} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-tertiary)]">
                        <Avatar
                          src={participant?.avatar}
                          name={participant?.name || participant?.username || 'Пользователь'}
                          size="lg"
                          type="user"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--text-primary)] truncate">
                            {participant?.name || participant?.username || 'Пользователь'}
                          </p>
                          {hasRead ? (
                            <p className="text-xs text-cyan-400">
                              Прочитано {new Date(lastReadTime!).toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          ) : (
                            <p className="text-xs text-[var(--text-muted)]">Не прочитано</p>
                          )}
                        </div>
                        {hasRead ? (
                          <Check className="w-5 h-5 text-cyan-400" />
                        ) : (
                          <Check className="w-5 h-5 text-[var(--text-muted)]" />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
            
            <div className="flex gap-2 p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => {
                  setShowReadByModal(false);
                  setReadByMessage(null);
                }}
                className="flex-1 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:bg-[var(--bg-primary)]"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Context Menu */}
      {showMessageContextMenu && contextMenuMessage && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMessageContextMenu(false)}
          />
          <div 
            className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl rounded-xl py-1 min-w-[200px]"
            style={{
              top: `${contextMenuPosition.top}px`,
              left: `${contextMenuPosition.left}px`,
            }}
          >
            {/* Ответить */}
            <button
              onClick={() => {
                setReplyToMessage(contextMenuMessage);
                setShowMessageContextMenu(false);
                messageInputRef.current?.focus();
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
            >
              <Reply className="w-4 h-4 text-blue-400" />
              Ответить
            </button>

            {/* Переслать */}
            <button
              onClick={() => {
                setForwardingMessage(contextMenuMessage);
                setShowForwardModal(true);
                setShowMessageContextMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
            >
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18m0 0l-6-6m6 6l-6 6" />
              </svg>
              Переслать
            </button>

            {/* Копировать текст */}
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(contextMenuMessage.content);
                  setShowMessageContextMenu(false);
                  alert('Текст скопирован в буфер обмена');
                } catch (error) {
                  console.error('Ошибка копирования:', error);
                  alert('Не удалось скопировать текст');
                }
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
            >
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Копировать текст
            </button>

            {/* Редактировать - только для своих сообщений */}
            {contextMenuMessage.authorId === currentUser?.id && (
              <button
                onClick={() => {
                  setEditingMessageId(contextMenuMessage.id);
                  setSavedMessageText(messageInputRef.current?.value || '');
                  if (messageInputRef.current) {
                    messageInputRef.current.value = contextMenuMessage.content;
                  }
                  setNewMessage(contextMenuMessage.content);
                  setShowMessageContextMenu(false);
                  messageInputRef.current?.focus();
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
              >
                <Edit3 className="w-4 h-4 text-purple-400" />
                Редактировать
              </button>
            )}

            {/* Превратить в задачу */}
            <button
              onClick={async () => {
                try {
                  const taskTitle = contextMenuMessage.content.length > 100 
                    ? contextMenuMessage.content.substring(0, 100) + '...' 
                    : contextMenuMessage.content;
                  
                  const response = await fetch('/api/todos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: taskTitle,
                      description: contextMenuMessage.content,
                      status: 'todo',
                      priority: 'medium',
                      assignedToId: currentUser?.id,
                      assignedById: currentUser?.id,
                    })
                  });

                  if (response.ok) {
                    const newTask = await response.json();
                    setShowMessageContextMenu(false);
                    // Перенаправляем на страницу задач
                    router.push(`/todos?task=${newTask.id}`);
                  } else {
                    throw new Error('Ошибка создания задачи');
                  }
                } catch (error) {
                  console.error('Ошибка создания задачи:', error);
                  alert('Не удалось создать задачу');
                }
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
            >
              <CheckSquare className="w-4 h-4 text-orange-400" />
              Превратить в задачу
            </button>

            {/* Создать событие */}
            <button
              onClick={async () => {
                setCreatingEventFromMessage(contextMenuMessage);
                setShowMessageContextMenu(false);
                // Загружаем календари пользователя
                try {
                  const username = localStorage.getItem('username');
                  const res = await fetch(`/api/calendar-lists?userId=${encodeURIComponent(username || '')}`);
                  if (res.ok) {
                    const data = await res.json();
                    setCalendarLists(Array.isArray(data) ? data : data.lists || []);
                  }
                } catch (error) {
                  console.error('Error loading calendars:', error);
                }
                setShowEventCalendarSelector(true);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
            >
              <CalendarPlus className="w-4 h-4 text-purple-400" />
              Сделать событием
            </button>
          </div>
        </>
      )}

      {/* Image Modal - Telegram-style image viewer with zoom */}
      {showImageModal && currentImageUrl && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center backdrop-blur-sm"
          onClick={() => {
            setShowImageModal(false);
            setImageZoom(1);
          }}
        >
          {/* Header с кнопками - десктоп версия */}
          <div className="hidden md:flex absolute top-4 left-4 right-4 items-center justify-between z-10">
            {/* Zoom controls - слева */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageZoom(prev => Math.max(0.5, prev - 0.25));
                }}
                className="w-10 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all"
                title="Уменьшить"
              >
                <span className="text-cyan-400 text-xl font-bold">−</span>
              </button>
              <div className="px-3 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-sm font-medium min-w-[60px]">
                {Math.round(imageZoom * 100)}%
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageZoom(prev => Math.min(3, prev + 0.25));
                }}
                className="w-10 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all"
                title="Увеличить"
              >
                <span className="text-cyan-400 text-xl font-bold">+</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageZoom(1);
                }}
                className="px-3 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all text-cyan-400 text-sm"
                title="Сбросить"
              >
                100%
              </button>
            </div>
            
            {/* Кнопки справа */}
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = currentImageUrl;
                  link.download = 'image.jpg';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="w-10 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all"
                title="Скачать"
              >
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setImageZoom(1);
                }}
                className="w-10 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all"
              >
                <X className="w-6 h-6 text-cyan-400" />
              </button>
            </div>
          </div>

          {/* Мобильная версия - кнопки НАД хедером (z-10 выше) */}
          <div className="md:hidden flex flex-col gap-2 absolute top-2 right-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const link = document.createElement('a');
                link.href = currentImageUrl;
                link.download = 'image.jpg';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all backdrop-blur-sm"
              title="Скачать"
            >
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <button
              onClick={() => {
                setShowImageModal(false);
                setImageZoom(1);
              }}
              className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all backdrop-blur-sm"
            >
              <X className="w-6 h-6 text-cyan-400" />
            </button>
          </div>

          {/* Мобильная версия - zoom controls внизу */}
          <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageZoom(prev => Math.max(0.5, prev - 0.25));
              }}
              className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all backdrop-blur-sm"
              title="Уменьшить"
            >
              <span className="text-cyan-400 text-xl font-bold">−</span>
            </button>
            <div className="px-3 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-sm font-medium min-w-[60px] backdrop-blur-sm">
              {Math.round(imageZoom * 100)}%
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageZoom(prev => Math.min(3, prev + 0.25));
              }}
              className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all backdrop-blur-sm"
              title="Увеличить"
            >
              <span className="text-cyan-400 text-xl font-bold">+</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageZoom(1);
              }}
              className="px-3 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all text-cyan-400 text-sm backdrop-blur-sm"
              title="Сбросить"
            >
              100%
            </button>
          </div>
          
          <div className="overflow-auto max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <img 
              src={currentImageUrl}
              alt="Full size"
              className="object-contain transition-transform duration-200"
              style={{ 
                transform: `scale(${imageZoom})`,
                cursor: imageZoom > 1 ? 'move' : 'default',
                maxWidth: '90vw',
                maxHeight: '90vh'
              }}
              onWheel={(e) => {
                e.stopPropagation();
                if (e.deltaY < 0) {
                  setImageZoom(prev => Math.min(3, prev + 0.1));
                } else {
                  setImageZoom(prev => Math.max(0.5, prev - 0.1));
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Modal выбора календаря для создания события */}
      {showEventCalendarSelector && creatingEventFromMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100]">
          <div className="bg-white dark:bg-gradient-to-b dark:from-[#1a1a1a] dark:to-[#151515] border-0 sm:border border-gray-200 dark:border-white/10 rounded-t-2xl sm:rounded-xl w-full sm:w-96 max-h-[95vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-white/10">
              <h3 className="font-medium text-gray-900 dark:text-white">Выберите календарь</h3>
              <button
                onClick={() => {
                  setShowEventCalendarSelector(false);
                  setCreatingEventFromMessage(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-white/60" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-2 overflow-y-auto">
              {/* Календари пользователя */}
              {calendarLists.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-white/50">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Нет доступных календарей</p>
                  <p className="text-xs mt-1">Создайте календарь в настройках</p>
                </div>
              ) : (
                calendarLists.map(list => (
                <button
                  key={list.id}
                  onClick={async () => {
                    try {
                      const eventTitle = creatingEventFromMessage.content.length > 100
                        ? creatingEventFromMessage.content.substring(0, 100) + '...'
                        : creatingEventFromMessage.content;
                      
                      const res = await fetch('/api/events', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: eventTitle,
                          description: creatingEventFromMessage.content,
                          type: 'other',
                          dateType: 'single',
                          startDate: new Date().toISOString().split('T')[0],
                          color: list.color,
                          createdBy: localStorage.getItem('username') || 'guest'
                        })
                      });
                      
                      if (res.ok) {
                        setShowEventCalendarSelector(false);
                        setCreatingEventFromMessage(null);
                        router.push('/events');
                      } else {
                        throw new Error('Ошибка создания события');
                      }
                    } catch (error) {
                      console.error('Error creating event:', error);
                      alert('Не удалось создать событие');
                    }
                  }}
                  className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-3 transition-colors"
                  style={{ borderLeft: `3px solid ${list.color || '#3B82F6'}` }}
                >
                  <Calendar className="w-5 h-5 text-gray-400 dark:text-white/60" />
                  <span className="text-gray-900 dark:text-white font-medium">{list.name}</span>
                </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Context Menu */}
      {showChatContextMenu && contextMenuChat && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowChatContextMenu(false)}
          />
          <div 
            className="fixed z-50 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl rounded-xl py-1 min-w-[200px]"
            style={{
              top: `${chatContextMenuPosition.top}px`,
              left: `${chatContextMenuPosition.left}px`,
            }}
          >
            {/* Закрепить/Открепить */}
            <button
              onClick={() => {
                togglePinChat(contextMenuChat.id);
                setShowChatContextMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-3 text-[var(--text-primary)]"
            >
              {contextMenuChat.pinnedByUser?.[currentUser?.id || ''] ? (
                <>
                  <PinOff className="w-4 h-4 text-cyan-400" />
                  Открепить
                </>
              ) : (
                <>
                  <Pin className="w-4 h-4 text-cyan-400" />
                  Закрепить
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
