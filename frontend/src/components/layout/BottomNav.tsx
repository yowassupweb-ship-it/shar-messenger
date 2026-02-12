'use client';

import { useRouter, usePathname } from 'next/navigation';
import { MessageCircle, CheckSquare, Calendar, Users, Globe, MoreVertical, Sun, Moon, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import Avatar from '@/components/Avatar';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
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
        }
      } catch (error) {
        // Игнорируем ошибки
      }
    };
    
    loadUnreadCount();
    loadCurrentUser();
    const interval = setInterval(loadUnreadCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (path: string) => {
    router.push(path);
  };

  // Скрываем на мобильных устройствах когда открыт чат (есть параметр ?chat=...)
  const isInChat = typeof window !== 'undefined' && pathname === '/messages' && new URLSearchParams(window.location.search).has('chat');
  const shouldHideMobile = isInChat;

  // Показываем только на /content-plan и /utm-generator
  const allowedPaths = ['/content-plan', '/utm-generator'];
  const shouldShow = allowedPaths.includes(pathname);
  
  if (!shouldShow) {
    return null;
  }

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className={`bottom-nav-fixed fixed bottom-0 left-0 right-0 flex justify-center pb-4 px-3 z-40 pointer-events-none select-none ${shouldHideMobile ? 'hidden' : 'block md:hidden'}`} style={{ background: 'transparent' }}>
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
      <div className="hidden md:flex fixed bottom-0 left-0 right-0 h-[48px] backdrop-blur-xl border-t z-40 items-center justify-between px-4 bg-[var(--bg-glass)] border-[var(--border-glass)]" style={{ fontSize: '12px' }}>
        {/* Left side - Navigation */}
        <div className="flex items-center gap-1.5">
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
