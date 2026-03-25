import type { Metadata } from 'next';
import type { Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import BottomNav from '@/components/layout/BottomNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';
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
        var params = new URLSearchParams(window.location.search);
        if (params.get('_platform') === 'tauri') {
          localStorage.setItem('_platform', 'tauri');
          params.delete('_platform');
          var newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
          window.history.replaceState(null, '', newUrl);
        }
        if (localStorage.getItem('_platform') === 'tauri') {
          document.documentElement.setAttribute('data-platform', 'tauri');
          var z = localStorage.getItem('tauriZoom');
          if (z) document.documentElement.style.zoom = z;
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
            {children}
            <Suspense fallback={null}>
              <BottomNav />
            </Suspense>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
