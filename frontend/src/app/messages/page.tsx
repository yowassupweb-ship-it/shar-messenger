'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send, ArrowLeft, Users, Search, Plus, MoreVertical, Check, Edit3, Trash2, Reply, Pin, PinOff, X, Paperclip, FileText, Link as LinkIcon, Calendar, Image, File, Info, Grid, List, Play, Music, Download, CheckSquare, Mail, Phone, Upload, Smile, Star, Bell } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  role: 'admin' | 'user';
  lastSeen?: string;
  isOnline?: boolean;
  shortId?: string;
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
      <div className={`mt-2 block p-3 rounded-lg border ${isMyMessage ? 'bg-blue-600/20 border-blue-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'} animate-pulse`}>
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
        className={`mt-2 block p-3 rounded-lg border ${isMyMessage ? 'bg-blue-600/20 border-blue-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'} hover:opacity-80 transition-opacity`}
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
      className={`mt-2 block rounded-lg border overflow-hidden ${isMyMessage ? 'bg-blue-600/20 border-blue-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'} hover:opacity-90 transition-opacity`}
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

export default function MessagesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
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
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [chatInfoTab, setChatInfoTab] = useState<'profile' | 'tasks' | 'media' | 'files' | 'links' | 'participants'>('profile');
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [participantSearchQuery, setParticipantSearchQuery] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
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
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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

  // Функция выбора чата с обновлением URL и localStorage
  const selectChat = (chat: Chat | null) => {
    // Сохраняем черновик текущего чата
    if (selectedChat && newMessage.trim()) {
      setChatDrafts(prev => ({
        ...prev,
        [selectedChat.id]: newMessage
      }));
    } else if (selectedChat && !newMessage.trim()) {
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
    } else {
      setNewMessage('');
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
  };

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadChats();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id, false);
      
      // Polling для обновления сообщений каждые 3 секунды
      const chatId = selectedChat.id;
      const interval = setInterval(() => {
        loadMessages(chatId, true);
      }, 3000);
      
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

  useEffect(() => {
    if (showLinkPicker) {
      loadLinks();
    }
  }, [showLinkPicker]);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
            localStorage.setItem('myAccount', JSON.stringify({ id: currentUser.id, name: currentUser.name }));
            setCurrentUser(currentUser);
            return;
          } else {
            const createRes = await fetch('/api/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                name: username,
                email: `${username}@local.dev`,
                password: 'default123',
                role: 'user'
              })
            });
            
            if (createRes.ok) {
              const newUser = await createRes.json();
              localStorage.setItem('myAccount', JSON.stringify({ id: newUser.id, name: newUser.name }));
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
                  localStorage.setItem('myAccount', JSON.stringify({ id: existingUser.id, name: existingUser.name }));
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
              localStorage.setItem('myAccount', JSON.stringify({ id: existingUser.id, name: existingUser.name }));
              setCurrentUser(existingUser);
              return;
            }
          }
          
          const createRes = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: username,
              email: `${username}@local.dev`,
              password: 'default123',
              role: 'user'
            })
          });
          
          if (createRes.ok) {
            const newUser = await createRes.json();
            localStorage.setItem('myAccount', JSON.stringify({ id: newUser.id, name: newUser.name }));
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
      const res = await fetch(`/api/todos?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        // API возвращает объект с полем todos
        const tasksArray = data.todos || [];
        setTasks(tasksArray);
        console.log('Loaded tasks for user:', currentUser.id, tasksArray);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    }
  };

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/events');
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

  const loadLinks = async () => {
    if (!currentUser) return;
    
    try {
      const res = await fetch(`/api/links?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        const linksArray = data.links || [];
        setLinks(linksArray);
        console.log('Loaded links for user:', currentUser.id, linksArray);
      }
    } catch (error) {
      console.error('Error loading links:', error);
      setLinks([]);
    }
  };

  const loadChats = async () => {
    if (!currentUser) return;
    
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
        
        setChats(data);
        
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
    }
  };

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

  const loadMessages = async (chatId: string, isPolling: boolean = false) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        
        // Скролл к последнему сообщению (только при первой загрузке)
        if (!isPolling) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
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
              // Обновляем список чатов для badge
              setChats(allChats);
            }
          }
        } else if (!isPolling) {
          // Обновляем счетчики непрочитанных при первой загрузке
          loadChats();
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createChat = async () => {
    if (!currentUser || selectedUsers.length === 0) return;

    const participantIds = [...selectedUsers, currentUser.id];
    
    // Проверяем, есть ли уже личный чат с этим пользователем
    if (!isGroupChat && selectedUsers.length === 1) {
      const existingChat = chats.find(chat => 
        !chat.isGroup && 
        !chat.isNotificationsChat && 
        !chat.isFavoritesChat &&
        chat.participantIds.length === 2 &&
        chat.participantIds.includes(selectedUsers[0]) &&
        chat.participantIds.includes(currentUser.id)
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

  const sendMessage = async () => {
    // Проверяем: должен быть либо текст, либо вложения
    if ((!newMessage.trim() && attachments.length === 0) || !selectedChat || !currentUser || !selectedChat.id) return;

    try {
      const res = await fetch(`/api/chats/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentUser.id,
          content: newMessage,
          mentions: [],
          replyToId: replyToMessage?.id,
          attachments: attachments.length > 0 ? attachments : undefined
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        setReplyToMessage(null);
        setAttachments([]);
        
        // Удаляем черновик после отправки
        if (selectedChat) {
          setChatDrafts(prev => {
            const newDrafts = { ...prev };
            delete newDrafts[selectedChat.id];
            return newDrafts;
          });
        }
        
        loadChats();
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const updateMessage = async (messageId: string, content: string) => {
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
  };

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
    try {
      const res = await fetch(`/api/chats/${chatId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          isPinned: newPinState
        })
      });

      if (res.ok) {
        loadChats();
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
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

  // Переслать сообщение
  const forwardMessage = async () => {
    if (!forwardingMessage || selectedChatsForForward.length === 0) return;
    
    try {
      console.log('Forwarding message:', forwardingMessage.id, 'to chats:', selectedChatsForForward);
      
      const res = await fetch(
        `/api/chats/${forwardingMessage.chatId}/messages/${forwardingMessage.id}/forward`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetChatIds: selectedChatsForForward })
        }
      );
      
      console.log('Forward response status:', res.status);
      const data = await res.json();
      console.log('Forward response data:', data);
      
      if (res.ok) {
        setShowForwardModal(false);
        setForwardingMessage(null);
        setSelectedChatsForForward([]);
        loadChats();
        
        // Если мы пересылаем в текущий открытый чат, обновляем сообщения
        if (selectedChat && selectedChatsForForward.includes(selectedChat.id)) {
          loadMessages(selectedChat.id);
        }
      } else {
        alert('Ошибка при пересылке сообщения: ' + (data.detail || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Error forwarding message:', error);
      alert('Ошибка при пересылке сообщения');
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

  const getChatTitle = (chat: Chat): string => {
    if (chat.isFavoritesChat) return 'Избранное';
    if (chat.title) return chat.title;
    
    if (!currentUser) return 'Чат';
    
    const otherParticipants = users.filter(u => 
      chat.participantIds.includes(u.id) && u.id !== currentUser.id
    );
    
    if (otherParticipants.length === 0) return 'Избранное';
    return otherParticipants.map(u => u.name || u.username || 'Пользователь').join(', ');
  };

  const getChatAvatar = (chat: Chat): string => {
    if (chat.isFavoritesChat) return 'F';
    if (chat.isSystemChat || chat.isNotificationsChat) return 'N';
    if (chat.isGroup) return 'Г'; // Для группы показываем 'Г'
    
    if (!currentUser) return 'C';
    
    const otherParticipants = users.filter(u => 
      chat.participantIds.includes(u.id) && u.id !== currentUser.id
    );
    
    if (otherParticipants.length === 0) return 'F';
    return otherParticipants[0].name?.[0] || otherParticipants[0].username?.[0] || 'U';
  };

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

  // Фильтрация чатов по поисковому запросу
  const filterChatsBySearch = (chatList: Chat[]) => {
    if (!searchQuery) return chatList;
    const query = searchQuery.toLowerCase();
    return chatList.filter(chat => {
      // Поиск по названию чата
      if (chat.title?.toLowerCase().includes(query)) return true;
      // Поиск по именам участников
      const participants = users.filter(u => chat.participantIds.includes(u.id) && u.id !== currentUser?.id);
      return participants.some(p => 
        p.name?.toLowerCase().includes(query) || 
        p.username?.toLowerCase().includes(query)
      );
    });
  };

  // Разделяем чаты на закрепленные и обычные
  const allPinnedChats = chats.filter(chat => chat.pinnedByUser?.[currentUser?.id || '']);
  const allUnpinnedChats = chats.filter(chat => !chat.pinnedByUser?.[currentUser?.id || '']);
  
  // Применяем поиск
  const pinnedChats = filterChatsBySearch(allPinnedChats);
  const unpinnedChats = filterChatsBySearch(allUnpinnedChats);

  return (
    <div className="h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)] flex overflow-hidden rounded-[25px]">
      {/* Левая панель - список чатов */}
      <div className={`w-full ${selectedChat ? 'hidden md:block' : 'block'} md:w-80 border-r border-[var(--border-color)] flex flex-col h-full overflow-hidden`}>
        {/* Header */}
        <div className="h-12 backdrop-blur-xl bg-[var(--bg-secondary)]/60 border-b border-white/10 flex items-center px-3 gap-2 flex-shrink-0">
          <Link
            href="/account?tab=messages"
            className="no-mobile-scale flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-glass)] text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-all md:hidden border border-[var(--border-glass)] backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          </Link>
          <span className="font-medium text-sm">Сообщения</span>
          {currentUser?.isOnline && (
            <span className="text-[10px] text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
              в сети
            </span>
          )}
          <button
            onClick={() => setShowNewChatModal(true)}
            className="no-mobile-scale ml-auto flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] transition-all border border-[var(--border-glass)] backdrop-blur-sm"
            title="Новый чат"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[var(--border-color)] flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Поиск чатов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-[25px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-light)]"
            />
          </div>
        </div>

        {/* Chats list */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-20">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] px-4 py-8">
              <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm text-center">Нет чатов</p>
              <p className="text-xs mt-1 text-center">Создайте новый чат чтобы начать общение</p>
            </div>
          ) : (
            <>
              {/* Закрепленные чаты */}
              {pinnedChats.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">
                    Закрепленные
                  </div>
                  <div className="divide-y divide-[var(--border-color)]">
                    {pinnedChats.map(chat => (
                      <div
                        key={chat.id}
                        className={`relative group ${
                          selectedChat?.id === chat.id ? 'bg-[var(--bg-tertiary)]' : ''
                        }`}
                      >
                        <button
                          onClick={() => selectChat(chat)}
                          className="w-full p-3 hover:bg-[var(--bg-tertiary)] transition-all text-left pr-10"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                              chat.isFavoritesChat
                                ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                                : chat.isSystemChat || chat.isNotificationsChat
                                ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                                : 'bg-gradient-to-br from-cyan-500 to-blue-600'
                            }`}>
                              {chat.isFavoritesChat || chat.isSystemChat || chat.isNotificationsChat ? getChatAvatar(chat) : getChatAvatar(chat).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  {/* Иконка закрепления только для обычных чатов, не для системных */}
                                  {!chat.isFavoritesChat && !chat.isSystemChat && !chat.isNotificationsChat && (
                                    <Pin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                                  )}
                                  {/* Иконка группового чата */}
                                  {chat.isGroup && (
                                    <Users className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                  )}
                                  <h3 className="font-medium text-sm truncate">{getChatTitle(chat)}</h3>
                                </div>
                                {chat.lastMessage && (
                                  <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap ml-auto">
                                    {new Date(chat.lastMessage.createdAt).toLocaleTimeString('ru-RU', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                )}
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
                                  {(chat.unreadCount || 0) > 0 && (
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
                                      {chat.unreadCount}
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </button>
                        {/* Pin/Unpin button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinChat(chat.id);
                          }}
                          className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-[var(--bg-tertiary)] rounded z-10"
                          title="Открепить"
                        >
                          <PinOff className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" />
                        </button>
                      </div>
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
                  <div className="divide-y divide-[var(--border-color)]">
                    {unpinnedChats.map(chat => (
                      <div
                        key={chat.id}
                        className={`relative group ${
                          selectedChat?.id === chat.id ? 'bg-[var(--bg-tertiary)]' : ''
                        }`}
                      >
                        <button
                          onClick={() => selectChat(chat)}
                          className="w-full p-3 hover:bg-[var(--bg-tertiary)] transition-all text-left pr-10"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                              chat.isFavoritesChat
                                ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                                : chat.isSystemChat || chat.isNotificationsChat
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                : 'bg-gradient-to-br from-cyan-500 to-blue-600'
                            }`}>
                              {chat.isFavoritesChat ? (
                                <Star className="w-5 h-5 text-white fill-white" />
                              ) : chat.isSystemChat || chat.isNotificationsChat ? (
                                <Bell className="w-5 h-5 text-white fill-white" />
                              ) : (
                                getChatAvatar(chat).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  {/* Иконка группового чата */}
                                  {chat.isGroup && (
                                    <Users className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                  )}
                                  <h3 className="font-medium text-sm truncate">{getChatTitle(chat)}</h3>
                                </div>
                                {chat.lastMessage && (
                                  <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap ml-auto">
                                    {new Date(chat.lastMessage.createdAt).toLocaleTimeString('ru-RU', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                )}
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
                                  {(chat.unreadCount || 0) > 0 && (
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
                                      {chat.unreadCount}
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </button>
                        {/* Pin button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinChat(chat.id);
                          }}
                          className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-[var(--bg-tertiary)] rounded z-10"
                          title="Закрепить"
                        >
                          <Pin className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" />
                        </button>
                      </div>
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
        <div className={`flex-1 flex overflow-hidden ${selectedChat ? 'block' : 'hidden md:block'}`}>
          {/* Контейнер чата */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Chat header */}
          <div className="fixed md:sticky top-0 left-0 right-0 md:left-auto md:right-auto z-30 md:z-20 h-12 backdrop-blur-xl bg-[var(--bg-secondary)]/95 border-b border-white/10 flex items-center px-3 gap-2 flex-shrink-0">
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
                  {/* Ответить - только если выбрано 1 сообщение */}
                  {selectedMessages.size === 1 && (
                    <button
                      onClick={() => {
                        const firstSelectedMessage = messages.find(m => selectedMessages.has(m.id));
                        if (firstSelectedMessage) {
                          setReplyToMessage(firstSelectedMessage);
                          setIsSelectionMode(false);
                          setSelectedMessages(new Set());
                        }
                      }}
                      className="w-8 h-8 rounded-full backdrop-blur-xl bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 flex items-center justify-center transition-all group/btn"
                      title="Ответить"
                    >
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                  )}
                  {/* Переслать */}
                  <button
                    onClick={() => {
                      const firstSelectedMessage = messages.find(m => selectedMessages.has(m.id));
                      if (firstSelectedMessage) {
                        setForwardingMessage(firstSelectedMessage);
                        setShowForwardModal(true);
                        setIsSelectionMode(false);
                        setSelectedMessages(new Set());
                      }
                    }}
                    className="w-8 h-8 rounded-full backdrop-blur-xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 flex items-center justify-center transition-all group/btn"
                    title="Переслать"
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
                    const selectedMessagesArray = messages.filter(m => selectedMessages.has(m.id));
                    const allAreOwn = selectedMessagesArray.every(m => m.authorId === currentUser?.id);
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
              className="no-mobile-scale flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-glass)] text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-all md:hidden border border-[var(--border-glass)] backdrop-blur-sm"
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              selectedChat.isFavoritesChat
                ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                : selectedChat.isSystemChat || selectedChat.isNotificationsChat
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                : 'bg-gradient-to-br from-cyan-500 to-blue-600'
            }`}>
              {selectedChat.isFavoritesChat ? (
                <Star className="w-4 h-4 text-white fill-white" />
              ) : selectedChat.isSystemChat || selectedChat.isNotificationsChat ? (
                <Bell className="w-4 h-4 text-white fill-white" />
              ) : (
                getChatAvatar(selectedChat).toUpperCase()
              )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h2 className="font-medium text-sm truncate">{getChatTitle(selectedChat)}</h2>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {selectedChat.isFavoritesChat ? 'Ваши избранные сообщения' : selectedChat.isSystemChat || selectedChat.isNotificationsChat ? 'Системные уведомления' : selectedChat.isGroup ? `${selectedChat.participantIds.length} участник${selectedChat.participantIds.length === 1 ? '' : selectedChat.participantIds.length < 5 ? 'а' : 'ов'}` : (() => {
                    // Получаем собеседника
                    const otherParticipantId = selectedChat.participantIds.find(id => id !== currentUser?.id);
                    const otherUser = otherParticipantId ? users.find(u => u.id === otherParticipantId) : null;
                    if (!otherUser) return 'не в сети';
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
              </div>
            </button>
            {/* Кнопка меню чата */}
            <div className="relative">
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
          
          {/* Message Search Bar */}
          {showMessageSearch && (
            <div className="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
              <div className="relative max-w-3xl mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Поиск по чату..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  autoFocus
                  className="pl-9 pr-10 py-2 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-[20px] w-full text-sm focus:outline-none focus:border-[var(--border-light)] transition-colors"
                />
                <button
                  onClick={() => { setShowMessageSearch(false); setMessageSearchQuery(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-white/10 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 pt-16 md:pt-4 pb-20 md:pb-40">
            <div className="max-w-3xl mx-auto space-y-3 min-h-full flex flex-col">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)]">
                  <MessageCircle className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-base font-medium">Нет сообщений</p>
                  <p className="text-sm mt-1 opacity-70">Начните общение</p>
                </div>
              ) : (
                messages.filter(message => {
                  if (!messageSearchQuery.trim()) return true;
                  return message.content.toLowerCase().includes(messageSearchQuery.toLowerCase());
                }).map((message) => {
                const isMyMessage = message.authorId === currentUser?.id;
                const isEditing = editingMessageId === message.id;
                const replyTo = message.replyToId 
                  ? messages.find(m => m.id === message.replyToId)
                  : null;

                return (
                  <div
                    key={message.id}
                    ref={(el) => { messageRefs.current[message.id] = el; }}
                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} group transition-all duration-300 ${
                      selectedMessages.has(message.id) ? 'message-selected' : ''
                    } ${isMyMessage ? 'message-animation-right' : 'message-animation-left'}`}
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
                        setIsSelectionMode(true);
                        setSelectedMessages(new Set([message.id]));
                      }
                    }}
                  >
                    {/* Checkbox для выделения */}
                    {(isSelectionMode || selectedMessages.has(message.id)) && !message.isDeleted && (
                      <div className={`absolute ${isMyMessage ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 z-10`}>
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
                    <div 
                      className={`max-w-[80%] relative ${isMyMessage ? 'order-2' : ''} ${message.linkedChatId && !isSelectionMode ? 'cursor-pointer' : ''}`}
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            scrollToMessage(replyTo.id);
                          }}
                          className={`text-[10px] text-[var(--text-muted)] mb-1 px-3 hover:text-blue-400 transition-colors ${isMyMessage ? 'text-right w-full' : 'text-left'}`}
                        >
                          <Reply className="w-3 h-3 inline mr-1" />
                          Ответ на: {replyTo.content.substring(0, 50)}...
                        </button>
                      )}
                      
                      {(() => {
                        // Определяем тип контента: только эмоджи или текст
                        const emojiOnlyRegex = /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\s]+$/u;
                        const isOnlyEmojis = emojiOnlyRegex.test(message.content.trim());
                        const emojiCount = isOnlyEmojis ? (message.content.trim().match(/[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu) || []).length : 0;
                        
                        const isLargeEmoji = emojiCount === 1;
                        const isMediumEmoji = emojiCount >= 2 && emojiCount <= 5;
                        const hasBackground = !isOnlyEmojis;
                        
                        return (
                          <div
                            className={`${
                              hasBackground
                                ? `rounded-xl px-3 py-2 relative min-w-[144px] ${
                                    isMyMessage
                                      ? 'bg-blue-500/20 rounded-br-sm'
                                      : message.isSystemMessage
                                        ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-bl-sm hover:border-blue-500/40 transition-colors'
                                        : 'bg-[var(--bg-tertiary)] rounded-bl-sm'
                                  } ${message.isDeleted ? 'opacity-60' : ''}`
                                : ''
                            }`}
                          >
                            {!isMyMessage && hasBackground && (
                              <p className={`text-[10px] font-medium mb-0.5 ${message.isSystemMessage ? 'text-purple-400' : 'text-blue-400'} flex items-center gap-1.5`}>
                                <span>{message.authorName}</span>
                                {selectedChat?.isGroup && message.authorId === selectedChat.creatorId && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[9px]">
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
                                  <p className="text-5xl md:text-7xl my-1 emoji-content">
                                    {message.content}
                                  </p>
                                ) : isMediumEmoji ? (
                                  <p className="text-3xl md:text-4xl my-1 emoji-content">
                                    {message.content}
                                  </p>
                                ) : (
                                  <p
                                    className={`text-xs text-[var(--text-primary)] whitespace-pre-wrap break-words ${isEditing ? 'bg-blue-500/10 -mx-2 -my-1 px-2 py-1 rounded border border-blue-400/30' : ''}`}
                                    dangerouslySetInnerHTML={{
                                      __html: message.content
                                        .replace(
                                          /(https?:\/\/[^\s<>"']+)/gi,
                                          '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>'
                                        )
                                        .replace(
                                          /@([a-zA-Zа-яА-ЯёЁ0-9_]+(?:\s+[a-zA-Zа-яА-ЯёЁ0-9_]+)?)/g,
                                          '<span class="text-blue-400 font-medium">@$1</span>'
                                        )
                                    }}
                                  />
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
                            
                            {/* Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {message.attachments.map((att, idx) => (
                                  <div key={idx} className={`rounded-lg overflow-hidden ${isMyMessage ? 'bg-blue-600/20' : 'bg-[var(--bg-secondary)]'}`}>
                                    {att.type === 'task' && (
                                      <div className="p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-cyan-400" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{att.name}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">Задача</p>
                                          </div>
                                        </div>
                                        <button 
                                          onClick={() => {
                                            const taskId = att.taskId || att.id;
                                            if (taskId) {
                                              window.location.href = `/todos?task=${taskId}`;
                                            }
                                          }}
                                          className="w-full py-1.5 text-[10px] font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-md transition-colors cursor-pointer"
                                        >
                                          Открыть задачу
                                        </button>
                                      </div>
                                    )}
                                    {att.type === 'event' && (
                                      <div className="p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                                            <Calendar className="w-4 h-4 text-green-400" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{att.name}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">Событие</p>
                                          </div>
                                        </div>
                                        <button 
                                          onClick={() => {
                                            if (att.id) {
                                              window.location.href = `/account?tab=calendar&event=${att.id}`;
                                            }
                                          }}
                                          className="w-full py-1.5 text-[10px] font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-md transition-colors cursor-pointer"
                                        >
                                          Открыть событие
                                        </button>
                                      </div>
                                    )}
                                    {att.type === 'link' && (
                                      <div className="p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                            <LinkIcon className="w-4 h-4 text-purple-400" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{att.name}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">Ссылка</p>
                                          </div>
                                        </div>
                                        <button 
                                          onClick={() => {
                                            if (att.url) {
                                              window.open(att.url, '_blank');
                                            }
                                          }}
                                          className="w-full py-1.5 text-[10px] font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-md transition-colors cursor-pointer"
                                        >
                                          Перейти по ссылке
                                        </button>
                                      </div>
                                    )}
                                    {att.type === 'image' && (
                                      <div className="relative">
                                        {att.url ? (
                                          <>
                                            <img 
                                              src={att.url}
                                              alt={att.name}
                                              className="w-full max-w-sm rounded-lg object-cover max-h-80 cursor-pointer hover:opacity-90 transition-opacity"
                                              onClick={() => {
                                                setCurrentImageUrl(att.url);
                                                setShowImageModal(true);
                                              }}
                                            />
                                          </>
                                        ) : (
                                          <div className="p-2">
                                            <div className="flex items-center gap-2 p-2">
                                              <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                                                <Image className="w-4 h-4 text-pink-400" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{att.name}</p>
                                                <p className="text-[10px] text-[var(--text-muted)]">Изображение</p>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {att.type === 'file' && (
                                      <div className="p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                            <File className="w-4 h-4 text-orange-400" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{att.name}</p>
                                            <p className="text-[10px] text-[var(--text-muted)]">Файл</p>
                                          </div>
                                        </div>
                                        <button className="w-full py-1.5 text-[10px] font-medium text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 rounded-md transition-colors">
                                          Скачать файл
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[9px] text-[var(--text-muted)]">
                                {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                {message.isEdited && <span className="ml-1">(изм.)</span>}
                              </span>
                              {/* Read status checkmarks - for all messages */}
                              {!message.isDeleted && selectedChat?.isGroup && (
                                <button
                                  onClick={() => {
                                    setReadByMessage(message);
                                    setShowReadByModal(true);
                                  }}
                                  className="flex items-center hover:opacity-70 transition-opacity cursor-pointer"
                                  title="Посмотреть кто прочитал"
                                >
                                  {(() => {
                                    // Проверяем прочитали ли все участники (кроме автора)
                                    const otherParticipants = selectedChat?.participantIds.filter(id => id !== message.authorId) || [];
                                    const readByAll = otherParticipants.length > 0 && otherParticipants.every(participantId => {
                                      const lastReadTime = selectedChat?.readMessagesByUser?.[participantId];
                                      if (!lastReadTime) return false;
                                      return new Date(lastReadTime) >= new Date(message.createdAt);
                                    });
                                    
                                    if (readByAll) {
                                      // Две синие галочки - прочитано
                                      return (
                                        <span className="flex -space-x-2">
                                          <Check className="w-3 h-3 text-blue-400" />
                                          <Check className="w-3 h-3 text-blue-400" />
                                        </span>
                                      );
                                    } else {
                                      // Одна серая галочка - отправлено
                                      return <Check className="w-3 h-3 text-[var(--text-muted)]" />;
                                    }
                                  })()}
                                </button>
                              )}
                              {!message.isDeleted && !selectedChat?.isGroup && (
                                <span className="flex items-center">
                                  {(() => {
                                    // Проверяем прочитали ли все участники (кроме автора)
                                    const otherParticipants = selectedChat?.participantIds.filter(id => id !== message.authorId) || [];
                                    const readByAll = otherParticipants.length > 0 && otherParticipants.every(participantId => {
                                      const lastReadTime = selectedChat?.readMessagesByUser?.[participantId];
                                      if (!lastReadTime) return false;
                                      return new Date(lastReadTime) >= new Date(message.createdAt);
                                    });
                                    
                                    if (readByAll) {
                                      // Две синие галочки - прочитано
                                      return (
                                        <span className="flex -space-x-2">
                                          <Check className="w-3 h-3 text-blue-400" />
                                          <Check className="w-3 h-3 text-blue-400" />
                                        </span>
                                      );
                                    } else {
                                      // Одна серая галочка - отправлено
                                      return <Check className="w-3 h-3 text-[var(--text-muted)]" />;
                                    }
                                  })()}
                                </span>
                              )}
                            </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message input */}
          <div 
            className={`fixed md:absolute bottom-0 left-0 right-0 md:bottom-[56px] px-1 md:px-3 py-1 pb-[env(safe-area-inset-bottom,0px)] md:py-2 z-30 md:z-auto bg-[var(--bg-primary)] md:bg-transparent transition-all duration-300 ${
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
              <div className="mb-2 flex flex-wrap gap-2 max-w-3xl mx-auto">
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
              <div className="flex justify-center items-center w-full max-w-3xl mx-auto">
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
            <div className="flex gap-1.5 md:gap-2 items-end max-w-3xl mx-auto relative">
              {/* Emoji button - только на десктопе */}
              {!selectedChat?.isNotificationsChat && (
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="hidden md:flex w-11 h-11 rounded-full backdrop-blur-xl bg-[var(--bg-secondary)]/60 border border-white/10 hover:border-white/20 hover:bg-[var(--bg-tertiary)]/90 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex-shrink-0 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4),0_0_15px_-5px_rgba(0,0,0,0.3)]"
                >
                  <Smile className="w-4 h-4" />
                </button>
                
                {/* Emoji Picker Dropdown */}
                {showEmojiPicker && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowEmojiPicker(false)}
                    />
                    <div className="absolute bottom-full left-0 mb-2 bg-[#0f1117] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 p-2 w-80">
                      <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
                        {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '🦶', '🦵', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🔀', '🔁', '🔂', '▶️', '⏩', '⏭️', '⏯️', '◀️', '⏪', '⏮️', '🔼', '⏫', '🔽', '⏬', '⏸️', '⏹️', '⏺️', '⏏️', '🎦', '🔅', '🔆', '📶', '📳', '📴', '♀️', '♂️', '⚧️', '✖️', '➕', '➖', '➗', '♾️', '‼️', '⁉️', '❓', '❔', '❕', '❗', '〰️', '💱', '💲', '⚕️', '♻️', '⚜️', '🔱', '📛', '🔰', '⭐', '🌟', '✨', '⚡', '💥', '🔥', '💫', '💦', '💨', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️', '🌫️', '☂️', '☔', '💧', '💦', '🌊'].map((emoji, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setNewMessage(prev => prev + emoji);
                            }}
                            className="text-xl p-1.5 rounded-md hover:bg-white/10 transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              )}
              
              {/* Attachment button */}
              {!selectedChat?.isNotificationsChat && (
              <button
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="w-11 h-11 rounded-full backdrop-blur-xl bg-[var(--bg-secondary)]/60 border border-white/10 hover:border-white/20 hover:bg-[var(--bg-tertiary)]/90 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex-shrink-0 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4),0_0_15px_-5px_rgba(0,0,0,0.3)]"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
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
                  // Сбрасываем input чтобы можно было загрузить тот же файл снова
                  e.target.value = '';
                }}
              />
              
              {/* Input container with reply/edit indicator */}
              <div className="flex-1 min-w-0 flex flex-col">
                {/* Edit indicator над инпутом */}
                {editingMessageId && (
                  <div className="mb-1 px-3 py-1.5 backdrop-blur-xl bg-blue-500/20 border border-blue-400/30 rounded-t-[18px] flex items-center justify-between">
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
                  <div className="mb-1 px-3 py-1.5 backdrop-blur-xl bg-[var(--bg-secondary)]/80 border border-white/10 rounded-t-[18px] flex items-center justify-between">
                    <button
                      onClick={() => scrollToMessage(replyToMessage.id)}
                      className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                    >
                      <Reply className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-[10px] text-blue-400 font-medium">{replyToMessage.authorName}</p>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          {replyToMessage.content.substring(0, 60)}{replyToMessage.content.length > 60 ? '...' : ''}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => setReplyToMessage(null)}
                      className="w-5 h-5 rounded-full hover:bg-white/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                
                <textarea
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewMessage(value);
                    
                    // Обработка @ для упоминаний (только в группах)
                    if (selectedChat?.isGroup) {
                      const cursorPos = e.target.selectionStart;
                      const textBeforeCursor = value.substring(0, cursorPos);
                      const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
                      
                      if (lastAtSymbol !== -1 && lastAtSymbol === textBeforeCursor.length - 1) {
                        // Только что ввели @
                        setShowMentionSuggestions(true);
                        setMentionQuery('');
                      } else if (lastAtSymbol !== -1) {
                        const afterAt = textBeforeCursor.substring(lastAtSymbol + 1);
                        // Проверяем что после @ нет пробелов
                        if (!afterAt.includes(' ') && afterAt.length > 0) {
                          setShowMentionSuggestions(true);
                          setMentionQuery(afterAt.toLowerCase());
                        } else if (afterAt.includes(' ') || afterAt === '') {
                          setShowMentionSuggestions(false);
                        }
                      } else {
                        setShowMentionSuggestions(false);
                      }
                    }
                    
                    // Auto-resize до 6 строк
                    const target = e.target;
                    target.style.height = 'auto';
                    const lineHeight = 20;
                    const maxHeight = lineHeight * 6;
                    const newHeight = Math.min(target.scrollHeight, maxHeight);
                    target.style.height = newHeight + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.ctrlKey || e.shiftKey) {
                        // Ctrl+Enter или Shift+Enter - перенос строки
                        e.preventDefault();
                        const target = e.target as HTMLTextAreaElement;
                        const start = target.selectionStart;
                        const end = target.selectionEnd;
                        const value = target.value;
                        const newValue = value.substring(0, start) + '\n' + value.substring(end);
                        setNewMessage(newValue);
                        // Устанавливаем курсор после переноса
                        setTimeout(() => {
                          target.selectionStart = target.selectionEnd = start + 1;
                          // Обновляем высоту
                          target.style.height = 'auto';
                          const lineHeight = 20;
                          const maxHeight = lineHeight * 6;
                          const newHeight = Math.min(target.scrollHeight, maxHeight);
                          target.style.height = newHeight + 'px';
                        }, 0);
                      } else {
                        // Enter - отправка или сохранение
                        e.preventDefault();
                        if (editingMessageId) {
                          updateMessage(editingMessageId, newMessage);
                          setNewMessage(savedMessageText);  // Восстанавливаем сохранённый текст
                          setSavedMessageText('');
                        } else {
                          sendMessage();
                        }
                      }
                    } else if (e.key === 'Escape' && editingMessageId) {
                      // Escape - отмена редактирования
                      setEditingMessageId(null);
                      setNewMessage(savedMessageText);  // Восстанавливаем сохранённый текст
                      setSavedMessageText('');
                    }
                  }}
                  placeholder={selectedChat?.isNotificationsChat ? "Чат только для чтения" : editingMessageId ? "Редактируйте сообщение..." : "Сообщение..."}
                  disabled={selectedChat?.isNotificationsChat}
                  className={`w-full px-4 py-2.5 backdrop-blur-xl bg-[var(--bg-secondary)]/60 border border-white/10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-white/20 resize-none overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4),-8px_0_20px_-10px_rgba(0,0,0,0.3),8px_0_20px_-10px_rgba(0,0,0,0.3),0_8px_25px_-8px_rgba(0,0,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed ${(replyToMessage && !editingMessageId) || editingMessageId ? 'rounded-b-[22px] rounded-t-none border-t-0' : 'rounded-[22px]'}`}
                  style={{ minHeight: '44px', maxHeight: '120px', lineHeight: '20px', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  rows={1}
                />

                {/* Mention suggestions dropdown */}
                {showMentionSuggestions && selectedChat?.isGroup && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                    {(() => {
                      const participants = users.filter(u => 
                        selectedChat.participantIds.includes(u.id) && 
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
                            const cursorPos = messageInputRef.current?.selectionStart || 0;
                            const textBeforeCursor = newMessage.substring(0, cursorPos);
                            const textAfterCursor = newMessage.substring(cursorPos);
                            const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
                            
                            const mentionText = user.shortId || user.username || user.name || 'user';
                            const newText = 
                              textBeforeCursor.substring(0, lastAtSymbol) + 
                              '@' + mentionText + ' ' + 
                              textAfterCursor;
                            
                            setNewMessage(newText);
                            setShowMentionSuggestions(false);
                            messageInputRef.current?.focus();
                          }}
                          className="w-full p-2 flex items-center gap-2 hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(user.name || user.username || 'U')[0].toUpperCase()}
                          </div>
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
                    updateMessage(editingMessageId, newMessage);
                    setNewMessage(savedMessageText);  // Восстанавливаем сохранённый текст
                    setSavedMessageText('');
                  }}
                  disabled={!newMessage.trim()}
                  className="w-11 h-11 rounded-full backdrop-blur-xl bg-green-500 hover:bg-green-600 border border-white/10 disabled:bg-[var(--bg-secondary)]/60 disabled:border-white/10 disabled:cursor-not-allowed flex items-center justify-center text-white disabled:text-[var(--text-muted)] transition-all flex-shrink-0 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4),0_0_15px_-5px_rgba(0,0,0,0.3)]"
                >
                  <Check className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && attachments.length === 0) || selectedChat?.isNotificationsChat}
                  className="w-11 h-11 rounded-full backdrop-blur-xl bg-blue-500 hover:bg-blue-600 border border-white/10 disabled:bg-[var(--bg-secondary)]/60 disabled:border-white/10 disabled:cursor-not-allowed flex items-center justify-center text-white disabled:text-[var(--text-muted)] transition-all flex-shrink-0 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4),0_0_15px_-5px_rgba(0,0,0,0.3)]"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
            )}
          </div>
          </div>

          {/* Chat Info Panel - Профиль собеседника */}
          {showChatInfo && (
            <div className="fixed inset-0 z-50 lg:relative lg:inset-auto lg:z-auto w-full lg:w-80 lg:min-w-[320px] border-l-0 lg:border-l border-[var(--border-color)] flex flex-col bg-[var(--bg-secondary)] flex-shrink-0 overflow-hidden">
              {(() => {
                // Определяем собеседника (не текущий пользователь)
                const otherParticipantId = selectedChat?.participantIds.find(id => id !== currentUser?.id);
                const otherUser = otherParticipantId ? users.find(u => u.id === otherParticipantId) : null;
                
                // Статистика вложений
                const mediaCount = messages.filter(m => m.attachments?.some(a => a.type === 'image')).length;
                const fileCount = messages.filter(m => m.attachments?.some(a => a.type === 'file' || a.type === 'task')).length;
                const linkCount = messages.reduce((count, m) => {
                  const attachmentLinks = (m.attachments || []).filter(a => a.type === 'link').length;
                  const textLinks = (m.content.match(/(https?:\/\/[^\s<>"']+)/gi) || []).length;
                  return count + attachmentLinks + textLinks;
                }, 0);
                
                // Общие задачи (где оба участника назначены или автор)
                const sharedTasks = tasks.filter(task => {
                  if (!otherUser) return false;
                  const assignedTo = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
                  const isOtherAssigned = assignedTo.includes(otherUser.id);
                  const isOtherAuthor = task.authorId === otherUser.id;
                  const isCurrentAssigned = assignedTo.includes(currentUser?.id || '');
                  const isCurrentAuthor = task.authorId === currentUser?.id;
                  // Показываем задачи где собеседник участвует ИЛИ где текущий пользователь участвует
                  return (isOtherAssigned || isOtherAuthor) || (isCurrentAssigned || isCurrentAuthor);
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
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-3 ${
                          selectedChat?.isFavoritesChat
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                            : selectedChat?.isSystemChat || selectedChat?.isNotificationsChat
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                            : selectedChat?.isGroup
                            ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                            : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                        }`}>
                          {selectedChat?.isFavoritesChat ? (
                            <Star className="w-8 h-8 text-white fill-white" />
                          ) : selectedChat?.isSystemChat || selectedChat?.isNotificationsChat ? (
                            <Bell className="w-8 h-8 text-white" />
                          ) : selectedChat?.isGroup ? (
                            <Users className="w-8 h-8" />
                          ) : (
                            (otherUser?.name || 'U')[0].toUpperCase()
                          )}
                        </div>
                        <h3 className="font-semibold text-lg text-center">{getChatTitle(selectedChat!)}</h3>
                        {selectedChat?.isGroup ? (
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            {selectedChat.participantIds.length} участник{selectedChat.participantIds.length === 1 ? '' : selectedChat.participantIds.length < 5 ? 'а' : 'ов'}
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
                    <div className="flex border-b border-[var(--border-color)]">
                      <button
                        onClick={() => setChatInfoTab('profile')}
                        className={`flex-1 py-2.5 text-xs font-medium transition-all ${
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
                          className={`flex-1 py-2.5 text-xs font-medium transition-all ${
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
                        className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                          chatInfoTab === 'media' 
                            ? 'text-cyan-400 border-b-2 border-cyan-400' 
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        Медиа
                      </button>
                      <button
                        onClick={() => setChatInfoTab('files')}
                        className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                          chatInfoTab === 'files' 
                            ? 'text-cyan-400 border-b-2 border-cyan-400' 
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        Файлы
                      </button>
                      <button
                        onClick={() => setChatInfoTab('links')}
                        className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                          chatInfoTab === 'links' 
                            ? 'text-cyan-400 border-b-2 border-cyan-400' 
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        Ссылки
                      </button>
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
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                                    {(participant?.name || 'U')[0].toUpperCase()}
                                  </div>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-cyan-400" />
                Новый чат
              </h3>
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setSelectedUsers([]);
                  setIsGroupChat(false);
                  setGroupTitle('');
                }}
                className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
              >
                <X className="w-5 h-5" />
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
                  className="w-full px-3 py-2 mb-4 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-light)]"
                />
              )}

              {/* Search users */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Поиск пользователей..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-[25px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-light)]"
                />
              </div>

              {/* Users list */}
              <div className="space-y-2">
                {filteredUsers.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold">
                      {(user.name || user.username || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.name || user.username || 'Без имени'}</p>
                      {user.email && (
                        <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setSelectedUsers([]);
                  setIsGroupChat(false);
                  setGroupTitle('');
                }}
                className="flex-1 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:bg-[var(--bg-primary)]"
              >
                Отмена
              </button>
              <button
                onClick={createChat}
                disabled={selectedUsers.length === 0 || (isGroupChat && !groupTitle.trim())}
                className="flex-1 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Создать чат
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
                    if (selectedChat?.participantIds.includes(u.id)) return false;
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
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {(user.name || user.username || 'U')[0].toUpperCase()}
                      </div>
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
                // Backend уже отфильтровал задачи для текущего пользователя
                const myTasks = Array.isArray(tasks) ? tasks : [];
                
                // Отладочное логирование для задач
                console.log('DEBUG - Информация о задачах:', {
                  tasksCount: myTasks.length,
                  currentUserId: currentUser?.id,
                  tasks: myTasks
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
                      className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white truncate">{task.title}</h4>
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

      {/* Link Picker Modal */}
      {showLinkPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-cyan-400" />
                Выбрать ссылку
              </h3>
              <button
                onClick={() => setShowLinkPicker(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {(() => {
                // Ссылки загружены из базы данных
                const userLinks = Array.isArray(links) ? links : [];

                // Сортируем по дате (новые первыми)
                const sortedLinks = userLinks.sort((a, b) => 
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                console.log('DEBUG - Ссылки:', {
                  linksCount: sortedLinks.length,
                  currentUserId: currentUser?.id,
                  links: sortedLinks
                });

                return sortedLinks.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] text-center py-8">Нет сохраненных ссылок</p>
                ) : (
                  <div className="space-y-2">
                    {sortedLinks.map((link, index) => (
                      <button
                        key={link.id || index}
                        onClick={() => {
                          setAttachments(prev => [...prev, {
                            type: 'link',
                            name: link.title || link.url,
                            url: link.url
                          }]);
                          setShowLinkPicker(false);
                        }}
                        className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <LinkIcon className="w-4 h-4 text-purple-400 flex-shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            {link.title && (
                              <p className="text-xs font-medium text-[var(--text-primary)] mb-0.5">{link.title}</p>
                            )}
                            <p className="text-[10px] text-[var(--text-muted)] break-all line-clamp-1">{link.url}</p>
                            {link.description && (
                              <p className="text-[10px] text-[var(--text-secondary)] mt-1 line-clamp-2">{link.description}</p>
                            )}
                            <p className="text-[9px] text-[var(--text-muted)] mt-1">
                              {new Date(link.createdAt).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-2 p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowLinkPicker(false)}
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
            className="relative w-full sm:w-auto sm:min-w-[360px] max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-t-[25px] sm:rounded-[25px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle для мобильных */}
            <div className="flex justify-center pt-3 pb-2 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-[var(--border-color)]" />
            </div>
            
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-cyan-400" />
                Добавить вложение
              </h3>
              <button
                onClick={() => setShowAttachmentMenu(false)}
                className="w-8 h-8 rounded-full hover:bg-[var(--bg-tertiary)] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            </div>
            
            {/* Drop Zone - только на десктопе */}
            <div 
              className="hidden md:block mx-4 mt-4 p-6 border-2 border-dashed border-[var(--border-color)] rounded-[20px] hover:border-cyan-400/50 hover:bg-cyan-500/5 transition-all cursor-pointer"
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
                  setShowLinkPicker(true);
                  setShowAttachmentMenu(false);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-[20px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LinkIcon className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-xs text-[var(--text-secondary)]">Ссылка</span>
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
      {showForwardModal && forwardingMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
              <h3 className="font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Переслать сообщение
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
              <div className="mb-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                <p className="text-xs text-[var(--text-muted)] mb-1">Сообщение:</p>
                <p className="text-sm text-[var(--text-primary)] line-clamp-3">{forwardingMessage.content}</p>
              </div>
              
              <p className="text-sm text-[var(--text-secondary)] mb-3">Выберите чаты:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {chats
                  .filter(chat => !chat.isNotificationsChat && chat.id !== forwardingMessage.chatId)
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
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {chat.isGroup ? <Users className="w-5 h-5" /> : getChatTitle(chat)[0]?.toUpperCase()}
                      </div>
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
                  .filter(id => id !== readByMessage.authorId)
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
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                          {(participant?.name || 'U')[0].toUpperCase()}
                        </div>
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

      {/* Image Modal - Telegram-style image viewer */}
      {showImageModal && currentImageUrl && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>
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
            className="absolute top-4 right-16 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all z-10"
            title="Скачать"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <img 
            src={currentImageUrl}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
