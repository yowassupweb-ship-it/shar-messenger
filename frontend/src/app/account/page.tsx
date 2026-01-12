'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageCircle, CheckSquare, Calendar, Users, ArrowLeft, MoreVertical, Home, Shield, FileText, Languages, Sparkles, Link2, Box, Globe, Megaphone, LogOut, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';

// Динамический импорт компонентов
const TodosBoard = lazy(() => import('../../components/TodosBoard'));
const ContactsBoard = lazy(() => import('../../components/ContactsBoard'));
const CalendarBoard = lazy(() => import('../../components/CalendarBoard'));
const MessagesBoard = lazy(() => import('../../components/MessagesBoard'));

type TabType = 'messages' | 'tasks' | 'calendar' | 'contacts' | 'tools';

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

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

  useEffect(() => {
    // Загрузка текущего пользователя
    const username = localStorage.getItem('username');
    const userRole = localStorage.getItem('userRole');
    if (username) {
      setCurrentUser({ name: username, role: userRole });
    }

    // Проверяем URL параметр для активной вкладки
    const tab = searchParams.get('tab') as TabType;
    if (tab && ['messages', 'tasks', 'calendar', 'contacts', 'tools'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
            <div className="flex items-center justify-between mb-6 max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-center flex-1">Инструменты</h2>
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 bg-[var(--bg-glass)] border border-[var(--border-primary)] hover:bg-[var(--bg-glass-hover)]"
                title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" strokeWidth={2} />
                ) : (
                  <Moon className="w-5 h-5" strokeWidth={2} />
                )}
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
              {/* Главная */}
              <Link
                href="/"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Home className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-xs sm:text-sm text-center text-white/80 group-hover:text-white">Главная</span>
              </Link>

              {/* Редактор фидов */}
              <Link
                href="/feed-editor"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-xs sm:text-sm text-center text-white/80 group-hover:text-white leading-tight">Редактор<br/>фидов</span>
              </Link>

              {/* Транслитератор */}
              <Link
                href="/transliterator"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Languages className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-xs sm:text-sm text-center text-white/80 group-hover:text-white leading-tight">Транслите-<br/>ратор</span>
              </Link>

              {/* Словолов */}
              <Link
                href="/slovolov"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-xs sm:text-sm text-center text-white/80 group-hover:text-white">Словолов</span>
              </Link>

              {/* Генератор UTM */}
              <Link
                href="/utm-generator"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Link2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-xs sm:text-sm text-center text-white/80 group-hover:text-white leading-tight">Генератор<br/>UTM</span>
              </Link>

              {/* Словолов PRO */}
              <Link
                href="/slovolov-pro"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Box className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-xs sm:text-sm text-center text-white/80 group-hover:text-white leading-tight">Словолов<br/>PRO</span>
              </Link>

              {/* Контент-план */}
              <Link
                href="/content-plan"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Megaphone className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-xs sm:text-sm text-center text-white/80 group-hover:text-white leading-tight">Контент-<br/>план</span>
              </Link>

              {/* База ссылок */}
              <Link
                href="/links"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <Globe className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-xs sm:text-sm text-center text-white/80 group-hover:text-white leading-tight">База<br/>ссылок</span>
              </Link>

              {/* Админка - только для админов */}
              {currentUser?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs sm:text-sm text-center text-white/80 group-hover:text-white leading-tight">Админи-<br/>стрирование</span>
                </Link>
              )}
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
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                <span className="text-xs font-medium text-cyan-400">{currentUser.name}</span>
              </div>
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
      <div className={`flex-1 ${activeTab === 'messages' ? '' : 'pb-24 overflow-auto'}`}>
        {renderContent()}
      </div>

      {/* Bottom Navigation Bar - Apple Style Glassmorphism */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-6 px-4 z-40 pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <button
            onClick={() => handleTabChange('messages')}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              activeTab === 'messages'
                ? 'backdrop-blur-2xl bg-[var(--bg-glass-active)] border border-[var(--border-glass)] text-[var(--accent-primary)] shadow-lg'
                : 'backdrop-blur-md bg-[var(--bg-glass)] border border-[var(--border-primary)] text-[var(--text-secondary)]'
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
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              activeTab === 'tasks'
                ? 'backdrop-blur-2xl bg-[var(--bg-glass-active)] border border-[var(--border-glass)] text-[var(--accent-primary)] shadow-lg'
                : 'backdrop-blur-md bg-[var(--bg-glass)] border border-[var(--border-primary)] text-[var(--text-secondary)]'
            }`}
          >
            <CheckSquare className="w-5 h-5" strokeWidth={2} />
          </button>

          <button
            onClick={() => handleTabChange('calendar')}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              activeTab === 'calendar'
                ? 'backdrop-blur-2xl bg-[var(--bg-glass-active)] border border-[var(--border-glass)] text-[var(--accent-primary)] shadow-lg'
                : 'backdrop-blur-md bg-[var(--bg-glass)] border border-[var(--border-primary)] text-[var(--text-secondary)]'
            }`}
          >
            <Calendar className="w-5 h-5" strokeWidth={2} />
          </button>

          <button
            onClick={() => handleTabChange('contacts')}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              activeTab === 'contacts'
                ? 'backdrop-blur-2xl bg-[var(--bg-glass-active)] border border-[var(--border-glass)] text-[var(--accent-primary)] shadow-lg'
                : 'backdrop-blur-md bg-[var(--bg-glass)] border border-[var(--border-primary)] text-[var(--text-secondary)]'
            }`}
          >
            <Users className="w-5 h-5" strokeWidth={2} />
          </button>

          <button
            onClick={() => handleTabChange('tools')}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              activeTab === 'tools'
                ? 'backdrop-blur-2xl bg-[var(--bg-glass-active)] border border-[var(--border-glass)] text-[var(--accent-primary)] shadow-lg'
                : 'backdrop-blur-md bg-[var(--bg-glass)] border border-[var(--border-primary)] text-[var(--text-secondary)]'
            }`}
          >
            <MoreVertical className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
