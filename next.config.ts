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
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app', // Covers all Vercel deployments
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app', // Covers Vercel project URLs
        pathname: '/**',
      },
      // Add your custom domain if you have one
      // {
      //   protocol: 'https',
      //   hostname: 'your-custom-domain.com',
      //   pathname: '/**',
      // },
    ],
  },
  env: {
    ROOT_URL: process.env.NEXT_PUBLIC_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000'),
  },
};

export default nextConfig;