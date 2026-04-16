import type { NextConfig } from "next";

const isTauriStaticExport = process.env.TAURI_STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  ...(isTauriStaticExport
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),

  // Отключаем проверки TypeScript для быстрой сборки
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // В dev режиме проксируем Telegram auth на production сервер
  // потому что бот отправляет подтверждения туда
  async rewrites() {
    if (isTauriStaticExport) {
      return [];
    }

    const isDev = process.env.NODE_ENV !== 'production';
    
    if (isDev) {
      return [
        {
          source: '/api/auth/telegram/:path*',
          destination: 'https://vokrug-sveta.shar-os.ru/api/auth/telegram/:path*',
        },
      ];
    }
    
    return [];
  },
};

export default nextConfig;
