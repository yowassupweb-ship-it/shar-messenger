'use client';

import { useRouter, usePathname } from 'next/navigation';
import { MessageCircle, CheckSquare, Calendar, Users, Globe, MoreVertical, Sun, Moon, Settings, Type, Zap, Hash, Package2, PenTool, Shield, Code2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import Avatar from '@/components/Avatar';

const STANDARD_TOOL_IDS = ['messages', 'tasks', 'calendar', 'links', 'settings'];

const ALL_TOOLS = [
  { id: 'feed-editor', name: 'Редактор фидов', href: '/feed-editor' },
  { id: 'transliterator', name: 'Транслитератор', href: '/transliterator' },
  { id: 'slovolov', name: 'Словолов', href: '/slovolov' },
  { id: 'utm-generator', name: 'Генератор UTM', href: '/utm-generator' },
  { id: 'slovolov-pro', name: 'Словолов PRO', href: '/slovolov-pro' },
  { id: 'content-plan', name: 'Контент-план', href: '/content-plan' },
  { id: 'links', name: 'Ссылки', href: '/links' },
  { id: 'admin', name: 'Админка', href: '/admin', adminOnly: true },
  { id: 'settings', name: 'Настройки', href: '/settings', standard: true },
] as const;

const renderPinnedToolIcon = (toolId: string) => {
  if (toolId === 'feed-editor') return <Code2 className="w-2.5 h-2.5 text-white" strokeWidth={2} />;
  if (toolId === 'transliterator') return <Type className="w-2.5 h-2.5 text-white" strokeWidth={2} />;
  if (toolId === 'slovolov') return <Zap className="w-2.5 h-2.5 text-white" strokeWidth={2} />;
  if (toolId === 'utm-generator') return <Hash className="w-2.5 h-2.5 text-white" strokeWidth={2} />;
  if (toolId === 'slovolov-pro') return <Package2 className="w-2.5 h-2.5 text-white" strokeWidth={2} />;
  if (toolId === 'content-plan') return <PenTool className="w-2.5 h-2.5 text-white" strokeWidth={2} />;
  if (toolId === 'links') return <Globe className="w-2.5 h-2.5 text-white" strokeWidth={2} />;
  if (toolId === 'admin') return <Shield className="w-2.5 h-2.5 text-white" strokeWidth={2} />;
  return <Settings className="w-2.5 h-2.5 text-white" strokeWidth={2} />;
};

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [pinnedTools, setPinnedTools] = useState<string[]>([]);
  const [isTouchDevice, setIsTouchDevice] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false));
  const [isBelow773, setIsBelow773] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 773 : false));
  const [visibleTabs, setVisibleTabs] = useState({
    messages: true,
    tasks: true,
    calendar: true,
    contacts: true,
    links: true
  });

  useEffect(() => {
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
        // Игнорируем ошибки
      }
    };
    
    const loadCurrentUser = async () => {
      try {
        const myAccountStr = localStorage.getItem('myAccount');
        if (!myAccountStr) return;
        
        const myAccount = JSON.parse(myAccountStr);
        const res = await fetch(`/api/users/${myAccount.id}`);
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
          if (user.visible_tabs || user.visibleTabs) {
            setVisibleTabs(user.visible_tabs || user.visibleTabs);
          }
          if (Array.isArray(user.pinnedTools)) {
            setPinnedTools(user.pinnedTools);
          }
        }
      } catch (error) {
        // Игнорируем ошибки
      }
    };
    
    loadUnreadCount();
    loadCurrentUser();
    const interval = setInterval(loadUnreadCount, 5000);

    const updateViewportFlags = () => {
      setIsBelow773(window.innerWidth < 773);
      setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
    };

    updateViewportFlags();
    window.addEventListener('resize', updateViewportFlags);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateViewportFlags);
    };
  }, []);

  const handleNavClick = (path: string) => {
    router.push(path);
  };

  // Скрываем на мобильных устройствах когда открыт чат (есть параметр ?chat=...)
  const isInChat = typeof window !== 'undefined' && pathname === '/messages' && new URLSearchParams(window.location.search).has('chat');
  const shouldHideMobile = isInChat;

  const shouldUseMobileNav = isBelow773 || isTouchDevice;

  // Показываем только на /content-plan и /utm-generator (+ вложенные страницы)
  const shouldShow = pathname.startsWith('/content-plan') || pathname.startsWith('/utm-generator');

  const removePinnedTool = async (toolId: string) => {
    const updated = pinnedTools.filter((id) => id !== toolId);
    setPinnedTools(updated);

    if (!currentUser?.id) return;

    try {
      await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinnedTools: updated }),
      });
    } catch (error) {
      // Игнорируем ошибки сохранения
    }
  };
  
  if (!shouldShow) {
    return null;
  }

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className={`bottom-nav-fixed fixed bottom-0 left-0 right-0 justify-center pt-3 pb-[max(env(safe-area-inset-bottom),12px)] px-3 z-40 pointer-events-none select-none overflow-visible ${shouldHideMobile || !shouldUseMobileNav ? 'hidden' : 'flex'}`} style={{ background: 'transparent' }}>
        <div className="flex items-center gap-2 pointer-events-auto backdrop-blur-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/20 rounded-full px-3 py-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_20px_rgba(0,0,0,0.3)]">
          {visibleTabs.messages && (
            <button
              onClick={() => handleNavClick('/messages')}
              className="relative w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none text-[var(--text-primary)] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
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
              onClick={() => handleNavClick('/todos')}
              className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none text-[var(--text-primary)] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
            >
              <CheckSquare className="w-4 h-4" strokeWidth={2} />
            </button>
          )}

          {visibleTabs.calendar && (
            <button
              onClick={() => handleNavClick('/calendar')}
              className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none text-[var(--text-primary)] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
            >
              <Calendar className="w-4 h-4" strokeWidth={2} />
            </button>
          )}

          {visibleTabs.contacts && (
            <button
              onClick={() => handleNavClick('/contacts')}
              className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none text-[var(--text-primary)] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
            >
              <Users className="w-4 h-4" strokeWidth={2} />
            </button>
          )}

          {visibleTabs.links && (
            <button
              onClick={() => handleNavClick('/links')}
              className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none text-[var(--text-primary)] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
            >
              <Globe className="w-4 h-4" strokeWidth={2} />
            </button>
          )}

          <button
            onClick={() => handleNavClick('/account?tab=tools')}
            className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none text-[var(--text-primary)] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] backdrop-blur-sm"
          >
            <MoreVertical className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Desktop Bottom Status Bar */}
      <div className={`fixed bottom-0 left-0 right-0 h-[46px] backdrop-blur-xl border-t z-40 items-center justify-between px-4 bg-[var(--bg-glass)] border-[var(--border-glass)] overflow-visible ${shouldUseMobileNav ? 'hidden' : 'flex'}`} style={{ fontSize: '12px' }}>
        {/* Left side - Navigation */}
        <div className="flex items-center gap-1.5 px-1">
          {visibleTabs.messages && (
            <button
              onClick={() => handleNavClick('/messages')}
              className={`relative px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-normal transition-all whitespace-nowrap ${
                pathname === '/messages'
                  ? 'bg-[#007aff]/20 !text-gray-900 dark:!text-white border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                  : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-gray-900 dark:text-white hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
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
              onClick={() => handleNavClick('/todos')}
              className={`px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-normal transition-all whitespace-nowrap ${
                pathname === '/todos'
                  ? 'bg-[#007aff]/20 !text-gray-900 dark:!text-white border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                  : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-gray-900 dark:text-white hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Задачи</span>
            </button>
          )}

          {visibleTabs.calendar && (
            <button
              onClick={() => handleNavClick('/calendar')}
              className={`px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-normal transition-all whitespace-nowrap ${
                pathname === '/calendar'
                  ? 'bg-[#007aff]/20 !text-gray-900 dark:!text-white border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                  : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-gray-900 dark:text-white hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Календарь</span>
            </button>
          )}

          {visibleTabs.contacts && (
            <button
              onClick={() => handleNavClick('/contacts')}
              className={`px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-normal transition-all whitespace-nowrap ${
                pathname === '/contacts'
                  ? 'bg-[#007aff]/20 !text-gray-900 dark:!text-white border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                  : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-gray-900 dark:text-white hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Контакты</span>
            </button>
          )}

          {visibleTabs.links && (
            <button
              onClick={() => handleNavClick('/links')}
              className={`px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-normal transition-all whitespace-nowrap ${
                pathname === '/links'
                  ? 'bg-[#007aff]/20 !text-gray-900 dark:!text-white border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                  : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-gray-900 dark:text-white hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Ссылки</span>
            </button>
          )}

          <button
            onClick={() => handleNavClick('/account?tab=tools')}
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center transition-all flex-shrink-0 bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-primary)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]"
            title="Инструменты"
          >
            <MoreVertical className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {pinnedTools.length > 0 && (
          <div className="flex items-center gap-1 overflow-visible max-w-[calc(100%-320px)] xl:max-w-none">
            {pinnedTools.slice(0, 6).map((toolId, index) => {
              const tool = ALL_TOOLS.find((item) => item.id === toolId);
              if (!tool) return null;

              const hasAccess = currentUser?.role === 'admin' ||
                tool.standard ||
                STANDARD_TOOL_IDS.includes(tool.id) ||
                currentUser?.enabledTools?.includes(tool.id);

              if (!hasAccess) return null;

              return (
                <div
                  key={toolId}
                  className={`relative group flex-shrink-0 ${index >= 5 ? 'hidden xl:block' : ''} ${index >= 4 ? 'hidden lg:block' : ''}`}
                >
                  <button
                    onClick={() => handleNavClick(tool.href)}
                    className="flex items-center gap-1.5 text-[10px] font-medium transition-all px-2 py-1.5 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/20 hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#3f51b5] to-[#7c4dff] flex items-center justify-center relative overflow-hidden shadow-sm backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent opacity-80 rounded-full" />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 rounded-full" />
                      <div className="absolute top-[8%] left-[12%] right-[12%] h-[25%] bg-white/50 rounded-full blur-sm" />
                      <div className="relative z-10 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
                        {renderPinnedToolIcon(tool.id)}
                      </div>
                    </div>
                    <span className="hidden md:inline text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{tool.name}</span>
                  </button>
                  <button
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void removePinnedTool(toolId);
                    }}
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

        {/* Right side - Avatar */}
        <div className="flex items-center gap-3">
          {/* User Avatar Menu */}
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
              
              {/* Dropdown Menu */}
              {showAccountMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-[100]" 
                    onClick={() => setShowAccountMenu(false)}
                  />
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-2xl z-[101] overflow-hidden">
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
                        router.push('/settings');
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
    </>
  );
}
