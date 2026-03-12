'use client';

import Image from 'next/image';
import { Minus, Square, Copy, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

interface ElectronShellProps {
  children: ReactNode;
}

const ELECTRON_TITLEBAR_OFFSET = 72;

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

  if (!isElectron) {
    return <>{children}</>;
  }

  return (
    <div className="electron-shell-root flex min-h-screen flex-col">
      <div className="pointer-events-none sticky top-0 z-[160] flex justify-center px-3 pt-3 pb-2">
        <div
          className="electron-header-pill pointer-events-auto flex w-full max-w-[min(1280px,calc(100vw-24px))] items-center gap-2 rounded-full border border-[var(--border-light)] bg-gradient-to-b from-white/10 to-white/5 px-3 py-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl"
          style={{ WebkitAppRegion: 'drag' } as CSSProperties}
        >
          <div className="min-w-0 flex flex-1 items-center gap-2 px-0.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center">
                <Image src="/group-6.png" alt="Shar OS" width={28} height={28} className="h-[28px] w-[28px] object-contain" priority />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {titleMeta.title}
              </div>
              <div className="truncate text-[10px] text-[var(--text-muted)]">
                {titleMeta.subtitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}>
            <button
              type="button"
              onClick={() => void window.sharDesktop?.windowControls?.minimize()}
              className="electron-window-control"
              title="Свернуть"
              aria-label="Свернуть"
            >
              <Minus className="h-4 w-4" strokeWidth={2.2} />
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
              {isMaximized ? <Copy className="h-3.5 w-3.5" strokeWidth={2.1} /> : <Square className="h-3.5 w-3.5" strokeWidth={2.1} />}
            </button>
            <button
              type="button"
              onClick={() => void window.sharDesktop?.windowControls?.close()}
              className="electron-window-control electron-window-control-close"
              title="Закрыть"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>

      <div className="electron-shell-content flex-1 min-h-0">{children}</div>
    </div>
  );
}
