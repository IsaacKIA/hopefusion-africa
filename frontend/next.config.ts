import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker standalone deployment
  output: "standalone",

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control",  value: "on" },
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",          value: "SAMEORIGIN" },
          { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

  // Allow images from Cloudinary + Supabase
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  // Compress output
  compress: true,

  // Power-by header removal
  poweredByHeader: false,

  // Production source maps off
  productionBrowserSourceMaps: false,

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_API_URL:            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY:   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  },
};

export default nextConfig;
