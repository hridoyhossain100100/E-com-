import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: '.',
  },
  experimental: {
    optimizeCss: true,
    // @react-best-practices: Auto-transform barrel imports to direct imports
    optimizePackageImports: ['lucide-react', 'axios'],
  },
  images: {
    // @web-performance-optimization: Modern image formats for smaller sizes
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // @security-audit: Security headers to protect against common attacks
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // @web-performance-optimization: Cache static assets aggressively
        source: '/(.*)\\.(jpg|jpeg|png|gif|ico|svg|webp|avif|woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  // @web-performance-optimization: Compress responses
  compress: true,
};

export default nextConfig;
