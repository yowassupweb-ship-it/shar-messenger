import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Отключаем проверки TypeScript для быстрой сборки
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // В dev режиме проксируем Telegram auth на production сервер
  // потому что бот отправляет подтверждения туда
  async rewrites() {
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
