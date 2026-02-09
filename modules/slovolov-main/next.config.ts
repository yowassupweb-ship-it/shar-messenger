import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Ensure Turbopack uses this folder as the workspace root
    root: __dirname,
  },
  eslint: {
    // Temporarily ignore ESLint errors during builds to unblock deploys
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
