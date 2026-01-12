'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send, ArrowLeft, Users, Search, Plus, MoreVertical, Check, Edit3, Trash2, Reply, Pin, PinOff, X, Paperclip, FileText, Link as LinkIcon, Calendar, Image, File } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  role: 'admin' | 'user';
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
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  
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
    setSelectedChat(chat);
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
            localStorage.setItem('myAccount', JSON.stringify({ id: currentUser.id }));
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
              localStorage.setItem('myAccount', JSON.stringify({ id: newUser.id }));
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
                  localStorage.setItem('myAccount', JSON.stringify({ id: existingUser.id }));
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
              localStorage.setItem('myAccount', JSON.stringify({ id: existingUser.id }));
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
            localStorage.setItem('myAccount', JSON.stringify({ id: newUser.id }));
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
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        // API может вернуть объект с полем todos или напрямую массив
        const tasksArray = Array.isArray(data) ? data : (data.todos || data.tasks || []);
        setTasks(tasksArray);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
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
          isGroup: isGroupChat
        })
      });

      if (res.ok) {
        const newChat = await res.json();
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
    if (!newMessage.trim() || !selectedChat || !currentUser || !selectedChat.id) return;

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
    if (chat.isFavoritesChat) return '⭐';
    if (chat.isSystemChat || chat.isNotificationsChat) return '🔔';
    
    if (!currentUser) return 'C';
    
    const otherParticipants = users.filter(u => 
      chat.participantIds.includes(u.id) && u.id !== currentUser.id
    );
    
    if (otherParticipants.length === 0) return '⭐';
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
    <div className="h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex overflow-hidden rounded-[25px]">
      {/* Левая панель - список чатов */}
      <div className={`w-full ${selectedChat ? 'hidden md:block' : 'block'} md:w-80 border-r border-[var(--border-color)] flex flex-col h-full overflow-hidden`}>
        {/* Header */}
        <div className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center px-4 gap-2 flex-shrink-0">
          <Link
            href="/account?tab=messages"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all md:hidden"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          </Link>
          <MessageCircle className="w-4 h-4 text-cyan-400" />
          <span className="font-medium text-sm">Сообщения</span>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-all"
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
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 108px)' }}>
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
                          className="w-full p-3 hover:bg-[var(--bg-tertiary)] transition-all text-left"
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
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <Pin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                                  <h3 className="font-medium text-sm truncate">{getChatTitle(chat)}</h3>
                                </div>
                                {chat.lastMessage && (
                                  <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                                    {new Date(chat.lastMessage.createdAt).toLocaleTimeString('ru-RU', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                )}
                              </div>
                              {chat.lastMessage && (
                                <p className="text-xs text-[var(--text-secondary)] truncate">
                                  {chat.lastMessage.authorName}: {chat.lastMessage.content}
                                </p>
                              )}
                            </div>
                            {(chat.unreadCount || 0) > 0 && (
                              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {chat.unreadCount}
                              </div>
                            )}
                          </div>
                        </button>
                        {/* Pin/Unpin button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinChat(chat.id);
                          }}
                          className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-[var(--bg-tertiary)] rounded"
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
                          className="w-full p-3 hover:bg-[var(--bg-tertiary)] transition-all text-left"
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
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h3 className="font-medium text-sm truncate flex-1 min-w-0">{getChatTitle(chat)}</h3>
                                {chat.lastMessage && (
                                  <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                                    {new Date(chat.lastMessage.createdAt).toLocaleTimeString('ru-RU', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                )}
                              </div>
                              {chat.lastMessage && (
                                <p className="text-xs text-[var(--text-secondary)] truncate">
                                  {chat.lastMessage.authorName}: {chat.lastMessage.content}
                                </p>
                              )}
                            </div>
                            {(chat.unreadCount || 0) > 0 && (
                              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {chat.unreadCount}
                              </div>
                            )}
                          </div>
                        </button>
                        {/* Pin button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinChat(chat.id);
                          }}
                          className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-[var(--bg-tertiary)] rounded"
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
        <div className={`flex-1 flex flex-col overflow-hidden relative ${selectedChat ? 'block' : 'hidden md:block'}`}>
          {/* Chat header */}
          <div className="h-12 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center px-4 gap-3 flex-shrink-0">
            <button
              onClick={() => selectChat(null)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all md:hidden"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            </button>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              selectedChat.isFavoritesChat
                ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                : selectedChat.isSystemChat || selectedChat.isNotificationsChat
                ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                : 'bg-gradient-to-br from-cyan-500 to-blue-600'
            }`}>
              {selectedChat.isFavoritesChat || selectedChat.isSystemChat || selectedChat.isNotificationsChat ? getChatAvatar(selectedChat) : getChatAvatar(selectedChat).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="font-medium text-sm">{getChatTitle(selectedChat)}</h2>
              <p className="text-[10px] text-[var(--text-muted)]">
                {selectedChat.participantIds.length} участник{selectedChat.participantIds.length > 1 ? 'ов' : ''}
              </p>
            </div>
            <button
              onClick={() => togglePinChat(selectedChat.id)}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all"
              title={selectedChat.pinnedByUser?.[currentUser?.id || ''] ? "Открепить чат" : "Закрепить чат"}
            >
              {selectedChat.pinnedByUser?.[currentUser?.id || ''] ? (
                <PinOff className="w-4 h-4 text-cyan-400" />
              ) : (
                <Pin className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" />
              )}
            </button>
            {/* Кнопка удаления чата - не для системных чатов */}
            {!selectedChat.isSystemChat && !selectedChat.isNotificationsChat && !selectedChat.isFavoritesChat && (
              <button
                onClick={() => deleteChat(selectedChat.id)}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-500/20 transition-all"
                title="Удалить чат"
              >
                <Trash2 className="w-4 h-4 text-[var(--text-muted)] hover:text-red-400" />
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 pb-40">
            <div className="max-w-3xl mx-auto space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
                  <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm">Нет сообщений</p>
                  <p className="text-xs mt-1">Начните общение</p>
                </div>
              ) : (
                messages.map((message) => {
                const isMyMessage = message.authorId === currentUser?.id;
                const isEditing = editingMessageId === message.id;
                const replyTo = message.replyToId 
                  ? messages.find(m => m.id === message.replyToId)
                  : null;

                return (
                  <div
                    key={message.id}
                    ref={(el) => { messageRefs.current[message.id] = el; }}
                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} group transition-colors duration-500`}
                  >
                    <div 
                      className={`max-w-[80%] relative ${isMyMessage ? 'order-2' : ''} ${message.linkedChatId ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        // Клик на системное сообщение с ссылкой на чат - переход к чату
                        if (message.linkedChatId) {
                          const linkedChat = chats.find(c => c.id === message.linkedChatId);
                          if (linkedChat) {
                            selectChat(linkedChat);
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
                      
                      <div
                        className={`rounded-xl px-3 py-2 relative min-w-[144px] ${
                          isMyMessage
                            ? 'bg-blue-500/20 rounded-br-sm'
                            : message.isSystemMessage
                              ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-bl-sm hover:border-blue-500/40 transition-colors'
                              : 'bg-[var(--bg-tertiary)] rounded-bl-sm'
                        } ${message.isDeleted ? 'opacity-60' : ''}`}
                      >
                        {!isMyMessage && (
                          <p className={`text-[10px] font-medium mb-0.5 ${message.isSystemMessage ? 'text-purple-400' : 'text-blue-400'}`}>
                            {message.authorName}
                          </p>
                        )}

                        {message.isDeleted ? (
                          <p className="text-xs text-[var(--text-secondary)] italic">
                            Сообщение удалено
                          </p>
                        ) : isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingMessageText}
                              onChange={(e) => setEditingMessageText(e.target.value)}
                              className="w-full px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded text-xs text-[var(--text-primary)] resize-none focus:outline-none"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditingMessageText('');
                                }}
                                className="px-2 py-0.5 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              >
                                Отмена
                              </button>
                              <button
                                onClick={() => updateMessage(message.id, editingMessageText)}
                                className="px-2 py-0.5 text-[10px] bg-blue-500/30 text-blue-400 rounded hover:bg-blue-500/40"
                              >
                                Сохранить
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p
                              className="text-xs text-[var(--text-primary)] whitespace-pre-wrap break-words"
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
                              {!message.isDeleted && (
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

                        {/* Message actions */}
                        {isMyMessage && !isEditing && !message.isDeleted && (
                          <div className="absolute -left-20 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                            <button
                              onClick={() => setReplyToMessage(message)}
                              className="w-6 h-6 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center"
                              title="Ответить"
                            >
                              <Reply className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingMessageId(message.id);
                                setEditingMessageText(message.content);
                              }}
                              className="w-6 h-6 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center"
                              title="Редактировать"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteMessage(message.id)}
                              className="w-6 h-6 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-red-400"
                              title="Удалить"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        
                        {!isMyMessage && !isEditing && !message.isDeleted && (
                          <div className="absolute -right-10 top-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              onClick={() => setReplyToMessage(message)}
                              className="w-6 h-6 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center"
                              title="Ответить"
                            >
                              <Reply className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
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
            className={`absolute bottom-[76px] left-0 right-0 px-3 py-1 transition-all ${
              isDragging ? 'border-blue-500 bg-blue-500/10' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              
              const files = Array.from(e.dataTransfer.files);
              files.forEach(file => {
                setAttachments(prev => [...prev, {
                  type: file.type.startsWith('image/') ? 'image' : 'file',
                  name: file.name,
                  file
                }]);
              });
            }}
          >
            {/* Drag overlay */}
            {isDragging && (
              <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center pointer-events-none z-10">
                <div className="text-center">
                  <File className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-blue-400 font-medium">Отпустите файлы для загрузки</p>
                </div>
              </div>
            )}
            
            {/* Attachments preview */}
            {attachments.length > 0 && (
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
            
            <div className="flex gap-2 items-end max-w-3xl mx-auto">
              {/* Attachment button */}
              <div className="relative">
                <button
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className="w-11 h-11 rounded-full backdrop-blur-xl bg-[var(--bg-secondary)]/80 border border-[var(--border-color)]/30 hover:bg-[var(--bg-tertiary)]/90 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex-shrink-0 shadow-lg"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                
                {showAttachmentMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl overflow-hidden w-48">
                    <button
                      onClick={() => {
                        setShowTaskPicker(true);
                        setShowAttachmentMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Задача</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowLinkPicker(true);
                        setShowAttachmentMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span>Ссылка из базы</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowEventPicker(true);
                        setShowAttachmentMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Событие</span>
                    </button>
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowAttachmentMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors"
                    >
                      <Image className="w-4 h-4" />
                      <span>Изображение</span>
                    </button>
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowAttachmentMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 flex items-center gap-2 transition-colors"
                    >
                      <File className="w-4 h-4" />
                      <span>Файл</span>
                    </button>
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAttachments(prev => [...prev, {
                      type: file.type.startsWith('image/') ? 'image' : 'file',
                      name: file.name,
                      file
                    }]);
                  }
                }}
              />
              
              {/* Input container with reply indicator */}
              <div className="flex-1 min-w-0 flex flex-col">
                {/* Reply indicator над инпутом */}
                {replyToMessage && (
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
                    setNewMessage(e.target.value);
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
                        // Enter - отправка
                        e.preventDefault();
                        sendMessage();
                      }
                    }
                  }}
                  placeholder="Сообщение..."
                  className={`w-full px-4 py-2.5 backdrop-blur-xl bg-[var(--bg-secondary)]/60 border border-white/10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-white/20 resize-none overflow-hidden shadow-lg ${replyToMessage ? 'rounded-b-[22px] rounded-t-none border-t-0' : 'rounded-[22px]'}`}
                  style={{ minHeight: '44px', maxHeight: '120px', lineHeight: '20px', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  rows={1}
                />
              </div>
              
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="w-11 h-11 rounded-full backdrop-blur-xl bg-blue-500 hover:bg-blue-600 disabled:bg-[var(--bg-secondary)]/60 disabled:border disabled:border-white/10 disabled:cursor-not-allowed flex items-center justify-center text-white disabled:text-[var(--text-muted)] transition-all flex-shrink-0 shadow-lg"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
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
                // Фильтруем задачи - только те где я автор или исполнитель
                const myTasks = Array.isArray(tasks) ? tasks.filter(task => {
                  if (!currentUser) return false;
                  // Я автор задачи
                  if (task.authorId === currentUser.id) return true;
                  // Я в списке исполнителей
                  if (task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.includes(currentUser.id)) return true;
                  // Я назначен как единственный исполнитель
                  if (task.assignedTo === currentUser.id) return true;
                  return false;
                }) : [];
                
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
              <p className="text-sm text-[var(--text-secondary)]">Здесь будет список ссылок из базы</p>
              {/* TODO: Загрузить ссылки из API */}
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
              <p className="text-sm text-[var(--text-secondary)]">Здесь будет список событий из базы</p>
              {/* TODO: Загрузить события из API */}
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
    </div>
  );
}
