'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MessageCircle, CheckSquare, Calendar, Users, Globe, MoreVertical } from 'lucide-react';

interface MainBottomNavProps {
  /** Скрыть панель (например, когда открыт чат на мобильном) */
  hide?: boolean;
  /** Текущая активная вкладка для подсвечивания кнопки */
  activeTab?: 'messages' | 'tasks' | 'calendar' | 'contacts' | 'links' | 'tools';
  /** Обработчик нажатия (если не передан — используется router.push) */
  onTabClick?: (tab: string) => void;
}

const NAV_BUTTON_BASE =
  'w-12 h-12 flex-shrink-0 rounded-[100px] flex items-center justify-center transition-all duration-200 focus:outline-none border backdrop-blur-xl';
const NAV_BUTTON_ACTIVE =
  'bg-blue-500/20 text-gray-900 dark:text-white border-blue-500/30 shadow-[inset_0_1px_2px_rgba(96,165,250,0.4),0_3px_8px_rgba(59,130,246,0.2)]';
const NAV_BUTTON_IDLE =
  'text-[var(--text-primary)] bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] border-[var(--border-light)] shadow-[var(--shadow-card)]';

export default function MainBottomNav({ hide = false, activeTab, onTabClick }: MainBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 773 : false
  );
  const [visibleTabs, setVisibleTabs] = useState({
    messages: true,
    tasks: true,
    calendar: true,
    contacts: true,
    links: false,
  });
  // Загружаем настройки видимых вкладок и непрочитанных сообщений
  useEffect(() => {
    const load = async () => {
      try {
        const stored = localStorage.getItem('myAccount');
        if (!stored) return;
        const me = JSON.parse(stored);

        const [userRes, chatsRes] = await Promise.all([
          fetch(`/api/users/${me.id}`),
          fetch(`/api/chats?user_id=${me.id}`),
        ]);

        if (userRes.ok) {
          const user = await userRes.json();
          if (user.visible_tabs || user.visibleTabs) {
            setVisibleTabs(prev => ({ ...prev, ...(user.visible_tabs || user.visibleTabs) }));
          }
        }
        if (chatsRes.ok) {
          const chats = await chatsRes.json();
          const count = chats.filter((c: any) => {
            const id = String(c?.id || '');
            return !c?.isFavoritesChat && !id.startsWith('favorites_') && (c.unreadCount || 0) > 0;
          }).length;
          setUnreadCount(count);
        }
      } catch {
        // ignore
      }
    };
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobileLayout(window.innerWidth < 773);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const navigate = (tab: string) => {
    if (onTabClick) {
      onTabClick(tab);
    } else {
      router.push(`/account?tab=${tab}`);
    }
  };

  const btn = (tab: string) =>
    `${NAV_BUTTON_BASE} ${activeTab === tab ? NAV_BUTTON_ACTIVE : NAV_BUTTON_IDLE}`;

  const desktopBtn = (tab: string) =>
    `px-3 lg:px-4 py-1.5 lg:py-2 min-h-[32px] lg:min-h-[36px] rounded-[20px] flex items-center gap-1 lg:gap-2 text-[12px] font-medium transition-all min-w-0 ${
      activeTab === tab
        ? 'bg-[#007aff]/20 text-gray-900 dark:text-white border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
        : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-primary)] hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
    }`;

  if (hide) return null;

  if (!isMobileLayout) {
    return (
      <div className="desktop-navigation fixed bottom-0 left-0 right-0 h-[46px] backdrop-blur-xl border-t z-40 flex items-center px-4 bg-[var(--bg-glass)] border-[var(--border-glass)]">
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar select-none py-1 px-1 w-full">
          {visibleTabs.messages && (
            <button onClick={() => navigate('messages')} className={`relative ${desktopBtn('messages')}`} title="Сообщения">
              <MessageCircle className="hidden lg:block w-3.5 h-3.5" />
              <span>Чаты</span>
              {unreadCount > 0 && (
                <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {visibleTabs.tasks && (
            <button onClick={() => navigate('tasks')} className={desktopBtn('tasks')} title="Задачи">
              <CheckSquare className="hidden lg:block w-3.5 h-3.5" />
              <span>Задачи</span>
            </button>
          )}

          {visibleTabs.calendar && (
            <button onClick={() => navigate('calendar')} className={desktopBtn('calendar')} title="Календарь">
              <Calendar className="hidden lg:block w-3.5 h-3.5" />
              <span>Календарь</span>
            </button>
          )}

          {visibleTabs.contacts && (
            <button onClick={() => navigate('contacts')} className={desktopBtn('contacts')} title="Контакты">
              <Users className="hidden lg:block w-3.5 h-3.5" />
              <span>Контакты</span>
            </button>
          )}

          {visibleTabs.links && (
            <button onClick={() => navigate('links')} className={desktopBtn('links')} title="Ссылки">
              <Globe className="hidden lg:block w-3.5 h-3.5" />
              <span>Ссылки</span>
            </button>
          )}

          <button
            onClick={() => navigate('tools')}
            className={`w-[32px] h-[32px] rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              activeTab === 'tools'
                ? 'bg-[#007aff]/20 text-gray-900 dark:text-white border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-[var(--text-primary)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]'
            }`}
            title="Ещё"
          >
            <MoreVertical className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bottom-nav-fixed fixed -bottom-[10px] left-0 right-0 flex justify-center pt-2 pb-[max(env(safe-area-inset-bottom),14px)] px-3 z-40 pointer-events-none select-none overflow-visible"
      style={{ background: 'transparent' }}
    >
      <div className="flex items-center gap-2 p-1.5 rounded-[100px] pointer-events-auto backdrop-blur-xl bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] shadow-[var(--shadow-card)]">
        {visibleTabs.messages && (
          <button onClick={() => navigate('messages')} className={`relative ${btn('messages')}`} title="Сообщения">
            <MessageCircle className="w-5 h-5" strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}

        {visibleTabs.tasks && (
          <button onClick={() => navigate('tasks')} className={btn('tasks')} title="Задачи">
            <CheckSquare className="w-5 h-5" strokeWidth={2} />
          </button>
        )}

        {visibleTabs.calendar && (
          <button onClick={() => navigate('calendar')} className={btn('calendar')} title="Календарь">
            <Calendar className="w-5 h-5" strokeWidth={2} />
          </button>
        )}

        {visibleTabs.contacts && (
          <button onClick={() => navigate('contacts')} className={btn('contacts')} title="Контакты">
            <Users className="w-5 h-5" strokeWidth={2} />
          </button>
        )}

        {visibleTabs.links && (
          <button onClick={() => navigate('links')} className={btn('links')} title="Ссылки">
            <Globe className="w-5 h-5" strokeWidth={2} />
          </button>
        )}

        <button onClick={() => navigate('tools')} className={btn('tools')} title="Ещё">
          <MoreVertical className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
