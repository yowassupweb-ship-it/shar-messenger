import type { Metadata } from 'next';
import type { Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import BottomNav from '@/components/layout/BottomNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ElectronShell from '@/components/layout/ElectronShell';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Shar OS',
  description: 'Task and content management system',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    shortcut: ['/favicon.png'],
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tauriBackendBase = process.env.NEXT_PUBLIC_TAURI_BACKEND_URL || 'https://vokrug-sveta.shar-os.ru';
  const themeScript = `
    (function() {
      try {
        var theme = localStorage.getItem('theme');
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.setAttribute('data-theme', 'light');
        }
      } catch (e) {}
      try {
        var isTauriRuntime = !!(window.__TAURI__ || window.__TAURI_INTERNALS__ || (navigator.userAgent || '').toLowerCase().includes('tauri'));
        var params = new URLSearchParams(window.location.search);
        if (params.get('_platform') === 'tauri' || isTauriRuntime) {
          localStorage.setItem('_platform', 'tauri');
          params.delete('_platform');
          var newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
          window.history.replaceState(null, '', newUrl);
        }
        if (localStorage.getItem('_platform') === 'tauri') {
          document.documentElement.setAttribute('data-platform', 'tauri');
          var z = localStorage.getItem('tauriZoom');
          if (z) document.documentElement.style.zoom = z;

          var backendBase = '${tauriBackendBase}';
          var toBackendApiUrl = function(url) {
            if (!url) return url;
            if (url.startsWith('/api')) return backendBase + url;
            return url;
          };

          var originalFetch = window.fetch.bind(window);
          window.fetch = function(input, init) {
            if (typeof input === 'string') {
              return originalFetch(toBackendApiUrl(input), init);
            }
            if (input instanceof Request) {
              var nextUrl = toBackendApiUrl(input.url);
              if (nextUrl !== input.url) {
                var nextReq = new Request(nextUrl, input);
                return originalFetch(nextReq, init);
              }
            }
            return originalFetch(input, init);
          };

          var originalOpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(method, url) {
            var args = Array.prototype.slice.call(arguments);
            if (typeof url === 'string') {
              args[1] = toBackendApiUrl(url);
            }
            return originalOpen.apply(this, args);
          };
        }
      } catch (e) {}
    })();
  `;

  return (
    <html lang="ru" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <ErrorBoundary>
          <ThemeProvider>
            <ElectronShell>
              {children}
              <Suspense fallback={null}>
                <BottomNav />
              </Suspense>
            </ElectronShell>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
