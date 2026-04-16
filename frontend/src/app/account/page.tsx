'use client';

import React, { useState, useEffect, Suspense, lazy, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageCircle, CheckSquare, Calendar, Users, MoreVertical, Shield, FileText, Languages, Sparkles, Link2, Box, Globe, Megaphone, Sun, Moon, GripVertical, X, Settings, User, ChevronUp, Type, MessageSquare, CheckCircle, Info, Zap, Code2, PenTool, Hash, Package2 } from 'lucide-react';
import { FaAndroid, FaWindows } from 'react-icons/fa6';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import Avatar from '@/components/Avatar';
import AvatarUpload from '@/components/AvatarUpload';
import { BrowserPushService } from '@/services/browserPushService';

// Типы для инструментов
interface Tool {
  id: string;
  name: string;
  href: string;
  icon: React.ReactNode;
  gradient: string;
  adminOnly?: boolean;
  standard?: boolean;  // Стандартный инструмент (доступен всем)
}

// Динамический импорт компонентов
const TodosBoard = lazy(() => import('../../components/TodosBoard'));
const ContactsBoard = lazy(() => import('../../components/ContactsBoard'));
const CalendarBoard = lazy(() => import('../../components/CalendarBoard'));
const MessagesBoard = lazy(() => import('../../components/MessagesBoard'));
const LinksBoard = lazy(() => import('../links/page'));

type TabType = 'messages' | 'tasks' | 'calendar' | 'contacts' | 'tools' | 'links';

// Стандартные инструменты (доступны всем)
const STANDARD_TOOL_IDS = ['messages', 'tasks', 'calendar', 'links', 'settings'];

// Список всех инструментов
const ALL_TOOLS: Tool[] = [
  { id: 'feed-editor', name: 'Редактор фидов', href: '/feed-editor', icon: <Code2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={1.5} />, gradient: 'from-blue-500 to-indigo-600' },
  { id: 'transliterator', name: 'Транслитератор', href: '/transliterator', icon: <Type className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={1.5} />, gradient: 'from-emerald-500 to-teal-600' },
  { id: 'slovolov', name: 'Словолов', href: '/slovolov', icon: <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={1.5} />, gradient: 'from-pink-500 to-rose-600' },
  { id: 'utm-generator', name: 'Генератор UTM', href: '/utm-generator', icon: <Hash className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={1.5} />, gradient: 'from-fuchsia-500 to-pink-600' },
  { id: 'slovolov-pro', name: 'Словолов PRO', href: '/slovolov-pro', icon: <Package2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={1.5} />, gradient: 'from-cyan-500 to-blue-600' },
  { id: 'content-plan', name: 'Контент-план', href: '/content-plan', icon: <PenTool className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={1.5} />, gradient: 'from-purple-500 to-violet-600' },
  { id: 'settings', name: 'Настройки', href: '/settings', icon: <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={1.5} />, gradient: 'from-gray-500 to-slate-600', standard: true },
  { id: 'admin', name: 'Админка', href: '/admin', icon: <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={1.5} />, gradient: 'from-amber-500 to-orange-600', adminOnly: true },
];

