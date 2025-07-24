/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React 18 features
  reactStrictMode: true,

  // Optimize images
  images: {
    domains: [],
    formats: ["image/avif", "image/webp"],
  },

  // Optimize build output
  poweredByHeader: false,
  compress: true,
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react'],
    typedRoutes: true,
  },

  // External packages for server components (Next.js 15+)
  serverExternalPackages: ['@tanstack/react-query'],

  // Configure webpack for better bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Add path aliases for better module resolution - ensure exact match with tsconfig.json
    const path = require("path");
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
      "@/features": path.resolve(__dirname, "src/features"),
      "@/shared": path.resolve(__dirname, "src/shared"),
      "@/assets": path.resolve(__dirname, "src/assets"),
      "@/styles": path.resolve(__dirname, "src/styles"),
      "@/components": path.resolve(__dirname, "src/shared/components"),
      "@/hooks": path.resolve(__dirname, "src/shared/hooks"),
      "@/services": path.resolve(__dirname, "src/shared/services"),
      "@/utils": path.resolve(__dirname, "src/shared/utils"),
      "@/types": path.resolve(__dirname, "src/shared/types"),
      "@/stores": path.resolve(__dirname, "src/shared/stores"),
      "@/lib": path.resolve(__dirname, "src/lib"),
    };

    // Ensure proper file extension resolution
    config.resolve.extensions = [...(config.resolve.extensions || []), '.ts', '.tsx', '.js', '.jsx'];
    
    // Add fallback strategies for module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    // Force webpack to prefer our aliases over node_modules
    config.resolve.preferRelative = true;

    // Fix for recharts/victory-vendor issue
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'victory-vendor/d3-scale': 'd3-scale',
        'victory-vendor/d3-shape': 'd3-shape',
      };
    }

    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: "common",
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },

  // API proxy for development - route frontend API calls to Django backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/api/:path*`
          : "http://localhost:8000/api/:path*",
      },
    ];
  },

  // Configure headers for better security and caching
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      // Cache static assets
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Cache API responses for 60 seconds
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },

  // Enable TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false,
  },

  // Configure ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
