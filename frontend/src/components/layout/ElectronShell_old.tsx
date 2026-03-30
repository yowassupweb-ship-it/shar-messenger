'use client';

import Image from 'next/image';
import { Minus, Square, Copy, X, Phone, PhoneCall, Bell, BellRing, MoreVertical, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState, useRef } from 'react';

interface ElectronShellProps {
  children: ReactNode;
}

const ELECTRON_TITLEBAR_OFFSET = 26;

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

export default function ElectronShell({ children }: ElectronShellProps) {
  const pathname = usePathname();
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [hasIncomingCall, setHasIncomingCall] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Проверка, скрывать ли хедер (на странице чатов)
  const shouldHideHeader = pathname === '/messages' || pathname.startsWith('/messages/');

  useEffect(() => {
    const electronAvailable = typeof window !== 'undefined' && Boolean(window.sharDesktop?.windowControls);
    setIsElectron(electronAvailable);

    if (!electronAvailable) return;

    document.documentElement.classList.add('electron-app');
    document.documentElement.setAttribute('data-electron-react-shell', 'true');
    document.documentElement.style.setProperty('--electron-titlebar-offset', `${ELECTRON_TITLEBAR_OFFSET}px`);
    document.body.classList.add('electron-app');

    const controls = window.sharDesktop?.windowControls;
    controls?.isMaximized?.().then((value) => setIsMaximized(Boolean(value))).catch(() => {});
    const unsubscribe = controls?.onMaximizedChanged?.((value) => setIsMaximized(Boolean(value)));

    return () => {
      document.documentElement.classList.remove('electron-app');
      document.documentElement.removeAttribute('data-electron-react-shell');
      document.documentElement.style.removeProperty('--electron-titlebar-offset');
      document.body.classList.remove('electron-app');
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

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

  // Симуляция звонка и уведомлений (для демонстрации)
  useEffect(() => {
    if (!isElectron) return;

    // Симулируем входящий звонок через 3 секунды
    const callTimer = setTimeout(() => {
      setHasIncomingCall(true);
      // Автоматически убираем через 5 секунд
      setTimeout(() => setHasIncomingCall(false), 5000);
    }, 3000);

    // Обновляем счетчик уведомлений
    const notifTimer = setInterval(() => {
      setNotificationCount(prev => {
        if (prev >= 5) return 1;
        return prev + 1;
      });
      setHasNotifications(true);
    }, 10000);

    return () => {
      clearTimeout(callTimer);
      clearInterval(notifTimer);
    };
  }, [isElectron]);

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

  if (!isElectron) {
    return <>{children}</>;
  }

  return (
    <div className="electron-shell-root flex min-h-screen flex-col">
      {!shouldHideHeader && (
        <div className="pointer-events-none sticky top-0 z-[160] px-3 pt-1 pb-1">
          <div className="pointer-events-auto relative flex items-center justify-between w-full">
            {/* Левая часть: Лого + "Shar OS" */}
            <div
              className="flex items-center gap-1.5 rounded-full border border-[var(--border-light)] bg-gradient-to-b from-white/10 to-white/5 px-2 py-0.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl"
              style={{ WebkitAppRegion: 'drag' } as CSSProperties}
            >
              <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                <Image src="/group-6.png" alt="Shar OS" width={16} height={16} className="h-[16px] w-[16px] object-contain" priority />
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-primary)] whitespace-nowrap">Shar OS</span>
            </div>

            {/* Динамический островок - по центру, приоритет звонку */}
            {(hasIncomingCall || hasNotifications) && (
              <div
                className="electron-dynamic-island absolute left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-gradient-to-b from-white/10 to-white/5 px-2.5 py-0.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl animate-fade-in animate-slide-in-from-top"
                style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
              >
                {hasIncomingCall ? (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-green-400 to-green-500 px-2 py-0.5 transition-all active:scale-95"
                    onClick={() => {
                      console.log('Ответить на звонок');
                      setHasIncomingCall(false);
                    }}
                    title="Входящий звонок"
                  >
                    <PhoneCall className="h-3 w-3 text-white animate-pulse" strokeWidth={2.5} />
                    <span className="text-[10px] font-medium text-white">Звонок</span>
                  </button>
                ) : hasNotifications ? (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 px-2 py-0.5 transition-all active:scale-95"
                    onClick={() => {
                      console.log('Открыть уведомления');
                      setHasNotifications(false);
                    }}
                    title="Уведомления"
                  >
                    <BellRing className="h-3 w-3 text-white" strokeWidth={2.5} />
                    {notificationCount > 0 && (
                      <span className="min-w-[14px] h-3.5 px-0.5 rounded-full bg-white text-blue-600 text-[8px] font-bold flex items-center justify-center">
                        {notificationCount}
                      </span>
                    )}
                  </button>
                ) : null}
              </div>
            )}

            {/* Правая часть: Меню + Window Controls */}
            <div
              className="flex items-center gap-1 rounded-full border border-[var(--border-light)] bg-gradient-to-b from-white/10 to-white/5 px-1.5 py-0.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl"
              style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
            >
              {/* Меню с тремя точками */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center justify-center w-[18px] h-[18px] rounded-full hover:bg-white/10 transition-colors"
                  title="Меню"
                  aria-label="Меню"
                >
                  <MoreVertical className="h-3 w-3 text-[var(--text-primary)]" strokeWidth={2} />
                </button>

                {/* Выпадающее меню */}
                {showMenu && (
                  <div className="absolute top-full right-0 mt-1 w-40 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] shadow-xl backdrop-blur-xl overflow-hidden animate-fade-in">
                    <button
                      type="button"
                      onClick={() => {
                        window.sharDesktop?.windowControls?.zoomIn();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                    >
                      <ZoomIn className="h-3.5 w-3.5" strokeWidth={2} />
                      Увеличить
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.sharDesktop?.windowControls?.zoomOut();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                    >
                      <ZoomOut className="h-3.5 w-3.5" strokeWidth={2} />
                      Уменьшить
                    </button>
                    <div className="h-px bg-white/5 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        window.sharDesktop?.windowControls?.reload();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--text-primary)] hover:bg-white/5 transition-colors"
                    >
                      <RotateCw className="h-3.5 w-3.5" strokeWidth={2} />
                      Обновить
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
                  <Minus className="h-2.5 w-2.5" strokeWidth={2.2} />
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
                  {isMaximized ? <Copy className="h-2 w-2" strokeWidth={2.1} /> : <Square className="h-2 w-2" strokeWidth={2.1} />}
                </button>
                <button
                  type="button"
                  onClick={() => void window.sharDesktop?.windowControls?.close()}
                  className="electron-window-control electron-window-control-close"
                  title="Закрыть"
                  aria-label="Закрыть"
                >
                  <X className="h-2.5 w-2.5" strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="electron-shell-content flex-1 min-h-0">{children}</div>
    </div>
  );
}
