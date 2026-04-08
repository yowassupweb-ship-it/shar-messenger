'use client';

import Image from 'next/image';
import { Minus, Square, Copy, X, PhoneCall, BellRing, MoreVertical, RotateCw, CheckCircle2, Calendar, UserPlus, ArrowRight, Download, RefreshCw } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  senderId?: string;
  author_id?: string;
  authorId?: string;
  created_at: string;
  createdAt?: string;
  read_by_user?: Record<string, boolean>;
  readByUser?: Record<string, boolean>;
}

interface NotificationsChat {
  id: string;
  read_messages_by_user?: Record<string, string>;
  readMessagesByUser?: Record<string, string>;
}

interface ElectronShellProps {
  children: ReactNode;
}

const ELECTRON_TITLEBAR_OFFSET = 38;
const ELECTRON_BOTTOMNAV_OFFSET = 46; // Восстанавливаем 46px для отступа контейнера чата от нижнего меню
const ISLAND_MARQUEE_DURATION_MS = 16000;
const ISLAND_COMPACT_WIDTH_PX = 142;

const ROUTE_TITLES: Array<{ match: RegExp; title: string; subtitle?: string }> = [
  { match: /^\/messages/, title: 'Чаты', subtitle: 'Shar OS' },
  { match: /^\/todos/, title: 'Задачи', subtitle: 'Shar OS' },
  { match: /^\/calendar/, title: 'Календарь', subtitle: 'Shar OS' },
  { match: /^\/contacts/, title: 'Контакты', subtitle: 'Shar OS' },
  { match: /^\/links/, title: 'Ссылки', subtitle: 'Shar OS' },
  { match: /^\/content-plan/, title: 'Контент-план', subtitle: 'Shar OS' },
  { match: /^\/utm-generator/, title: 'Генератор UTM', subtitle: 'Shar OS' },
  { match: /^\/slovolov-pro/, title: 'Словолов PRO', subtitle: 'Shar OS' },
  { match: /^\/slovolov/, title: 'Словолов', subtitle: 'Shar OS' },
  { match: /^\/feed-editor/, title: 'Редактор фидов', subtitle: 'Shar OS' },
  { match: /^\/transliterator/, title: 'Транслитератор', subtitle: 'Shar OS' },
  { match: /^\/settings/, title: 'Настройки', subtitle: 'Shar OS' },
  { match: /^\/account/, title: 'Аккаунт', subtitle: 'Shar OS' },
  { match: /^\/admin/, title: 'Админка', subtitle: 'Shar OS' },
  { match: /^\/$/, title: 'Shar OS', subtitle: 'Рабочее пространство' },
];

// Определение типа уведомления по содержимому
function getNotificationType(content: string): 'todo' | 'event' | 'contact' | 'default' {
  const lower = content.toLowerCase();
  if (lower.includes('задач') || lower.includes('todo') || lower.includes('выполнен')) return 'todo';
  if (lower.includes('событи') || lower.includes('календар') || lower.includes('event') || lower.includes('встреч')) return 'event';
  if (lower.includes('контакт') || lower.includes('добавил') || lower.includes('пригласил')) return 'contact';
  return 'default';
}

// Извлечение ID из содержимого (если есть)
function extractId(content: string, type: 'todo' | 'event'): string | null {
  const match = content.match(/\(ID[:\s]*([a-zA-Z0-9-]+)\)/);
  return match ? match[1] : null;
}

function stripHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function ElectronShell({ children }: ElectronShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAccountPage = pathname === '/account';
  const [isElectron, setIsElectron] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [hasIncomingCall, setHasIncomingCall] = useState(false);
  const [notificationMessages, setNotificationMessages] = useState<Message[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [islandExpanded, setIslandExpanded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [updateState, setUpdateState] = useState<'idle' | 'downloading' | 'downloaded'>('idle');
  const [updatePercent, setUpdatePercent] = useState(0);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [isMarqueeFlowActive, setIsMarqueeFlowActive] = useState(false);
  const [showMarquee, setShowMarquee] = useState(false);
  const [showExpandedContent, setShowExpandedContent] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const islandRef = useRef<HTMLDivElement>(null);
  const autoCollapseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const marqueeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const marqueeCollapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const applyZoomPercent = useCallback(async (nextZoom: number) => {
    const clamped = Math.max(50, Math.min(300, Math.round(nextZoom)));
    setZoomPercent(clamped);

    try {
      const applied = await window.sharDesktop?.windowControls?.setZoom?.(clamped);
      if (typeof applied === 'number' && Number.isFinite(applied)) {
        setZoomPercent(Math.max(50, Math.min(300, Math.round(applied))));
      }
    } catch {
      // ignore zoom sync errors
    }
  }, []);

  useEffect(() => {
    if (!showMenu) return;

    let cancelled = false;
    (async () => {
      try {
        const current = await window.sharDesktop?.windowControls?.getZoom?.();
        if (!cancelled && typeof current === 'number' && Number.isFinite(current)) {
          setZoomPercent(Math.max(50, Math.min(300, Math.round(current))));
        }
      } catch {
        // ignore zoom read errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showMenu]);

  // Проверка, скрывать ли островок (на страницах чатов)
  const isAccountMessagesPage = pathname === '/account' && searchParams.get('tab') === 'messages';
  const isMessagesPage = pathname === '/messages' || pathname.startsWith('/messages/') || isAccountMessagesPage;

  // Непрочитанные сообщения чата уведомлений (по read-маркеру чата)
  const unreadMessages = useMemo(() => {
    if (!currentUserId) return [];

    const sortedByDateDesc = [...notificationMessages].sort((a, b) => {
      const aTime = new Date(a.created_at || a.createdAt || '').getTime();
      const bTime = new Date(b.created_at || b.createdAt || '').getTime();
      return bTime - aTime;
    });

    if (notificationsUnreadCount <= 0) return [];
    return sortedByDateDesc.slice(0, notificationsUnreadCount);
  }, [notificationMessages, currentUserId, notificationsUnreadCount]);

  const unreadCount = unreadMessages.length;

  const primaryActionTarget = useMemo(() => {
    const first = unreadMessages[0];
    if (!first) return null;
    const cleanContent = stripHtml(first.content || '');
    const notifType = getNotificationType(cleanContent);
    const notifId = notifType === 'todo' || notifType === 'event' ? extractId(cleanContent, notifType) : null;
    if (!notifId) return null;
    return { notifType, notifId };
  }, [unreadMessages]);

  // Новые уведомления (последние 3) - для badge и marquee
  const newMessages = useMemo(
    () => {
      // Не показываем остров на странице чатов
      if (isMessagesPage) return [];
      return unreadMessages.slice(0, 3);
    },
    [unreadMessages, isMessagesPage]
  );

  const expandedIslandWidth = useMemo(() => {
    const longestMessageLength = unreadMessages
      .slice(0, 10)
      .reduce((maxLength, message) => Math.max(maxLength, String(message.content || '').trim().length), 0);

    return Math.max(250, Math.min(360, 200 + longestMessageLength * 2));
  }, [unreadMessages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateCompactViewport = () => {
      setIsCompactViewport(window.innerWidth < 773);
    };

    updateCompactViewport();
    window.addEventListener('resize', updateCompactViewport);
    return () => window.removeEventListener('resize', updateCompactViewport);
  }, []);

  useEffect(() => {
    const electronAvailable = typeof window !== 'undefined' && Boolean(window.sharDesktop?.windowControls);
    setIsElectron(electronAvailable);

    if (!electronAvailable) return;

    // Получаем текущего пользователя
    const username = localStorage.getItem('username');
    if (username) {
      fetch(`/api/auth/me?username=${encodeURIComponent(username)}`)
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setCurrentUserId(data.id);
          }
        })
        .catch(console.error);
    }

    document.documentElement.classList.add('electron-app');
    document.documentElement.setAttribute('data-electron-react-shell', 'true');
    document.body.classList.add('electron-app');

    const controls = window.sharDesktop?.windowControls;
    const unsubscribeUpdater = window.sharDesktop?.updater?.onStatus?.((data) => {
      setUpdateState(data.state === 'downloaded' ? 'downloaded' : 'downloading');
      if (typeof data.percent === 'number') setUpdatePercent(Math.round(data.percent));
      if (data.version) setUpdateVersion(data.version);
    });

    return () => {
      document.documentElement.classList.remove('electron-app');
      document.documentElement.removeAttribute('data-electron-react-shell');
      document.body.classList.remove('electron-app');
      if (typeof unsubscribe === 'function') unsubscribe();
      if (typeof unsubscribeUpdater === 'function') unsubscribeUpdatern-app');
      document.documentElement.removeAttribute('data-electron-react-shell');
      document.body.classList.remove('electron-app');
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Динамическое управление CSS переменными в зависимости от видимости хедера
  useEffect(() => {
    if (!isElectron) return;

    // Хедер рендерится как независимый overlay и не должен сдвигать контент вниз.
    const titlebarOffset = 0;
    // На компактном account используется плавающая mobile-навигация, резерв shell снизу не нужен.
    const bottomnavOffset = (isAccountPage && isCompactViewport) || (isMessagesPage && !isAccountMessagesPage)
      ? 0
      : ELECTRON_BOTTOMNAV_OFFSET;

    document.documentElement.style.setProperty('--electron-titlebar-offset', `${titlebarOffset}px`);
    document.documentElement.style.setProperty('--electron-bottomnav-offset', `${bottomnavOffset}px`);

    return () => {
      document.documentElement.style.removeProperty('--electron-titlebar-offset');
      document.documentElement.style.removeProperty('--electron-bottomnav-offset');
    };
  }, [isElectron, isMessagesPage, isAccountMessagesPage, isAccountPage, isCompactViewport]);

  const titleMeta = useMemo(() => {
    const matched = ROUTE_TITLES.find((item) => item.match.test(pathname));
    if (matched) return matched;

    const cleaned = pathname
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/[-_]+/g, ' ')
      ?.replace(/\b\w/g, (char) => char.toUpperCase());

    return {
      title: cleaned || 'Shar OS',
      subtitle: 'Рабочее пространство',
    };
  }, [pathname]);

  // Загрузка сообщений из чата с уведомлениями
  const loadNotifications = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      // Получаем чат с уведомлениями
      const chatRes = await fetch(`/api/chats/notifications/${currentUserId}`);
      if (!chatRes.ok) return;
      
      const chat = await chatRes.json() as NotificationsChat;
      const chatId = chat.id;
      
      // Получаем сообщения из этого чата
      const messagesRes = await fetch(`/api/chats/${chatId}/messages?user_id=${currentUserId}`);
      if (!messagesRes.ok) return;
      
      const messages: Message[] = await messagesRes.json();

      const readMap = chat.readMessagesByUser || chat.read_messages_by_user || {};
      const readMarkerRaw = readMap[String(currentUserId)] || readMap[currentUserId] || null;

      const sortedByTimeAsc = [...messages].sort((a, b) => {
        const aTime = new Date(a.createdAt || a.created_at || '').getTime();
        const bTime = new Date(b.createdAt || b.created_at || '').getTime();
        return aTime - bTime;
      });

      let unread = sortedByTimeAsc.length;
      if (readMarkerRaw) {
        const readMarker = String(readMarkerRaw);
        const markerIndex = sortedByTimeAsc.findIndex((m) => String(m.id) === readMarker);
        if (markerIndex >= 0) {
          unread = Math.max(sortedByTimeAsc.length - markerIndex - 1, 0);
        } else {
          const markerTime = new Date(readMarker).getTime();
          if (!Number.isNaN(markerTime)) {
            unread = sortedByTimeAsc.filter((m) => {
              const msgTime = new Date(m.createdAt || m.created_at || '').getTime();
              return !Number.isNaN(msgTime) && msgTime > markerTime;
            }).length;
          }
        }
      }

      setNotificationsUnreadCount(unread);
      setNotificationMessages(messages);
    } catch (error) {
      console.error('Error loading notification messages:', error);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!isElectron || !currentUserId) return;

    loadNotifications();

    // Обновляем каждые 10 секунд
    const interval = setInterval(loadNotifications, 10000);

    return () => clearInterval(interval);
  }, [isElectron, currentUserId, loadNotifications]);

  // Анимация бегущей строки при новом сообщении
  useEffect(() => {
    if (newMessages.length === 0) {
      // Сбрасываем marquee если нет новых
      setShowMarquee(false);
      setIslandExpanded(false);
      setIsMarqueeFlowActive(false);

      if (marqueeTimerRef.current) {
        clearTimeout(marqueeTimerRef.current);
        marqueeTimerRef.current = null;
      }
      if (marqueeCollapseTimerRef.current) {
        clearTimeout(marqueeCollapseTimerRef.current);
        marqueeCollapseTimerRef.current = null;
      }
      return;
    }

    const latestMsg = newMessages[0];
    if (latestMsg.id !== lastMessageId) {
      setLastMessageId(latestMsg.id);
      
      // Шаг 1: Расширяем только «пилюлю» (без открытия popup)
      setIsMarqueeFlowActive(true);
      setShowMarquee(true);

      if (marqueeTimerRef.current) {
        clearTimeout(marqueeTimerRef.current);
      }
      if (marqueeCollapseTimerRef.current) {
        clearTimeout(marqueeCollapseTimerRef.current);
      }
      
      // Шаг 2: Ждем завершения одной полной пробежки строки
      marqueeTimerRef.current = setTimeout(() => {
        setShowMarquee(false);
      }, ISLAND_MARQUEE_DURATION_MS);

      // Шаг 3: Возвращаем остров в обычный размер после пробежки
      marqueeCollapseTimerRef.current = setTimeout(() => {
        setIsMarqueeFlowActive(false);
      }, ISLAND_MARQUEE_DURATION_MS + 500);
      
      autoCollapseTimerRef.current = marqueeCollapseTimerRef.current;
    }
  }, [newMessages, lastMessageId]);

  useEffect(() => {
    return () => {
      if (marqueeTimerRef.current) clearTimeout(marqueeTimerRef.current);
      if (marqueeCollapseTimerRef.current) clearTimeout(marqueeCollapseTimerRef.current);
    };
  }, []);

  // Сбрасываем marquee когда остров сворачивается
  useEffect(() => {
    if (!islandExpanded) {
      setShowMarquee(false);
      setShowExpandedContent(false);
    } else {
      // Задержка 100мс перед показом контента
      const timer = setTimeout(() => {
        setShowExpandedContent(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [islandExpanded]);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Закрытие островка при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(event.target as Node)) {
        setIslandExpanded(false);
      }
    };

    if (islandExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [islandExpanded]);

  // Форматирование времени сообщения
  const formatMessageTime = (createdAt: string) => {
    if (!createdAt) return '';
    const now = new Date();
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return '';
    const diffMs = now.getTime() - created.getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) return '';
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} дн назад`;
  };

  if (!isElectron) {
    return <>{children}</>;
  }

  return (
    <div className="electron-shell-root relative flex h-screen overflow-hidden flex-col">
      <div className="relative z-[160] w-full flex-shrink-0">
        <div 
          className="relative flex items-center justify-between w-full border-b px-3 bg-[#f8fafc] dark:bg-[#0f172a] border-gray-200 dark:border-gray-800"
          style={{ 
            height: `${ELECTRON_TITLEBAR_OFFSET}px`,
            WebkitAppRegion: 'drag',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          } as CSSProperties}
        >
          {/* Левая часть: Лого + "Шар OS" */}
          <div className="flex items-center gap-2 pointer-events-none">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
              <Image src="/group-6.png" alt="Shar OS" width={24} height={24} className="h-6 w-6 object-contain" priority />
            </div>
            <span className="text-[13px] font-semibold text-gray-900 dark:text-white whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', lineHeight: '1' }}>Шар OS</span>
          </div>

          {/* Динамический островок - звонок везде, уведомления только не на /messages */}
          {(hasIncomingCall || (!isMessagesPage && unreadCount > 0)) && (
            <div
              ref={islandRef}
              className="absolute left-1/2 -translate-x-1/2 origin-center pointer-events-auto transition-all duration-300"
              onMouseEnter={() => {
                // Отменяем автосворачивание при hover
                if (autoCollapseTimerRef.current) {
                  clearTimeout(autoCollapseTimerRef.current);
                  autoCollapseTimerRef.current = null;
                }
              }}
              onClick={(e) => {
                // Отменяем автосворачивание при клике
                if (autoCollapseTimerRef.current) {
                  clearTimeout(autoCollapseTimerRef.current);
                  autoCollapseTimerRef.current = null;
                }
              }}
              style={{ 
                WebkitAppRegion: 'no-drag', 
                top: '4px',
                bottom: '4px',
                paddingLeft: '8px',
                paddingRight: '8px',
                width: islandExpanded || isMarqueeFlowActive ? `${expandedIslandWidth}px` : `${ISLAND_COMPACT_WIDTH_PX}px`,
                maxWidth: islandExpanded || isMarqueeFlowActive ? 'min(360px, calc(100vw - 140px))' : `${ISLAND_COMPACT_WIDTH_PX}px`,
                ...(islandExpanded && {
                  bottom: 'auto',
                  minHeight: '180px',
                  maxHeight: '450px'
                })
              } as CSSProperties}
            >
              <div className={`flex items-stretch overflow-hidden w-full h-full ${islandExpanded || isMarqueeFlowActive ? 'rounded-2xl' : 'rounded-md'}`}>
                {/* Звонок - приоритет */}
                {hasIncomingCall ? (
                  <div className="flex items-center gap-2 bg-gradient-to-br from-green-400 to-green-500 px-4 w-full">
                    <PhoneCall className="h-3.5 w-3.5 text-white animate-pulse flex-shrink-0" strokeWidth={2.5} />
                    <span className="text-[11px] font-semibold text-white">Звонок</span>
                    <button
                      type="button"
                      onClick={() => setHasIncomingCall(false)}
                      className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                      title="Сбросить"
                    >
                      <X className="h-3 w-3 text-white" strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  /* Уведомления - inline расширение */
                  <>
                    {!islandExpanded ? (
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 bg-gradient-to-br from-blue-400 to-blue-500 dark:from-[#60a5fa] dark:to-[#3b82f6] px-3 w-full h-full rounded-full overflow-hidden relative"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIslandExpanded(true);
                        }}
                        title="Уведомления"
                      >
                        <BellRing className="h-3.5 w-3.5 text-white flex-shrink-0" strokeWidth={2.5} />
                        {showMarquee && newMessages.length > 0 ? (
                          <div className="flex-1 overflow-hidden mr-1">
                            <div
                              className="animate-marquee whitespace-nowrap text-[10px] font-semibold text-white"
                              style={{
                                animationDuration: `${ISLAND_MARQUEE_DURATION_MS}ms`,
                                animationIterationCount: 1,
                                animationFillMode: 'forwards'
                              }}
                            >
                              {stripHtml(newMessages[0].content)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold text-white flex-shrink-0">
                            Уведомления
                          </span>
                        )}
                        {primaryActionTarget && !showMarquee && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (primaryActionTarget.notifType === 'todo') router.push(`/todos?id=${primaryActionTarget.notifId}`);
                              if (primaryActionTarget.notifType === 'event') router.push(`/calendar?id=${primaryActionTarget.notifId}`);
                            }}
                            className="w-4 h-4 rounded-full bg-white/95 hover:bg-white text-blue-600 flex items-center justify-center flex-shrink-0"
                            title={primaryActionTarget.notifType === 'todo' ? 'К задаче' : 'К событию'}
                          >
                            <ArrowRight className="h-2.5 w-2.5" strokeWidth={2.8} />
                          </button>
                        )}
                        <span className="min-w-[16px] h-4 px-1 rounded-full bg-white text-blue-600 dark:text-[#2563eb] text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                          {unreadCount}
                        </span>
                      </button>
                    ) : (
                      <div className="flex flex-col w-full overflow-hidden rounded-2xl border-4 border-blue-400 dark:border-[#60a5fa] text-left">
                        {/* Заголовок - голубой фон */}
                        <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-br from-blue-400 to-blue-500 dark:from-[#60a5fa] dark:to-[#3b82f6] border-b border-blue-500/30 dark:border-[#60a5fa]/45 flex-shrink-0">
                          {showMarquee && newMessages.length > 0 ? (
                            <div className="flex-1 overflow-hidden mr-2">
                              <div
                                className="animate-marquee whitespace-nowrap text-[11px] font-semibold text-white"
                                style={{
                                  animationDuration: `${ISLAND_MARQUEE_DURATION_MS}ms`,
                                  animationIterationCount: 1,
                                  animationFillMode: 'forwards'
                                }}
                              >
                                {stripHtml(newMessages[0].content)}
                              </div>
                            </div>
                          ) : (
                            <h3 className="text-[11px] font-semibold text-white">
                              Уведомления
                            </h3>
                          )}
                          <button
                            type="button"
                            onClick={() => setIslandExpanded(false)}
                            className="w-5 h-5 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                            title="Свернуть"
                          >
                            <X className="h-3 w-3 text-white" strokeWidth={2} />
                          </button>
                        </div>
                        
                        {/* Список уведомлений со скроллом - фон по теме */}
                        <div 
                          className="overflow-y-auto flex-1 bg-blue-50 dark:bg-[#0b2f6b] transition-opacity duration-200" 
                          style={{ 
                            maxHeight: '380px',
                            opacity: showExpandedContent ? 1 : 0
                          }}
                        >
                          {unreadMessages.length === 0 ? (
                            <div className="px-3 py-4 text-[10px] text-[var(--text-secondary)] text-center">
                              Нет новых уведомлений
                            </div>
                          ) : (
                            unreadMessages.slice(0, 10).map((msg) => {
                              const cleanContent = stripHtml(msg.content);
                              const notifType = getNotificationType(cleanContent);
                              const notifId = notifType === 'todo' || notifType === 'event' ? extractId(cleanContent, notifType) : null;
                              const timeLabel = formatMessageTime(msg.created_at);
                              
                              return (
                                <div 
                                  key={msg.id} 
                                  className="px-3 py-2.5 border-b border-blue-200/80 dark:border-blue-400/25 last:border-b-0 hover:bg-blue-100/80 dark:hover:bg-[#154187] transition-colors"
                                >
                                  <div className="flex items-start gap-2.5">
                                    {/* Аватарка/Иконка */}
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                                      {notifType === 'todo' && <CheckCircle2 className="h-4 w-4 text-blue-500" strokeWidth={2.5} />}
                                      {notifType === 'event' && <Calendar className="h-4 w-4 text-purple-500" strokeWidth={2.5} />}
                                      {notifType === 'contact' && <UserPlus className="h-4 w-4 text-green-500" strokeWidth={2.5} />}
                                      {notifType === 'default' && <BellRing className="h-4 w-4 text-orange-500" strokeWidth={2.5} />}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10.5px] leading-relaxed text-gray-900 dark:text-white font-medium text-left">
                                        {cleanContent || 'Уведомление'}
                                      </p>
                                      {timeLabel && (
                                        <p className="text-[8.5px] text-gray-600 dark:text-blue-100/85 mt-1 text-left">
                                          {timeLabel}
                                        </p>
                                      )}
                                      
                                      {/* Кнопки действий */}
                                      {notifId && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (notifType === 'todo') router.push(`/todos?id=${notifId}`);
                                            if (notifType === 'event') router.push(`/calendar?id=${notifId}`);
                                            setIslandExpanded(false);
                                          }}
                                          className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/90 hover:bg-white text-blue-500 text-[9px] font-semibold transition-colors"
                                        >
                                          {notifType === 'todo' ? 'К задаче' : 'К событию'}
                                          <ArrowRight className="h-2.5 w-2.5" strokeWidth={2.5} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
                </div>
              </div>
            )}Кнопка обновления */}
              {updateState !== 'idle' && (
                <button
                  type="button"
                  onClick={() => {
                    if (updateState === 'downloaded') {
                      window.sharDesktop?.updater?.install?.();
                    }
                  }}
                  className={`flex items-center gap-1 px-2 h-[22px] rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                    updateState === 'downloaded'
                      ? 'bg-green-500 hover:bg-green-400 text-white cursor-pointer'
                      : 'bg-blue-500/20 text-blue-400 cursor-default'
                  }`}
                  title={updateState === 'downloaded' ? `Обновить v${updateVersion || ''} (автоматически)` : `Загрузка обновления ${updatePercent}%`}
                  disabled={updateState === 'downloading'}
                >
                  {updateState === 'downloaded'
                    ? <><RefreshCw className="h-2.5 w-2.5" strokeWidth={2.5} />Обновить{updateVersion ? ` v${updateVersion}` : ''}</>
                    : <><Download className="h-2.5 w-2.5" strokeWidth={2.5} />{updatePercent}%</>}
                </button>
              )}

              {/* 

            {/* Правая часть: Меню + Window Controls */}
            <div
              className="flex items-center gap-1 pointer-events-auto"
              style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
            >
              {/* Меню с тремя точками */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center justify-center w-[18px] h-[18px] rounded-full transition-colors"
                  title="Меню"
                  aria-label="Меню"
                >
                  <MoreVertical className="h-3 w-3 text-[var(--text-primary)]" strokeWidth={2} />
                </button>

                {/* Выпадающее меню */}
                {showMenu && (
                  <div className="absolute top-full right-0 mt-1 w-44 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] shadow-xl backdrop-blur-xl overflow-hidden animate-fade-in z-50">
                    <div className="px-3 py-2">
                      <div className="flex items-center justify-between rounded-lg border border-[var(--border-light)] bg-[var(--bg-secondary)] px-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => void applyZoomPercent(zoomPercent - 1)}
                          className="w-7 h-6 rounded-md text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                          title="Уменьшить на 1%"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => void applyZoomPercent(100)}
                          className="min-w-[62px] h-6 rounded-md px-1 text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                          title="Сбросить масштаб"
                        >
                          {zoomPercent}%
                        </button>
                        <button
                          type="button"
                          onClick={() => void applyZoomPercent(zoomPercent + 1)}
                          className="w-7 h-6 rounded-md text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                          title="Увеличить на 1%"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="h-px bg-white/5 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        window.sharDesktop?.windowControls?.reload();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--text-primary)]"
                    >
                      <RotateCw className="h-3.5 w-3.5" strokeWidth={2} />
                      Обновить страницу
                    </button>
                  </div>
                )}
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => void window.sharDesktop?.windowControls?.minimize()}
                  className="electron-window-control"
                  title="Свернуть"
                  aria-label="Свернуть"
                >
                  <Minus className="h-3 w-3" strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const value = await window.sharDesktop?.windowControls?.toggleMaximize?.();
                    setIsMaximized(Boolean(value));
                  }}
                  className="electron-window-control"
                  title={isMaximized ? 'Восстановить' : 'Развернуть'}
                  aria-label={isMaximized ? 'Восстановить' : 'Развернуть'}
                >
                  {isMaximized ? <Copy className="h-2.5 w-2.5" strokeWidth={2.1} /> : <Square className="h-2.5 w-2.5" strokeWidth={2.1} />}
                </button>
                <button
                  type="button"
                  onClick={() => void window.sharDesktop?.windowControls?.close()}
                  className="electron-window-control electron-window-control-close"
                  title="Закрыть"
                  aria-label="Закрыть"
                >
                  <X className="h-3 w-3" strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </div>
        </div>

      <div
        className="electron-shell-content flex-1 min-h-0"
        style={{
          paddingBottom: 'var(--electron-bottomnav-offset, 0px)',
          boxSizing: 'border-box'
        } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
