'use client';

import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageCircle, CheckSquare, Calendar, Users, MoreVertical, Shield, FileText, Languages, Sparkles, Link2, Box, Globe, Megaphone, Sun, Moon, GripVertical, X, Settings, User, ChevronUp, Type, MessageSquare, CheckCircle, Info, Zap, Code2, PenTool, Hash, Package2 } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import Avatar from '@/components/Avatar';
import AvatarUpload from '@/components/AvatarUpload';

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
    colorPreset: 0
  });
  
  // Состояния для drag & drop инструментов
  const [pinnedTools, setPinnedTools] = useState<string[]>([]);
  const [draggingTool, setDraggingTool] = useState<string | null>(null);
  const [isDragOverBar, setIsDragOverBar] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 540 : false);
  const [isTouchDevice, setIsTouchDevice] = useState(() => typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false);
  const [isBelow768, setIsBelow768] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 773 : false);
  
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
              const settings = { ...defaultSettings, ...user.chatSettings };
              setChatSettings(settings);
              // Сохраняем в localStorage для быстрого доступа (не как источник правды)
              localStorage.setItem('chatSettings', JSON.stringify(settings));
            } else {
              setChatSettings(defaultSettings);
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
        setChatSettings(defaultSettings);
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
        const unreadCount = chats.filter((chat: any) => (chat.unreadCount || 0) > 0).length;
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
  }, [searchParams]);

  // Интервал для проверки URL параметра chat (replaceState не триггерит searchParams)
  useEffect(() => {
    const checkChatOpen = () => {
      if (typeof window !== 'undefined') {
        // Проверяем URL + localStorage (URL иногда обновляется не сразу)
        const url = new URL(window.location.href);
        const chatIdFromUrl = url.searchParams.get('chat');
        const chatIdFromStorage = localStorage.getItem('selectedChatId');
        // Считаем чат открытым только если мы на вкладке messages и chat есть в URL
        const isMessagesTab = activeTab === 'messages';
        const hasChatSelected = !!(chatIdFromUrl || chatIdFromStorage);
        setIsChatOpen(isMessagesTab && hasChatSelected);
      }
    };

    const handleChatSelectionChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen?: boolean }>;
      const isOpen = !!customEvent.detail?.isOpen;
      setIsChatOpen(activeTab === 'messages' && isOpen);
    };

    checkChatOpen();
    window.addEventListener('chat-selection-changed', handleChatSelectionChanged as EventListener);
    const interval = setInterval(checkChatOpen, 1000); // fallback синхронизация

    return () => {
      clearInterval(interval);
      window.removeEventListener('chat-selection-changed', handleChatSelectionChanged as EventListener);
    };
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateViewport = () => {
      setIsCompactViewport(window.innerWidth <= 540);
      setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
      setIsBelow768(window.innerWidth < 773);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  const shouldUseMobileNav = isCompactViewport || isTouchDevice;
  // На мобильной версии полностью скрываем нижнее меню на вкладке чатов,
  // когда открыт конкретный чат (видна кнопка "Назад")
  const hideBottomNavInOpenedChat = activeTab === 'messages' && isBelow768 && isChatOpen;

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/account?tab=${tab}`, { scroll: false });
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('myAccount');
    router.push('/login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'messages':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-white/50">Загрузка сообщений...</div>
            </div>
          }>
            <MessagesBoard />
          </Suspense>
        );
      
      case 'tasks':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-white/50">Загрузка задач...</div>
            </div>
          }>
            <TodosBoard />
          </Suspense>
        );
      
      case 'calendar':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-white/50">Загрузка календаря...</div>
            </div>
          }>
            <CalendarBoard />
          </Suspense>
        );
      
      case 'contacts':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-white/50">Загрузка контактов...</div>
            </div>
          }>
            <ContactsBoard />
          </Suspense>
        );
      
      case 'links':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-white/50">Загрузка ссылок...</div>
            </div>
          }>
            <LinksBoard />
          </Suspense>
        );
      
      case 'tools':
        return (
          <div className="h-full min-h-full overflow-y-auto p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+92px)] bg-[var(--bg-primary)]">
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
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`h-screen w-full max-w-full min-w-0 theme-text flex flex-col transition-colors duration-300 overflow-hidden overflow-x-hidden ${activeTab === 'messages' ? '' : 'theme-bg'}`}>
      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-hidden overflow-x-hidden">
        <div className={`h-full min-w-0 ${activeTab === 'tasks' ? '' : 'overflow-y-auto'} overflow-x-hidden`}>
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar - стеклянные кнопки */}
      <div className={`bottom-nav-fixed fixed bottom-0 left-0 right-0 justify-center pt-3 pb-[max(env(safe-area-inset-bottom),12px)] px-3 z-40 pointer-events-none select-none overflow-visible ${shouldUseMobileNav && !hideBottomNavInOpenedChat ? 'flex' : 'hidden'}`} onCopy={(e) => e.preventDefault()}>
        <div className="flex items-center gap-2 pointer-events-auto backdrop-blur-xl bg-gradient-to-b from-white/12 to-white/5 border border-white/25 rounded-full px-3 py-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_10px_24px_rgba(0,0,0,0.22)] select-none" onCopy={(e) => e.preventDefault()}>
          {visibleTabs.messages && (
          <button
            onClick={() => handleTabChange('messages')}
            className={`relative w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'messages'
                ? 'bg-blue-500/20 text-gray-900 dark:text-white border border-blue-500/30 shadow-[inset_0_1px_2px_rgba(96,165,250,0.4),0_3px_8px_rgba(59,130,246,0.2)] backdrop-blur-xl'
                : 'text-[var(--text-primary)] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm'
            }`}
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2} />
            {unreadChatsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
              </span>
            )}
          </button>
          )}

          {visibleTabs.tasks && (
          <button
            onClick={() => handleTabChange('tasks')}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'tasks'
                ? 'bg-blue-500/20 text-gray-900 dark:text-white border border-blue-500/30 shadow-[inset_0_1px_2px_rgba(96,165,250,0.4),0_3px_8px_rgba(59,130,246,0.2)] backdrop-blur-xl'
                : 'text-[var(--text-primary)] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm'
            }`}
          >
            <CheckSquare className="w-4 h-4" strokeWidth={2} />
          </button>
          )}

          {visibleTabs.calendar && (
          <button
            onClick={() => handleTabChange('calendar')}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'calendar'
                ? 'bg-blue-500/20 text-gray-900 dark:text-white border border-blue-500/30 shadow-[inset_0_1px_2px_rgba(96,165,250,0.4),0_3px_8px_rgba(59,130,246,0.2)] backdrop-blur-xl'
                : 'text-[var(--text-primary)] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm'
            }`}
          >
            <Calendar className="w-4 h-4" strokeWidth={2} />
          </button>
          )}

          {visibleTabs.contacts && (
          <button
            onClick={() => handleTabChange('contacts')}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'contacts'
                ? 'bg-blue-500/20 text-gray-900 dark:text-white border border-blue-500/30 shadow-[inset_0_1px_2px_rgba(96,165,250,0.4),0_3px_8px_rgba(59,130,246,0.2)] backdrop-blur-xl'
                : 'text-[var(--text-primary)] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm'
            }`}
          >
            <Users className="w-4 h-4" strokeWidth={2} />
          </button>
          )}

          {visibleTabs.links && (
          <button
            onClick={() => handleTabChange('links')}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'links'
                ? 'bg-blue-500/20 text-gray-900 dark:text-white border border-blue-500/30 shadow-[inset_0_1px_2px_rgba(96,165,250,0.4),0_3px_8px_rgba(59,130,246,0.2)] backdrop-blur-xl'
                : 'text-[var(--text-primary)] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm'
            }`}
          >
            <Globe className="w-4 h-4" strokeWidth={2} />
          </button>
          )}

          <button
            onClick={() => handleTabChange('tools')}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'tools'
                ? 'bg-blue-500/20 text-gray-900 dark:text-white border border-blue-500/30 shadow-[inset_0_1px_2px_rgba(96,165,250,0.4),0_3px_8px_rgba(59,130,246,0.2)] backdrop-blur-xl'
                : 'text-[var(--text-primary)] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm'
            }`}
          >
            <MoreVertical className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Desktop Bottom Status Bar - glassmorphism style with drop zone */}
      <div 
        className={`desktop-navigation fixed bottom-0 left-0 right-0 h-[46px] backdrop-blur-xl border-t z-[101] items-center justify-between px-4 transition-all duration-200 overflow-visible ${shouldUseMobileNav || hideBottomNavInOpenedChat ? 'hidden' : 'flex'} ${
          isDragOverBar 
            ? 'bg-[#007aff]/20 border-[#007aff]/50' 
            : 'bg-[var(--bg-glass)] border-[var(--border-glass)]'
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
                    className="flex items-center gap-1.5 text-[10px] font-medium transition-all px-2 py-1.5 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/20 hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]"
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
                    <span className="hidden md:inline text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{tool.name}</span>
                  </Link>
                  <button
                    onClick={(e) => { e.preventDefault(); removePinnedTool(toolId); }}
                    className="hidden lg:flex absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Открепить"
                  >
                    <X className="w-2.5 h-2.5" strokeWidth={3} />
                  </button>
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

      {/* Profile Modal */}
      {showProfileModal && currentUser && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowProfileModal(false)}
        >
          <div 
            className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md shadow-2xl border border-[var(--border-primary)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
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
                        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">График работы</label>
                      <input
                        type="text"
                        value={editForm.workSchedule}
                        onChange={(e) => setEditForm(prev => ({ ...prev, workSchedule: e.target.value }))}
                        placeholder="Пн-Пт 9:00-18:00"
                        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Должность</label>
                      <input
                        type="text"
                        value={editForm.position}
                        onChange={(e) => setEditForm(prev => ({ ...prev, position: e.target.value }))}
                        placeholder="Менеджер"
                        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Отдел</label>
                      <input
                        type="text"
                        value={editForm.department}
                        onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="Отдел продаж"
                        className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent-primary)]"
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
            <div className="p-4 border-t border-[var(--border-primary)] flex gap-2">
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
                    className="flex-1 py-2.5 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium hover:opacity-90 transition-opacity"
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
                    className="flex-1 py-2.5 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium hover:opacity-90 transition-opacity"
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
