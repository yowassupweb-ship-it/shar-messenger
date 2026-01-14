'use client';

import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageCircle, CheckSquare, Calendar, Users, ArrowLeft, MoreVertical, Shield, FileText, Languages, Sparkles, Link2, Box, Globe, Megaphone, LogOut, Sun, Moon, GripVertical, X } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';

// Типы для инструментов
interface Tool {
  id: string;
  name: string;
  href: string;
  icon: React.ReactNode;
  gradient: string;
  adminOnly?: boolean;
}

// Динамический импорт компонентов
const TodosBoard = lazy(() => import('../../components/TodosBoard'));
const ContactsBoard = lazy(() => import('../../components/ContactsBoard'));
const CalendarBoard = lazy(() => import('../../components/CalendarBoard'));
const MessagesBoard = lazy(() => import('../../components/MessagesBoard'));

type TabType = 'messages' | 'tasks' | 'calendar' | 'contacts' | 'tools';

// Список всех инструментов
const ALL_TOOLS: Tool[] = [
  { id: 'feed-editor', name: 'Редактор фидов', href: '/feed-editor', icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-blue-500 to-indigo-600' },
  { id: 'transliterator', name: 'Транслитератор', href: '/transliterator', icon: <Languages className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-emerald-500 to-teal-600' },
  { id: 'slovolov', name: 'Словолов', href: '/slovolov', icon: <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-pink-500 to-rose-600' },
  { id: 'utm-generator', name: 'Генератор UTM', href: '/utm-generator', icon: <Link2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-fuchsia-500 to-pink-600' },
  { id: 'slovolov-pro', name: 'Словолов PRO', href: '/slovolov-pro', icon: <Box className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-cyan-500 to-blue-600' },
  { id: 'content-plan', name: 'Контент-план', href: '/content-plan', icon: <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-purple-500 to-violet-600' },
  { id: 'links', name: 'База ссылок', href: '/links', icon: <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-sky-500 to-blue-600' },
  { id: 'admin', name: 'Администрирование', href: '/admin', icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />, gradient: 'from-amber-500 to-orange-600', adminOnly: true },
];

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Состояния для drag & drop инструментов
  const [pinnedTools, setPinnedTools] = useState<string[]>([]);
  const [draggingTool, setDraggingTool] = useState<string | null>(null);
  const [isDragOverBar, setIsDragOverBar] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Загрузка количества непрочитанных чатов
  const loadUnreadCount = async () => {
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
          
          // Если имя уже есть в localStorage
          if (account.name) {
            setCurrentUser({ name: account.name, role: userRole });
          } else if (account.id) {
            // Загружаем данные пользователя с сервера
            const res = await fetch(`/api/users/${account.id}`);
            if (res.ok) {
              const user = await res.json();
              // Сохраняем имя в localStorage для будущего использования
              localStorage.setItem('myAccount', JSON.stringify({ id: account.id, name: user.name }));
              setCurrentUser({ name: user.name, role: userRole });
            } else {
              // Fallback на username
              const username = localStorage.getItem('username');
              if (username) {
                setCurrentUser({ name: username, role: userRole });
              }
            }
          }
        } catch {
          const username = localStorage.getItem('username');
          if (username) {
            setCurrentUser({ name: username, role: userRole });
          }
        }
      } else {
        const username = localStorage.getItem('username');
        if (username) {
          setCurrentUser({ name: username, role: userRole });
        }
      }
    };
    
    loadCurrentUser();

    // Проверяем URL параметр для активной вкладки
    const tab = searchParams.get('tab') as TabType;
    if (tab && ['messages', 'tasks', 'calendar', 'contacts', 'tools'].includes(tab)) {
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
    const interval = setInterval(checkChatOpen, 300);
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
      
      case 'tools':
        return (
          <div className="p-4 sm:p-6">
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
              {ALL_TOOLS.filter(tool => !tool.adminOnly || currentUser?.role === 'admin').map((tool) => (
                <div
                  key={tool.id}
                  draggable={isDesktop}
                  onDragStart={(e) => handleDragStart(e, tool.id)}
                  onDragEnd={handleDragEnd}
                  className={`relative cursor-grab active:cursor-grabbing ${draggingTool === tool.id ? 'opacity-50' : ''}`}
                >
                  <Link
                    href={tool.href}
                    className="flex flex-col items-center gap-2 group"
                    draggable={false}
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
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen theme-text flex flex-col transition-colors duration-300 ${activeTab === 'messages' ? '' : 'theme-bg'}`}>
      {/* Header - скрыт для вкладок задач, контактов, календаря и сообщений */}
      {activeTab !== 'tasks' && activeTab !== 'contacts' && activeTab !== 'calendar' && activeTab !== 'messages' && (
        <header className="h-12 theme-bg-secondary border-b border-[var(--border-primary)] flex items-center px-4 flex-shrink-0 glass-navbar">
          <Link
            href="/"
            className="flex items-center justify-center w-8 h-8 rounded-lg theme-text-muted hover:theme-text-secondary hover:bg-[var(--bg-glass-hover)] transition-all mr-3"
            title="На главную"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          </Link>
          
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Аккаунт</span>
          </div>

          {currentUser && (
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Выйти"
              >
                <LogOut className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          )}
        </header>
      )}

      {/* Main Content */}
      <div className={`flex-1 ${activeTab === 'messages' ? '' : 'pb-24 md:pb-12 overflow-auto'}`}>
        {renderContent()}
      </div>

      {/* Mobile Bottom Navigation Bar - стеклянные кнопки */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 flex justify-center pb-6 px-4 z-40 pointer-events-none ${isChatOpen ? 'hidden' : ''}`}>
        <div className="flex items-center gap-3 pointer-events-auto backdrop-blur-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/20 rounded-full px-4 py-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_20px_rgba(0,0,0,0.3)]">
          <button
            onClick={() => handleTabChange('messages')}
            className={`relative w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'messages'
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
            }`}
          >
            <MessageCircle className="w-5 h-5" strokeWidth={2} />
            {unreadChatsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('tasks')}
            className={`w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'tasks'
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
            }`}
          >
            <CheckSquare className="w-5 h-5" strokeWidth={2} />
          </button>

          <button
            onClick={() => handleTabChange('calendar')}
            className={`w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'calendar'
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
            }`}
          >
            <Calendar className="w-5 h-5" strokeWidth={2} />
          </button>

          <button
            onClick={() => handleTabChange('contacts')}
            className={`w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'contacts'
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
            }`}
          >
            <Users className="w-5 h-5" strokeWidth={2} />
          </button>

          <button
            onClick={() => handleTabChange('tools')}
            className={`w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none ${
              activeTab === 'tools'
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
            }`}
          >
            <MoreVertical className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Desktop Bottom Status Bar - glassmorphism style with drop zone */}
      <div 
        className={`hidden md:flex fixed bottom-0 left-0 right-0 h-12 backdrop-blur-xl border-t z-40 items-center justify-between px-4 transition-all duration-200 ${
          isDragOverBar 
            ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]/50' 
            : 'bg-[var(--bg-glass)] border-[var(--border-glass)]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Left side - Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleTabChange('messages')}
            className={`relative px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-xs font-medium transition-all ${
              activeTab === 'messages'
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
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
            className={`px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-xs font-medium transition-all ${
              activeTab === 'tasks'
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Задачи</span>
          </button>

          <button
            onClick={() => handleTabChange('calendar')}
            className={`px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-xs font-medium transition-all ${
              activeTab === 'calendar'
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Календарь</span>
          </button>

          <button
            onClick={() => handleTabChange('contacts')}
            className={`px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-xs font-medium transition-all ${
              activeTab === 'contacts'
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Контакты</span>
          </button>

          <button
            onClick={() => handleTabChange('tools')}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              activeTab === 'tools'
                ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
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
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]"
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" strokeWidth={2} />
            ) : (
              <Moon className="w-4 h-4" strokeWidth={2} />
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-white/20" />

          {/* User Info */}
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[20px] bg-gradient-to-b from-white/10 to-white/5 border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                {currentUser.name?.split(' ').map((word: string) => word[0]?.toUpperCase()).join('') || 'U'}
              </div>
              <span className="text-xs text-[var(--text-secondary)] max-w-[120px] truncate">
                {currentUser.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
