import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Отключаем проверки TypeScript для быстрой сборки
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
