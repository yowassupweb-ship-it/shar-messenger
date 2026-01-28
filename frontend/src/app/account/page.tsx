'use client';

import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageCircle, CheckSquare, Calendar, Users, MoreVertical, Shield, FileText, Languages, Sparkles, Link2, Box, Globe, Megaphone, Sun, Moon, GripVertical, X, Settings, User, ChevronUp, Type, MessageSquare } from 'lucide-react';
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
const LinksBoard = lazy(() => import('../../components/LinksBoard'));

type TabType = 'messages' | 'tasks' | 'calendar' | 'contacts' | 'tools' | 'links';

// Стандартные инструменты (доступны всем)
const STANDARD_TOOL_IDS = ['messages', 'tasks', 'calendar', 'links', 'chat-settings'];

// Список всех инструментов
const ALL_TOOLS: Tool[] = [
  { id: 'feed-editor', name: 'Редактор фидов', href: '/feed-editor', icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-blue-500 to-indigo-600' },
  { id: 'transliterator', name: 'Транслитератор', href: '/transliterator', icon: <Languages className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-emerald-500 to-teal-600' },
  { id: 'slovolov', name: 'Словолов', href: '/slovolov', icon: <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-pink-500 to-rose-600' },
  { id: 'utm-generator', name: 'Генератор UTM', href: '/utm-generator', icon: <Link2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-fuchsia-500 to-pink-600' },
  { id: 'slovolov-pro', name: 'Словолов PRO', href: '/slovolov-pro', icon: <Box className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-cyan-500 to-blue-600' },
  { id: 'content-plan', name: 'Контент-план', href: '/content-plan', icon: <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-purple-500 to-violet-600' },
  { id: 'chat-settings', name: 'Настройки', href: '/chat-settings', icon: <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-gray-500 to-slate-600', standard: true },
  { id: 'admin', name: 'Админка', href: '/admin', icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-amber-500 to-orange-600', adminOnly: true },
];

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
            if (user.chatSettings) {
              setChatSettings({ ...defaultSettings, ...user.chatSettings });
              localStorage.setItem('chatSettings', JSON.stringify({ ...defaultSettings, ...user.chatSettings }));
              return;
            }
          }
        }
        // Fallback на localStorage
        const savedSettings = localStorage.getItem('chatSettings');
        if (savedSettings) {
          setChatSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
        }
      } catch {
        const savedSettings = localStorage.getItem('chatSettings');
        if (savedSettings) {
          try { setChatSettings({ ...defaultSettings, ...JSON.parse(savedSettings) }); } catch {}
        }
      }
    };
    loadChatSettings();
  }, []);

  // Сохранение настроек чата на сервер
  const saveChatSettings = async (newSettings: typeof chatSettings) => {
    setChatSettings(newSettings);
    localStorage.setItem('chatSettings', JSON.stringify(newSettings));
    // Dispatch event для обновления в других компонентах
    window.dispatchEvent(new CustomEvent('chatSettingsChanged', { detail: newSettings }));
    
    // Сохраняем на сервер
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
              return;
            }
          }
        }
        // Fallback на localStorage если не удалось загрузить с сервера
        const saved = localStorage.getItem('pinnedTools');
        if (saved) {
          setPinnedTools(JSON.parse(saved));
        }
      } catch {
        const saved = localStorage.getItem('pinnedTools');
        if (saved) {
          try { setPinnedTools(JSON.parse(saved)); } catch { setPinnedTools([]); }
        }
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
    // Также сохраняем в localStorage как fallback
    localStorage.setItem('pinnedTools', JSON.stringify(tools));
    
    // Сохраняем на сервер
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
              // Сохраняем в localStorage для будущего использования (с аватаром)
              localStorage.setItem('myAccount', JSON.stringify({ 
                id: account.id, 
                name: user.name,
                avatar: user.avatar 
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
        // Проверяем и URL и localStorage
        const url = new URL(window.location.href);
        const chatIdFromUrl = url.searchParams.get('chat');
        const chatIdFromStorage = localStorage.getItem('selectedChatId');
        // Считаем чат открытым если мы на вкладке messages И есть выбранный чат
        const isMessagesTab = activeTab === 'messages';
        const hasChatSelected = !!(chatIdFromUrl || chatIdFromStorage);
        setIsChatOpen(isMessagesTab && hasChatSelected);
      }
    };
    const interval = setInterval(checkChatOpen, 1000); // Уменьшено с 300ms
    return () => clearInterval(interval);
  }, [activeTab]);

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
          <div className="p-4 sm:p-6 pb-24">
            <div className="flex flex-col items-center mb-6 max-w-5xl mx-auto">
              <div className="flex items-center justify-between w-full">
                <h2 className="text-2xl font-bold text-center flex-1">Инструменты</h2>
                <button
                  onClick={toggleTheme}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-xl bg-[var(--bg-secondary)]/60 border border-white/10 hover:border-white/20 hover:bg-[var(--bg-tertiary)]/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]"
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
                      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center group-hover:scale-110 transition-all shadow-lg`}>
                        {tool.icon}
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

            {/* Быстрые действия - Уведомления и Избранное */}
            <div className="mt-8 max-w-5xl mx-auto">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Быстрые действия</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Уведомления */}
                <button
                  onClick={async () => {
                    try {
                      const myAccountStr = localStorage.getItem('myAccount');
                      if (!myAccountStr) return;
                      const myAccount = JSON.parse(myAccountStr);
                      router.push(`/account?tab=messages&chat=notifications_${myAccount.id}`);
                    } catch {}
                  }}
                  className="flex flex-col items-center gap-3 p-5 bg-[var(--bg-secondary)] rounded-2xl hover:bg-[var(--bg-tertiary)] transition-colors group"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">Уведомления</span>
                </button>
                
                {/* Избранное */}
                <button
                  onClick={async () => {
                    try {
                      const myAccountStr = localStorage.getItem('myAccount');
                      if (!myAccountStr) return;
                      const myAccount = JSON.parse(myAccountStr);
                      router.push(`/account?tab=messages&chat=favorites_${myAccount.id}`);
                    } catch {}
                  }}
                  className="flex flex-col items-center gap-3 p-5 bg-[var(--bg-secondary)] rounded-2xl hover:bg-[var(--bg-tertiary)] transition-colors group"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">Избранное</span>
                </button>
              </div>

              {/* Настройки шрифта */}
              <div className="w-full mt-8 bg-[var(--bg-secondary)] rounded-2xl p-5">
                <h3 className="text-lg font-semibold mb-4">Размер шрифта сообщений</h3>
                
                <div className="flex gap-4">
                  {/* Мобильный */}
                  <div className="flex-1">
                    <label className="text-sm text-[var(--text-muted)] mb-2 block">Телефон</label>
                    <input
                      type="range"
                      min="12"
                      max="18"
                      value={chatSettings.fontSizeMobile}
                      onChange={(e) => saveChatSettings({ ...chatSettings, fontSizeMobile: parseInt(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                    <div className="text-center text-sm font-medium mt-1">{chatSettings.fontSizeMobile}px</div>
                  </div>

                  {/* Десктоп */}
                  <div className="flex-1">
                    <label className="text-sm text-[var(--text-muted)] mb-2 block">Компьютер</label>
                    <input
                      type="range"
                      min="12"
                      max="20"
                      value={chatSettings.fontSize}
                      onChange={(e) => saveChatSettings({ ...chatSettings, fontSize: parseInt(e.target.value) })}
                      className="w-full accent-blue-500"
                    />
                    <div className="text-center text-sm font-medium mt-1">{chatSettings.fontSize}px</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`h-screen theme-text flex flex-col transition-colors duration-300 overflow-hidden ${activeTab === 'messages' ? '' : 'theme-bg'}`}>
      {/* Main Content */}
      <div className={`flex-1 overflow-hidden ${activeTab === 'messages' || activeTab === 'tasks' ? '' : 'pb-24 md:pb-16'}`}>
        <div className={`h-full ${activeTab === 'tasks' ? '' : 'overflow-y-auto'}`}>
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar - стеклянные кнопки */}
      <div className={`bottom-nav-fixed md:hidden fixed bottom-0 left-0 right-0 flex justify-center pb-4 px-3 z-40 pointer-events-none select-none ${isChatOpen ? 'hidden' : ''}`}>
        <div className="flex items-center gap-2 pointer-events-auto backdrop-blur-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/20 rounded-full px-3 py-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_20px_rgba(0,0,0,0.3)]">
          <button
            onClick={() => handleTabChange('messages')}
            className={`relative w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'messages'
                ? 'bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
            }`}
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2} />
            {unreadChatsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('tasks')}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'tasks'
                ? 'bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
            }`}
          >
            <CheckSquare className="w-4 h-4" strokeWidth={2} />
          </button>

          <button
            onClick={() => handleTabChange('calendar')}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'calendar'
                ? 'bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
            }`}
          >
            <Calendar className="w-4 h-4" strokeWidth={2} />
          </button>

          <button
            onClick={() => handleTabChange('contacts')}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'contacts'
                ? 'bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" strokeWidth={2} />
          </button>

          <button
            onClick={() => handleTabChange('links')}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'links'
                ? 'bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
            }`}
          >
            <Globe className="w-4 h-4" strokeWidth={2} />
          </button>

          <button
            onClick={() => handleTabChange('tools')}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'tools'
                ? 'bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
            }`}
          >
            <MoreVertical className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Desktop Bottom Status Bar - glassmorphism style with drop zone */}
      <div 
        className={`hidden md:flex fixed bottom-0 left-0 right-0 h-[48px] backdrop-blur-xl border-t z-40 items-center justify-between px-4 transition-all duration-200 ${
          isDragOverBar 
            ? 'bg-[#007aff]/20 border-[#007aff]/50' 
            : 'bg-[var(--bg-glass)] border-[var(--border-glass)]'
        }`}
        style={{ fontSize: '12px' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Left side - Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleTabChange('messages')}
            className={`relative px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-medium transition-all whitespace-nowrap ${
              activeTab === 'messages'
                ? 'bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Сообщения</span>
            {unreadChatsCount > 0 && (
              <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('tasks')}
            className={`px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-medium transition-all whitespace-nowrap ${
              activeTab === 'tasks'
                ? 'bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Задачи</span>
          </button>

          <button
            onClick={() => handleTabChange('calendar')}
            className={`px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-medium transition-all whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Календарь</span>
          </button>

          <button
            onClick={() => handleTabChange('contacts')}
            className={`px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-medium transition-all whitespace-nowrap ${
              activeTab === 'contacts'
                ? 'bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Контакты</span>
          </button>

          <button
            onClick={() => handleTabChange('links')}
            className={`px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-medium transition-all whitespace-nowrap ${
              activeTab === 'links'
                ? 'bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Ссылки</span>
          </button>

          <button
            onClick={() => handleTabChange('tools')}
            className={`w-[32px] h-[32px] rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              activeTab === 'tools'
                ? 'bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
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
                  className={`relative group flex-shrink-0 ${index >= 4 ? 'hidden xl:block' : ''} ${index >= 3 ? 'hidden lg:block' : ''}`}
                >
                  <Link
                    href={tool.href}
                    className="px-2 py-1.5 rounded-[16px] flex items-center gap-1.5 text-xs font-medium transition-all bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]"
                  >
                    <div className={`w-5 h-5 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center`}>
                      {tool.id === 'feed-editor' && <FileText className="w-3 h-3 text-white" strokeWidth={2} />}
                      {tool.id === 'transliterator' && <Languages className="w-3 h-3 text-white" strokeWidth={2} />}
                      {tool.id === 'slovolov' && <Sparkles className="w-3 h-3 text-white" strokeWidth={2} />}
                      {tool.id === 'utm-generator' && <Link2 className="w-3 h-3 text-white" strokeWidth={2} />}
                      {tool.id === 'slovolov-pro' && <Box className="w-3 h-3 text-white" strokeWidth={2} />}
                      {tool.id === 'content-plan' && <Megaphone className="w-3 h-3 text-white" strokeWidth={2} />}
                      {tool.id === 'links' && <Globe className="w-3 h-3 text-white" strokeWidth={2} />}
                      {tool.id === 'admin' && <Shield className="w-3 h-3 text-white" strokeWidth={2} />}
                    </div>
                    <span className="hidden lg:inline">{tool.name}</span>
                  </Link>
                  <button
                    onClick={(e) => { e.preventDefault(); removePinnedTool(toolId); }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Открепить"
                  >
                    <X className="w-2.5 h-2.5" strokeWidth={3} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Right side - Theme toggle and User info */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle - only mobile */}
          <button
            onClick={toggleTheme}
            className="md:hidden w-8 h-8 rounded-full flex items-center justify-center transition-all bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]"
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" strokeWidth={2} />
            ) : (
              <Moon className="w-4 h-4" strokeWidth={2} />
            )}
          </button>

          {/* Divider - only mobile */}
          <div className="md:hidden w-px h-6 bg-white/20" />

          {/* User Info - кликабельно для открытия меню */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center gap-2 px-3 md:px-1.5 py-1.5 rounded-[20px] bg-gradient-to-b from-white/10 to-white/5 border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)] hover:from-white/15 hover:to-white/10 transition-all cursor-pointer"
              >
                <Avatar
                  type="user"
                  name={currentUser.name || 'User'}
                  src={currentUser.avatar}
                  size="xs"
                  isOnline={true}
                />
                <span className="md:hidden text-xs text-[var(--text-secondary)] max-w-[120px] truncate">
                  {currentUser.name}
                </span>
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
                        window.location.href = '/chat-settings';
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
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Имя</label>
                  <div className="text-[var(--text-primary)] font-medium">{currentUser.name}</div>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Email</label>
                  <div className="text-[var(--text-primary)]">{currentUser.email}</div>
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
