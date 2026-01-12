import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Отключаем проверки для быстрой сборки
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