const TOOL_ICON_COLORS: Record<string, string> = {
  'feed-editor': 'text-blue-500',
  transliterator: 'text-emerald-500',
  slovolov: 'text-fuchsia-500',
  'utm-generator': 'text-pink-500',
  'slovolov-pro': 'text-sky-500',
  'content-plan': 'text-violet-500',
  links: 'text-cyan-500',
  admin: 'text-orange-500',
  settings: 'text-slate-500',
};

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ phone: '', workSchedule: '', position: '', department: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Состояния для выпадающего меню аккаунта
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  
  // Настройки чата
  const [chatSettings, setChatSettings] = useState({
    bubbleStyle: 'modern' as 'modern' | 'classic' | 'minimal',
    fontSize: 13, // размер в пикселях для десктопа
    fontSizeMobile: 15, // размер в пикселях для мобильных
    bubbleColor: '#3c3d96', // цвет для темной темы
    bubbleColorLight: '#453de6', // цвет для светлой темы
    bubbleColorOpponent: '#1f2937',
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
  
  // Состояния для drag & drop инструментов
  const [pinnedTools, setPinnedTools] = useState<string[]>([]);
  const [draggingTool, setDraggingTool] = useState<string | null>(null);
  const [isDragOverBar, setIsDragOverBar] = useState(false);
  const [pinnedToolContextMenu, setPinnedToolContextMenu] = useState<{ toolId: string; x: number; y: number } | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false);
  const [isBelow768, setIsBelow768] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 773 : false);
  const browserPushRef = useRef<BrowserPushService | null>(null);
  const activeTabRef = useRef<TabType>('messages');
  const isChatOpenRef = useRef(false);
  const activeChatIdRef = useRef<string | null>(null);
  
  // Состояния видимости вкладок навигации
  const [visibleTabs, setVisibleTabs] = useState({
    messages: true,
    tasks: true,
    calendar: true,
    contacts: true,
    links: true
  });

  // Сохранение настроек навигации на сервер
  const saveNavigationSettings = async (tabs: typeof visibleTabs, toolsOrder?: string[]) => {
    try {
      const myAccountStr = localStorage.getItem('myAccount');
      if (myAccountStr) {
        const myAccount = JSON.parse(myAccountStr);
        await fetch(`/api/users/${myAccount.id}/navigation`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            visibleTabs: tabs,
            ...(toolsOrder && { toolsOrder })
          })
        });
      }
    } catch (error) {
      console.error('Failed to save navigation settings:', error);
    }
  };

  // Обработчик изменения видимости вкладок
  const handleVisibleTabsChange = (tabId: string, checked: boolean) => {
    const newVisibleTabs = { ...visibleTabs, [tabId]: checked };
    setVisibleTabs(newVisibleTabs);
    saveNavigationSettings(newVisibleTabs);
  };

  // Загрузка настроек чата с сервера
  useEffect(() => {
    const loadChatSettings = async () => {
      const defaultSettings = {
        bubbleStyle: 'modern' as 'modern' | 'classic' | 'minimal',
        fontSize: 13,
        fontSizeMobile: 15,
        bubbleColor: '#3c3d96',
        bubbleColorLight: '#453de6',
        bubbleColorOpponent: '#1f2937',
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
      };
      
      try {
        const myAccountStr = localStorage.getItem('myAccount');
        if (myAccountStr) {
          const myAccount = JSON.parse(myAccountStr);
          const res = await fetch(`/api/users/${myAccount.id}`);
          if (res.ok) {
            const user = await res.json();
            
            // Загружаем настройки чата из PostgreSQL
            if (user.chatSettings) {
              let localSettings: Record<string, any> = {};
              const localSettingsRaw = localStorage.getItem('chatSettings');
              if (localSettingsRaw) {
                try {
                  localSettings = JSON.parse(localSettingsRaw);
                } catch {
                  localSettings = {};
                }
              }

              const settings = { ...defaultSettings, ...user.chatSettings, ...localSettings };
              setChatSettings(settings);
              // Сохраняем в localStorage для быстрого доступа (не как источник правды)
              localStorage.setItem('chatSettings', JSON.stringify(settings));
            } else {
              const localSettingsRaw = localStorage.getItem('chatSettings');
              if (localSettingsRaw) {
                try {
                  const localSettings = JSON.parse(localSettingsRaw);
                  setChatSettings({ ...defaultSettings, ...localSettings });
                } catch {
                  setChatSettings(defaultSettings);
                }
              } else {
                setChatSettings(defaultSettings);
              }
            }
            
            // Загружаем настройки навигации
            if (user.visible_tabs || user.visibleTabs) {
              const tabs = user.visible_tabs || user.visibleTabs;
              setVisibleTabs(tabs);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load chat settings:', error);
        const localSettingsRaw = localStorage.getItem('chatSettings');
        if (localSettingsRaw) {
          try {
            const localSettings = JSON.parse(localSettingsRaw);
            setChatSettings({ ...defaultSettings, ...localSettings });
          } catch {
            setChatSettings(defaultSettings);
          }
        } else {
          setChatSettings(defaultSettings);
        }
      }
    };
    loadChatSettings();
  }, []);

  // Сохранение настроек чата на сервер
  const saveChatSettings = async (newSettings: typeof chatSettings) => {
    setChatSettings(newSettings);
    // Кэшируем в localStorage для быстрого доступа
    localStorage.setItem('chatSettings', JSON.stringify(newSettings));
    // Dispatch event для обновления в других компонентах
    window.dispatchEvent(new CustomEvent('chatSettingsChanged', { detail: newSettings }));
    
    // Сохраняем на сервер (в PostgreSQL)
    try {
      const myAccountStr = localStorage.getItem('myAccount');
      if (myAccountStr) {
        const myAccount = JSON.parse(myAccountStr);
        await fetch(`/api/users/${myAccount.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatSettings: newSettings })
        });
      }
    } catch (error) {
      console.error('Failed to save chat settings to server:', error);
    }
  };

  // Загрузка количества непрочитанных чатов
  const loadUnreadCount = async () => {
    // Не запрашиваем данные если вкладка не активна
    if (typeof document !== 'undefined' && document.hidden) return;
    
    try {
      const myAccountStr = localStorage.getItem('myAccount');
      if (!myAccountStr) return;
      const myAccount = JSON.parse(myAccountStr);
      const res = await fetch(`/api/chats?user_id=${myAccount.id}`);
      if (res.ok) {
        const chats = await res.json();
        const unreadCount = chats.filter((chat: any) => {
          const chatId = String(chat?.id || '');
          const isFavoritesChat = Boolean(chat?.isFavoritesChat) || chatId.startsWith('favorites_');
          return !isFavoritesChat && (chat.unreadCount || 0) > 0;
        }).length;
        setUnreadChatsCount(unreadCount);
      }
    } catch (error) {
      // Ignore errors
    }
  };

  useEffect(() => {
    // Загрузка непрочитанных
    loadUnreadCount();
    
    // Polling каждые 5 секунд
    const interval = setInterval(loadUnreadCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Загрузка закрепленных инструментов с сервера
  useEffect(() => {
    const loadPinnedTools = async () => {
      try {
        const myAccountStr = localStorage.getItem('myAccount');
        if (myAccountStr) {
          const myAccount = JSON.parse(myAccountStr);
          const res = await fetch(`/api/users/${myAccount.id}`);
          if (res.ok) {
            const user = await res.json();
            if (user.pinnedTools && Array.isArray(user.pinnedTools)) {
              setPinnedTools(user.pinnedTools);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load pinned tools:', error);
      }
    };
    
    loadPinnedTools();
    
    // Определяем, является ли устройство десктопом
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Сохранение закрепленных инструментов на сервер
  const savePinnedTools = useCallback(async (tools: string[]) => {
    setPinnedTools(tools);
    
    // Сохраняем на сервер (в PostgreSQL)
    try {
      const myAccountStr = localStorage.getItem('myAccount');
      if (myAccountStr) {
        const myAccount = JSON.parse(myAccountStr);
        await fetch(`/api/users/${myAccount.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pinnedTools: tools })
        });
      }
    } catch (error) {
      console.error('Failed to save pinned tools to server:', error);
    }
  }, []);

  // Drag & drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, toolId: string) => {
    setDraggingTool(toolId);
    e.dataTransfer.setData('text/plain', toolId);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingTool(null);
    setIsDragOverBar(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOverBar(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOverBar(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const toolId = e.dataTransfer.getData('text/plain');
    if (toolId && !pinnedTools.includes(toolId)) {
      savePinnedTools([...pinnedTools, toolId]);
    }
    setIsDragOverBar(false);
    setDraggingTool(null);
  }, [pinnedTools, savePinnedTools]);

  const removePinnedTool = useCallback((toolId: string) => {
    savePinnedTools(pinnedTools.filter(id => id !== toolId));
  }, [pinnedTools, savePinnedTools]);

  useEffect(() => {
    if (!pinnedToolContextMenu) return;

    const closeMenu = () => setPinnedToolContextMenu(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('click', closeMenu);
    document.addEventListener('contextmenu', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('resize', closeMenu);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', closeMenu);
      document.removeEventListener('contextmenu', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('resize', closeMenu);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [pinnedToolContextMenu]);

  useEffect(() => {
    // Загрузка текущего пользователя
    const loadCurrentUser = async () => {
      const myAccountStr = localStorage.getItem('myAccount');
      const userRole = localStorage.getItem('userRole');
      
      if (myAccountStr) {
        try {
          const account = JSON.parse(myAccountStr);
          
          if (account.id) {
            // Всегда загружаем данные пользователя с сервера чтобы получить актуальный аватар и права
            const res = await fetch(`/api/users/${account.id}`);
            if (res.ok) {
              const user = await res.json();
              // Сохраняем в localStorage для будущего использования (с аватаром и department)
              localStorage.setItem('myAccount', JSON.stringify({ 
                id: account.id, 
                name: user.name,
                avatar: user.avatar,
                department: user.department
              }));
              setCurrentUser({ 
                id: account.id,
                name: user.name, 
                email: user.email,
                avatar: user.avatar,
                role: user.role || userRole,
                enabledTools: user.enabledTools || []
              });
            } else if (account.name) {
              // Fallback если сервер недоступен
              setCurrentUser({ id: account.id, name: account.name, role: userRole, enabledTools: [] });
            }
          } else if (account.name) {
            // Если нет ID но есть имя
            setCurrentUser({ name: account.name, role: userRole, enabledTools: [] });
          }
        } catch {
          const username = localStorage.getItem('username');
          if (username) {
            setCurrentUser({ name: username, role: userRole, enabledTools: [] });
          }
        }
      } else {
        const username = localStorage.getItem('username');
        if (username) {
          setCurrentUser({ name: username, role: userRole, enabledTools: [] });
        }
      }
    };
    
    loadCurrentUser();

    // Проверяем URL параметр для активной вкладки
    const tab = searchParams.get('tab') as TabType;
    if (tab && ['messages', 'tasks', 'calendar', 'contacts', 'tools', 'links'].includes(tab)) {
      setActiveTab(tab);
    }
    
    // Проверяем, открыт ли чат (для скрытия боттом бара на мобильных)
    const chatId = searchParams.get('chat');
    // Скрываем боттом бар только если есть chatId в URL
    setIsChatOpen(!!chatId);
    activeChatIdRef.current = chatId || null;
  }, [searchParams]);

  // Открытие задачи по событию из чат-уведомления (shar:open-task)
  useEffect(() => {
    const handleOpenTask = (e: Event) => {
      const { taskId } = (e as CustomEvent<{ taskId: string }>).detail;
      setActiveTab('tasks');
      router.push(`/account?tab=tasks&task=${encodeURIComponent(taskId)}`, { scroll: false });
    };
    window.addEventListener('shar:open-task', handleOpenTask);
    return () => window.removeEventListener('shar:open-task', handleOpenTask);
  }, [router]);

  useEffect(() => {
    const handleChatSelectionChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen?: boolean }>;
      const isOpen = !!customEvent.detail?.isOpen;
      setIsChatOpen(activeTab === 'messages' && isOpen);
    };

    window.addEventListener('chat-selection-changed', handleChatSelectionChanged as EventListener);
    return () => {
      window.removeEventListener('chat-selection-changed', handleChatSelectionChanged as EventListener);
    };
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateViewport = () => {
      setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
      setIsBelow768(window.innerWidth < 773);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  const shouldUseMobileNav = isBelow768;
  const hasOpenedChatInMessages = activeTab === 'messages' && Boolean(searchParams.get('chat'));
  // На мобильной вкладке сообщений меню скрываем только внутри конкретного чата.
  const hideBottomNavInOpenedChat = isBelow768 && hasOpenedChatInMessages;

  // Флаги первого монтирования по вкладкам — каждая вкладка монтируется при первом посещении и не размонтируется
  const [hasMountedMessages, setHasMountedMessages] = useState(true);
  const [hasMountedTasks, setHasMountedTasks] = useState(false);
  const [hasMountedCalendar, setHasMountedCalendar] = useState(false);
  const [hasMountedContacts, setHasMountedContacts] = useState(false);
  const [hasMountedLinks, setHasMountedLinks] = useState(false);
  const [hasMountedTools, setHasMountedTools] = useState(false);

  const handleTabChange = (tab: TabType) => {
    if (tab !== activeTab) {
      // Сохраняем текущий чат перед переключением вкладки (чтобы можно было вернуться)
      if (activeTab === 'messages') {
        try {
          const chatId = new URLSearchParams(window.location.search).get('chat');
          if (chatId) localStorage.setItem('lastOpenedChatId', chatId);
        } catch { /* ignore */ }
      }
    }
    setActiveTab(tab);
    window.dispatchEvent(new CustomEvent('account-tab-changed', { detail: { tab } }));
    router.push(`/account?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    if (activeTab === 'messages') setHasMountedMessages(true);
    if (activeTab === 'tasks') setHasMountedTasks(true);
    if (activeTab === 'calendar') setHasMountedCalendar(true);
    if (activeTab === 'contacts') setHasMountedContacts(true);
    if (activeTab === 'links') setHasMountedLinks(true);
    if (activeTab === 'tools') setHasMountedTools(true);
  }, [activeTab]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    document.body.classList.add('account-has-own-nav');
    return () => {
      document.body.classList.remove('account-has-own-nav');
    };
  }, []);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId) {
      browserPushRef.current?.stop();
      browserPushRef.current = null;
      return;
    }

    const service = new BrowserPushService();
    browserPushRef.current = service;

    void service.start({
      userId: String(userId),
      userName: currentUser?.name,
      getContext: () => ({
        activeTab: activeTabRef.current,
        isChatOpen: isChatOpenRef.current,
        activeChatId: activeChatIdRef.current ?? undefined,
      }),
    });

    return () => {
      service.stop();
      if (browserPushRef.current === service) {
        browserPushRef.current = null;
      }
    };
  }, [currentUser?.id, currentUser?.name]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.sharDesktop?.onOpenRoute) return;

    const unsubscribe = window.sharDesktop.onOpenRoute((url: string) => {
      if (!url) return;
      router.push(url, { scroll: false });
    });

    return unsubscribe;
  }, [router]);

  const handleLogout = () => {
    browserPushRef.current?.stop();
    browserPushRef.current = null;
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('myAccount');
    router.push('/login');
  };

  // Только контент инструментов вынесен в отдельный метод (не перестраивается при переключении вкладок)
  const renderToolsContent = () => (
    <div className="h-full min-h-full overflow-y-auto p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+92px)] bg-transparent">
            <div className="flex flex-col items-center mb-6 max-w-5xl mx-auto">
              <div className="flex items-center justify-between w-full">
                <h2 className="text-2xl font-bold text-center flex-1">Инструменты</h2>
                <button
                  onClick={toggleTheme}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                  title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5" strokeWidth={2} />
                  ) : (
                    <Moon className="w-5 h-5" strokeWidth={2} />
                  )}
                </button>
              </div>
              {/* Подсказка для десктопа */}
              <p className="hidden md:block text-xs text-[var(--text-tertiary)] mt-1">
                Перетащите инструмент в нижнюю панель для быстрого доступа
              </p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
              {ALL_TOOLS.filter(tool => {
                // Админ видит все + админ-панель
                if (currentUser?.role === 'admin') return true;
                // Админ-только инструменты скрыты для обычных пользователей
                if (tool.adminOnly) return false;
                // Стандартные инструменты (База ссылок, Настройки) видны всем
                if (tool.standard) return true;
                // Остальные - по enabledTools
                return currentUser?.enabledTools?.includes(tool.id);
              }).map((tool) => (
                <div
                  key={tool.id}
                  draggable={isDesktop}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    handleDragStart(e, tool.id);
                  }}
                  onDragEnd={handleDragEnd}
                  className={`relative ${isDesktop ? 'cursor-grab active:cursor-grabbing' : ''} ${draggingTool === tool.id ? 'opacity-50' : ''}`}
                >
                  <Link
                    href={tool.href}
                    className="flex flex-col items-center gap-2 group"
                    draggable={false}
                    onClick={(e) => {
                      if (draggingTool) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <div className="relative">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center transition-all duration-200 border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] shadow-[var(--shadow-card)]">
                        <div className={`drop-shadow-[0_2px_6px_rgba(0,0,0,0.2)] ${TOOL_ICON_COLORS[tool.id] || 'text-[var(--text-primary)]'}`}>
                          {React.cloneElement(tool.icon as React.ReactElement, { className: 'w-10 h-10 sm:w-12 sm:h-12', strokeWidth: 1.9 } as any)}
                        </div>
                      </div>
                      {/* Иконка перетаскивания (только десктоп) */}
                      <div className="hidden md:flex absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--bg-glass)] border border-[var(--border-glass)] items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-3 h-3 text-[var(--text-secondary)]" />
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm text-center text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] leading-tight">
                      {tool.name.includes(' ') ? tool.name.split(' ').map((word, i) => <span key={i}>{word}{i < tool.name.split(' ').length - 1 && <br/>}</span>) : tool.name}
                    </span>
                  </Link>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-5xl mx-auto mt-8 mb-2">
              {isElectronRuntime ? (
                /* Уже запущено в Electron — показываем версию приложения */
                <div className="sm:col-span-2 flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                  <div className="w-11 h-11 rounded-xl bg-[#0078d4]/15 border border-[#0078d4]/25 flex items-center justify-center flex-shrink-0">
                    <FaWindows className="w-5 h-5 text-[#0078d4]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Shar Desktop</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      версия {(typeof window !== 'undefined' && (window as any).sharDesktop?.appVersion) ? `v${(window as any).sharDesktop.appVersion}` : 'установлена'} · обновляется автоматически
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <a
                    href="/updates/Shar%20setup.exe"
                    className="group flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors px-4 py-4"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#0078d4]/15 border border-[#0078d4]/25 flex items-center justify-center flex-shrink-0">
                      <FaWindows className="w-5 h-5 text-[#0078d4]" />
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Скачать для Windows</div>
                  </a>

                  <a
                    href="/downloads/Shar-Android.apk"
                    className="group flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors px-4 py-4"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#3ddc84]/15 border border-[#3ddc84]/30 flex items-center justify-center flex-shrink-0">
                      <FaAndroid className="w-5 h-5 text-[#2bbf6a]" />
                    </div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Скачать для Android</div>
                  </a>
                </>
              )}
            </div>
          </div>
  );

  const isChatStyledTab = activeTab === 'tasks' || activeTab === 'contacts' || activeTab === 'tools' || activeTab === 'links' || activeTab === 'calendar';
  const isTauri = typeof window !== 'undefined' && localStorage.getItem('_platform') === 'tauri';
  const accountChatBackgroundColor = theme === 'dark'
    ? (chatSettings?.chatBackgroundDark || '#0f172a')
    : (chatSettings?.chatBackgroundLight || '#f8fafc');
  const accountChatBackgroundImage = theme === 'dark'
    ? String(chatSettings?.chatBackgroundImageDark || '').trim()
    : String(chatSettings?.chatBackgroundImageLight || '').trim();
  const accountChatOverlayImage = theme === 'dark'
    ? String(chatSettings?.chatOverlayImageDark || '').trim()
    : String(chatSettings?.chatOverlayImageLight || '').trim();
  const accountOverlayScale = Math.max(20, Math.min(200, Number(chatSettings?.chatOverlayScale ?? 100) || 100));
  const accountOverlayOpacity = Math.max(0, Math.min(1, Number(chatSettings?.chatOverlayOpacity ?? 1) || 1));
  const accountBottomNavShellClass = theme === 'dark'
    ? 'bg-[#1d293d] border-[#2a3a52] backdrop-blur-0'
    : 'bg-white border-gray-200 backdrop-blur-0';
  const mobileNavButtonBaseClass = 'w-12 h-12 flex-shrink-0 rounded-[100px] flex items-center justify-center transition-all duration-200 focus:outline-none border backdrop-blur-xl';
  const mobileNavButtonActiveClass = 'bg-blue-500/20 text-gray-900 dark:text-white border-blue-500/30 shadow-[inset_0_1px_2px_rgba(96,165,250,0.4),0_3px_8px_rgba(59,130,246,0.2)]';
  const mobileNavButtonIdleClass = 'text-[var(--text-primary)] bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] border-[var(--border-light)] shadow-[var(--shadow-card)]';
  const isElectronRuntime = typeof window !== 'undefined' && (
    Boolean((window as any).sharDesktop?.windowControls)
    || /electron/i.test(navigator.userAgent || '')
    || document.documentElement.classList.contains('electron-app')
    || document.documentElement.hasAttribute('data-electron-react-shell')
  );
  const accountContentBottomInset = shouldUseMobileNav
    ? 0
    : (isElectronRuntime ? 0 : 46);

  return (
    <div
      className={`h-full min-h-0 w-full max-w-full min-w-0 theme-text flex flex-col transition-colors duration-300 overflow-hidden overflow-x-hidden relative ${isTauri ? 'pt-8' : 'pt-[env(safe-area-inset-top,0px)]'} ${(activeTab === 'tasks' || activeTab === 'contacts' || activeTab === 'tools' || activeTab === 'links' || activeTab === 'calendar') ? '' : 'theme-bg'}`}
      style={isChatStyledTab
        ? {
            backgroundColor: accountChatBackgroundColor,
            ...(accountChatBackgroundImage
              ? {
                  backgroundImage: `url('${accountChatBackgroundImage}')`,
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center center'
                }
              : {})
          }
        : undefined}
    >
      {isChatStyledTab && accountChatOverlayImage && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: `url('${accountChatOverlayImage}')`,
            backgroundSize: `${accountOverlayScale * 3}px`,
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center center',
            opacity: accountOverlayOpacity,
            zIndex: 1,
          }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden overflow-x-hidden relative z-10" style={{ paddingBottom: `${accountContentBottomInset}px` }}>
        {/* Месседжер */}
        {hasMountedMessages && (
          <div className={`h-full min-w-0 overflow-x-hidden ${activeTab === 'messages' ? 'block' : 'hidden'}`}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-white/50">Загрузка сообщений...</div>
              </div>
            }>
              <MessagesBoard />
            </Suspense>
          </div>
        )}
        {/* Задачи */}
        {hasMountedTasks && (
          <div className={`h-full min-w-0 overflow-x-hidden ${activeTab === 'tasks' ? 'block' : 'hidden'}`}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-white/50">Загрузка задач...</div>
              </div>
            }>
              <TodosBoard />
            </Suspense>
          </div>
        )}
        {/* Календарь */}
        {hasMountedCalendar && (
          <div className={`h-full min-w-0 overflow-x-hidden ${activeTab === 'calendar' ? 'block' : 'hidden'}`}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-white/50">Загрузка календаря...</div>
              </div>
            }>
              <CalendarBoard />
            </Suspense>
          </div>
        )}
        {/* Контакты */}
        {hasMountedContacts && (
          <div className={`h-full min-w-0 overflow-y-auto overflow-x-hidden ${activeTab === 'contacts' ? 'block' : 'hidden'}`}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-white/50">Загрузка контактов...</div>
              </div>
            }>
              <ContactsBoard />
            </Suspense>
          </div>
        )}
        {/* Ссылки */}
        {hasMountedLinks && (
          <div className={`h-full min-w-0 overflow-y-auto overflow-x-hidden ${activeTab === 'links' ? 'block' : 'hidden'}`}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-white/50">Загрузка ссылок...</div>
              </div>
            }>
              <LinksBoard />
            </Suspense>
          </div>
        )}
        {/* Инструменты */}
        {hasMountedTools && (
          <div className={`h-full min-w-0 overflow-y-auto overflow-x-hidden ${activeTab === 'tools' ? 'block' : 'hidden'}`}>
            {renderToolsContent()}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar - стеклянные кнопки */}
      <div
        className={`bottom-nav-fixed fixed bottom-0 left-0 right-0 justify-center pt-2 pb-[max(env(safe-area-inset-bottom),10px)] px-3 z-40 pointer-events-none select-none overflow-visible ${shouldUseMobileNav && !hideBottomNavInOpenedChat ? 'flex' : 'hidden'}`}
        style={{ background: 'transparent' }}
        onCopy={(e) => e.preventDefault()}
      >
        <div className={`flex items-center gap-2 p-1.5 rounded-[100px] pointer-events-auto select-none border shadow-[var(--shadow-card)] ${accountBottomNavShellClass}`} onCopy={(e) => e.preventDefault()}>
          {visibleTabs.messages && (
          <button
            onClick={() => handleTabChange('messages')}
            className={`relative ${mobileNavButtonBaseClass} ${
              activeTab === 'messages'
                ? mobileNavButtonActiveClass
                : mobileNavButtonIdleClass
            }`}
          >
            <MessageCircle className="w-5 h-5" strokeWidth={2} />
            {unreadChatsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
              </span>
            )}
          </button>
          )}

          {visibleTabs.tasks && (
          <button
            onClick={() => handleTabChange('tasks')}
            className={`${mobileNavButtonBaseClass} ${
              activeTab === 'tasks'
                ? mobileNavButtonActiveClass
                : mobileNavButtonIdleClass
            }`}
          >
            <CheckSquare className="w-5 h-5" strokeWidth={2} />
          </button>
          )}

          {visibleTabs.calendar && (
          <button
            onClick={() => handleTabChange('calendar')}
            className={`${mobileNavButtonBaseClass} ${
              activeTab === 'calendar'
                ? mobileNavButtonActiveClass
                : mobileNavButtonIdleClass
            }`}
          >
            <Calendar className="w-5 h-5" strokeWidth={2} />
          </button>
          )}

          {visibleTabs.contacts && (
          <button
            onClick={() => handleTabChange('contacts')}
            className={`${mobileNavButtonBaseClass} ${
              activeTab === 'contacts'
                ? mobileNavButtonActiveClass
                : mobileNavButtonIdleClass
            }`}
          >
            <Users className="w-5 h-5" strokeWidth={2} />
          </button>
          )}

          {visibleTabs.links && (
          <button
            onClick={() => handleTabChange('links')}
            className={`${mobileNavButtonBaseClass} ${
              activeTab === 'links'
                ? mobileNavButtonActiveClass
                : mobileNavButtonIdleClass
            }`}
          >
            <Globe className="w-5 h-5" strokeWidth={2} />
          </button>
          )}

          <button
            onClick={() => handleTabChange('tools')}
            className={`${mobileNavButtonBaseClass} ${
              activeTab === 'tools'
                ? mobileNavButtonActiveClass
                : mobileNavButtonIdleClass
            }`}
          >
            <MoreVertical className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Desktop Bottom Status Bar - glassmorphism style with drop zone */}
      <div 
        className={`desktop-navigation fixed bottom-0 left-0 right-0 h-[46px] border-t z-[101] items-center justify-between px-4 transition-all duration-200 overflow-visible ${shouldUseMobileNav ? 'hidden' : 'flex'} ${
          isDragOverBar 
            ? 'bg-[#007aff]/20 border-[#007aff]/50 backdrop-blur-xl' 
            : accountBottomNavShellClass
        }`}
        style={{ fontSize: '12px' }}
        onCopy={(e) => e.preventDefault()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Left side - Navigation */}
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar select-none py-1 px-1" onCopy={(e) => e.preventDefault()}>
          {visibleTabs.messages && (
          <button
            onClick={() => handleTabChange('messages')}
            className={`relative px-3 lg:px-4 py-1.5 lg:py-2 min-h-[32px] lg:min-h-[36px] rounded-[20px] flex items-center gap-1 lg:gap-2 text-[12px] font-medium transition-all min-w-0 ${
              activeTab === 'messages'
                ? 'bg-[#007aff]/20 text-gray-900 dark:text-white border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            <MessageCircle className="hidden lg:block w-3.5 h-3.5" />
            <span>Чаты</span>
            {unreadChatsCount > 0 && (
              <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
              </span>
            )}
          </button>
          )}

          {visibleTabs.tasks && (
          <button
            onClick={() => handleTabChange('tasks')}
            className={`px-3 lg:px-4 py-1.5 lg:py-2 min-h-[32px] lg:min-h-[36px] rounded-[20px] flex items-center gap-1 lg:gap-2 text-[12px] font-medium transition-all min-w-0 ${
              activeTab === 'tasks'
                ? 'bg-[#007aff]/20 text-gray-900 dark:text-white border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            <CheckSquare className="hidden lg:block w-3.5 h-3.5" />
            <span>Задачи</span>
          </button>
          )}

          {visibleTabs.calendar && (
          <button
            onClick={() => handleTabChange('calendar')}
            className={`px-3 lg:px-4 py-1.5 lg:py-2 min-h-[32px] lg:min-h-[36px] rounded-[20px] flex items-center gap-1 lg:gap-2 text-[12px] font-medium transition-all min-w-0 ${
              activeTab === 'calendar'
                ? 'bg-[#007aff]/20 text-gray-900 dark:text-white border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            <Calendar className="hidden lg:block w-3.5 h-3.5" />
            <span>Календарь</span>
          </button>
          )}

          {visibleTabs.contacts && (
          <button
            onClick={() => handleTabChange('contacts')}
            className={`px-3 lg:px-4 py-1.5 lg:py-2 min-h-[32px] lg:min-h-[36px] rounded-[20px] flex items-center gap-1 lg:gap-2 text-[12px] font-medium transition-all min-w-0 ${
              activeTab === 'contacts'
                ? 'bg-[#007aff]/20 text-gray-900 dark:text-white border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            <Users className="hidden lg:block w-3.5 h-3.5" />
            <span>Контакты</span>
          </button>
          )}

          {visibleTabs.links && (
          <button
            onClick={() => handleTabChange('links')}
            className={`px-3 lg:px-4 py-1.5 lg:py-2 min-h-[32px] lg:min-h-[36px] rounded-[20px] flex items-center gap-1 lg:gap-2 text-[12px] font-medium transition-all min-w-0 ${
              activeTab === 'links'
                ? 'bg-[#007aff]/20 text-gray-900 dark:text-white border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            <Globe className="hidden lg:block w-3.5 h-3.5" />
            <span>Ссылки</span>
          </button>
          )}

          <button
            onClick={() => handleTabChange('tools')}
            className={`w-[32px] h-[32px] rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              activeTab === 'tools'
                ? 'bg-[#007aff]/20 text-gray-900 dark:text-white border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-primary)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
            title="Инструменты"
          >
            <MoreVertical className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Center - Pinned Tools (показываем только первые 3-5 в зависимости от ширины экрана) */}
        {pinnedTools.length > 0 && (
          <div className="flex items-center gap-1 overflow-visible max-w-[calc(100%-320px)] xl:max-w-none">
            {pinnedTools.slice(0, 6).map((toolId, index) => {
              const tool = ALL_TOOLS.find(t => t.id === toolId);
              if (!tool) return null;
              // Проверяем доступ к инструменту
              const hasAccess = currentUser?.role === 'admin' || 
                tool.standard || 
                currentUser?.enabledTools?.includes(tool.id);
              if (!hasAccess) return null;
              return (
                <div 
                  key={toolId} 
                  className={`relative group flex-shrink-0 ${index >= 5 ? 'hidden xl:block' : ''} ${index >= 4 ? 'hidden lg:block' : ''}`}
                >
                  <Link
                    href={tool.href}
                    className="flex items-center justify-center xl:justify-start gap-1.5 w-8 h-8 xl:w-auto xl:max-w-[170px] rounded-xl transition-all px-0 xl:px-2 py-0 xl:py-1.5 bg-gradient-to-b from-white/10 to-white/5 border border-white/20 hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setPinnedToolContextMenu({
                        toolId,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    title={tool.name}
                  >
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${tool.gradient} flex items-center justify-center relative overflow-hidden shadow-sm backdrop-blur-sm`}>
                      {/* Apple-style glass */}
                      <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent opacity-80 rounded-full" />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 rounded-full" />
                      {/* Highlight */}
                      <div className="absolute top-[8%] left-[12%] right-[12%] h-[25%] bg-white/50 rounded-full blur-sm" />
                      {/* Icon */}
                      <div className="relative z-10 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
                        {tool.id === 'feed-editor' && <Code2 className="w-2.5 h-2.5 text-white" strokeWidth={2} />}
                        {tool.id === 'transliterator' && <Type className="w-2.5 h-2.5 text-white" strokeWidth={2} />}
                        {tool.id === 'slovolov' && <Zap className="w-2.5 h-2.5 text-white" strokeWidth={2} />}
                        {tool.id === 'utm-generator' && <Hash className="w-2.5 h-2.5 text-white" strokeWidth={2} />}
                        {tool.id === 'slovolov-pro' && <Package2 className="w-2.5 h-2.5 text-white" strokeWidth={2} />}
                        {tool.id === 'content-plan' && <PenTool className="w-2.5 h-2.5 text-white" strokeWidth={2} />}
                        {tool.id === 'links' && <Globe className="w-2.5 h-2.5 text-white" strokeWidth={2} />}
                        {tool.id === 'admin' && <Shield className="w-2.5 h-2.5 text-white" strokeWidth={2} />}
                      </div>
                    </div>
                    <span className="hidden xl:inline truncate text-[10px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                      {tool.name}
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Right side - User info */}
        <div className="flex items-center gap-3">
          {/* User Info - кликабельно для открытия меню */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center gap-2 transition-all cursor-pointer"
              >
                <Avatar
                  type="user"
                  name={currentUser.name || 'User'}
                  src={currentUser.avatar}
                  size="sm"
                  isOnline={true}
                />
              </button>
              
              {/* Выпадающее меню */}
              {showAccountMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowAccountMenu(false)}
                  />
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        toggleTheme();
                        setShowAccountMenu(false);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                    >
                      {theme === 'dark' ? (
                        <>
                          <Sun className="w-4 h-4 text-[var(--text-secondary)]" />
                          <span className="text-sm text-[var(--text-primary)]">Светлая тема</span>
                        </>
                      ) : (
                        <>
                          <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
                          <span className="text-sm text-[var(--text-primary)]">Тёмная тема</span>
                        </>
                      )}
                    </button>
                    <div className="h-px bg-[var(--border-primary)]" />
                    <button
                      onClick={() => {
                        setShowAccountMenu(false);
                        window.location.href = '/settings';
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                    >
                      <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
                      <span className="text-sm text-[var(--text-primary)]">Настройки</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {pinnedToolContextMenu && (
        <div
          className="fixed z-[220] min-w-[180px] rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden"
          style={{
            left: pinnedToolContextMenu.x,
            top: pinnedToolContextMenu.y,
            transform: 'translate(-50%, calc(-100% - 8px))',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-2.5 text-left text-sm text-red-400 hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              removePinnedTool(pinnedToolContextMenu.toolId);
              setPinnedToolContextMenu(null);
            }}
          >
            <X className="w-4 h-4" />
            Открепить
          </button>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && currentUser && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 pb-20"
          onClick={() => setShowProfileModal(false)}
        >
          <div 
            className={`rounded-2xl w-full max-w-md shadow-2xl border ${theme === 'dark' ? 'bg-[#0b0b0d] border-[#232323]' : 'bg-[var(--bg-secondary)] border-[var(--border-primary)]'} backdrop-blur-xl`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-[#232323]' : 'border-[var(--border-primary)]'}`}>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Профиль</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4">
                <AvatarUpload
                  currentAvatar={currentUser.avatar}
                  userId={currentUser.id}
                  userName={currentUser.name}
                  onAvatarChange={(newAvatarUrl) => {
                    setCurrentUser((prev: any) => ({
                      ...prev,
                      avatar: newAvatarUrl
                    }));
                    // Обновляем myAccount в localStorage
                    const myAccountStr = localStorage.getItem('myAccount');
                    if (myAccountStr) {
                      const myAccount = JSON.parse(myAccountStr);
                      myAccount.avatar = newAvatarUrl;
                      localStorage.setItem('myAccount', JSON.stringify(myAccount));
                    }
                  }}
                />
                <p className="text-sm text-[var(--text-secondary)]">
                  Нажмите на камеру, чтобы загрузить фото
                </p>
              </div>

              {/* User Info */}
              <div className="space-y-4">
                <div className="min-w-0">
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Имя</label>
                  <div className="text-[var(--text-primary)] font-medium truncate">{currentUser.name}</div>
                </div>
                <div className="min-w-0">
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Email</label>
                  <div className="text-[var(--text-primary)] truncate">{currentUser.email}</div>
                </div>
                {currentUser.role && (
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Роль</label>
                    <div className="text-[var(--text-primary)] capitalize">{currentUser.role}</div>
                  </div>
                )}
                
                {/* Editable fields */}
                {isEditingProfile ? (
                  <>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Телефон</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+7 (999) 123-45-67"
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)] ${theme === 'dark' ? 'bg-[#121215] border-[#2a2a2f] text-gray-100' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">График работы</label>
                      <input
                        type="text"
                        value={editForm.workSchedule}
                        onChange={(e) => setEditForm(prev => ({ ...prev, workSchedule: e.target.value }))}
                        placeholder="Пн-Пт 9:00-18:00"
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)] ${theme === 'dark' ? 'bg-[#121215] border-[#2a2a2f] text-gray-100' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Должность</label>
                      <input
                        type="text"
                        value={editForm.position}
                        onChange={(e) => setEditForm(prev => ({ ...prev, position: e.target.value }))}
                        placeholder="Менеджер"
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)] ${theme === 'dark' ? 'bg-[#121215] border-[#2a2a2f] text-gray-100' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Отдел</label>
                      <input
                        type="text"
                        value={editForm.department}
                        onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="Отдел продаж"
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)] ${theme === 'dark' ? 'bg-[#121215] border-[#2a2a2f] text-gray-100' : 'bg-[var(--bg-tertiary)] border-[var(--border-color)]'}`}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {(currentUser.phone || currentUser.workSchedule || currentUser.position || currentUser.department) && (
                      <>
                        {currentUser.phone && (
                          <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Телефон</label>
                            <div className="text-[var(--text-primary)]">{currentUser.phone}</div>
                          </div>
                        )}
                        {currentUser.workSchedule && (
                          <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">График работы</label>
                            <div className="text-[var(--text-primary)]">{currentUser.workSchedule}</div>
                          </div>
                        )}
                        {currentUser.position && (
                          <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Должность</label>
                            <div className="text-[var(--text-primary)]">{currentUser.position}</div>
                          </div>
                        )}
                        {currentUser.department && (
                          <div>
                            <label className="block text-xs text-[var(--text-secondary)] mb-1">Отдел</label>
                            <div className="text-[var(--text-primary)]">{currentUser.department}</div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex gap-2 ${theme === 'dark' ? 'border-[#232323]' : 'border-[var(--border-primary)]'}`}>
              {isEditingProfile ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditingProfile(false);
                      setEditForm({
                        phone: currentUser.phone || '',
                        workSchedule: currentUser.workSchedule || '',
                        position: currentUser.position || '',
                        department: currentUser.department || ''
                      });
                    }}
                    className={`flex-1 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity ${theme === 'dark' ? 'bg-[#16161a] text-gray-100' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={async () => {
                      if (!currentUser?.id) return;
                      setSavingProfile(true);
                      try {
                        const res = await fetch(`/api/users/${currentUser.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(editForm)
                        });
                        if (res.ok) {
                          const updated = await res.json();
                          setCurrentUser((prev: any) => ({ ...prev, ...editForm }));
                          setIsEditingProfile(false);
                        }
                      } catch (err) {
                        console.error('Error updating profile:', err);
                      } finally {
                        setSavingProfile(false);
                      }
                    }}
                    disabled={savingProfile}
                    className="flex-1 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {savingProfile ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditForm({
                        phone: currentUser.phone || '',
                        workSchedule: currentUser.workSchedule || '',
                        position: currentUser.position || '',
                        department: currentUser.department || ''
                      });
                      setIsEditingProfile(true);
                    }}
                    className={`flex-1 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity ${theme === 'dark' ? 'bg-[#16161a] text-gray-100' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    Закрыть
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
