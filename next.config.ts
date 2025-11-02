import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**', // Allow all paths from localhost
      },
      {
        protocol: 'https',
        hostname: '**', // Allow all production domains
        pathname: '/**', // Allow all paths
      },
    ],
  },
};

export default nextConfig;