'use client';

import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_TTL_MS = 3 * 24 * 60 * 60 * 1000;

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosStandalone = Boolean((window.navigator as any).standalone);
  return mediaStandalone || iosStandalone;
}

function isChromeLikeMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isChrome = /Chrome\//i.test(ua);
  const isEdge = /Edg\//i.test(ua);
  const isOpera = /OPR\//i.test(ua);
  return isAndroid && isChrome && !isEdge && !isOpera;
}

export default function PwaEnhancements() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  const canShowInstallUi = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (!isChromeLikeMobile()) return false;
    if (isStandaloneMode()) return false;

    try {
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || '0');
      if (dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_TTL_MS) {
        return false;
      }
    } catch {
      // ignore
    }

    return true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/notifications-sw.js').catch((error) => {
        console.warn('[PWA] Service Worker registration failed', error);
      });
    }

    const onBeforeInstallPrompt = (event: Event) => {
      const deferred = event as BeforeInstallPromptEvent;
      deferred.preventDefault?.();
      setPromptEvent(deferred);
      if (canShowInstallUi) {
        setVisible(true);
      }
    };

    const onAppInstalled = () => {
      setVisible(false);
      setPromptEvent(null);
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {
        // ignore
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [canShowInstallUi]);

  if (!canShowInstallUi || !visible || !promptEvent) return null;

  return (
    <div className="fixed left-3 right-3 bottom-[78px] z-[120] rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)]/95 backdrop-blur-xl shadow-[0_18px_48px_-24px_rgba(0,0,0,0.45)] p-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center text-lg font-semibold">
          PWA
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Установить приложение</p>
          <p className="mt-0.5 text-[13px] leading-5 text-[var(--text-secondary)]">
            Добавьте Shar OS на главный экран, чтобы получать push и быстрее открывать чаты.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={installing}
              onClick={async () => {
                try {
                  setInstalling(true);
                  await promptEvent.prompt();
                  const choice = await promptEvent.userChoice;
                  if (choice.outcome !== 'accepted') {
                    localStorage.setItem(DISMISS_KEY, String(Date.now()));
                  }
                } catch {
                  localStorage.setItem(DISMISS_KEY, String(Date.now()));
                } finally {
                  setInstalling(false);
                  setVisible(false);
                }
              }}
              className="h-9 px-3 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-semibold disabled:opacity-60"
            >
              {installing ? 'Запрос...' : 'Установить'}
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem(DISMISS_KEY, String(Date.now()));
                } catch {
                  // ignore
                }
                setVisible(false);
              }}
              className="h-9 px-3 rounded-xl border border-[var(--border-light)] text-sm text-[var(--text-secondary)]"
            >
              Позже
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
