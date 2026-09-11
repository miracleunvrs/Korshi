import type { NextConfig } from "next";

if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("DEMO_MODE must run without Supabase credentials. Use a separate environment.");
}

const backendOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
const backendSocket = backendOrigin.replace(/^http/, "ws");

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "fonts.gstatic.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "localhost:8080"],
    },
  },
  async headers() {
    // В dev Next.js использует eval для Fast Refresh — без 'unsafe-eval' будет CSP-ошибка
    // В prod оставляем строгий, но разрешаем inline для Next
    const isDev = process.env.NODE_ENV !== "production";
    const scriptSrc = isDev
      ? "'self' 'unsafe-eval' 'unsafe-inline' https://fonts.gstatic.com"
      : "'self' 'unsafe-inline' https://fonts.gstatic.com";
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              `img-src 'self' data: blob: ${backendOrigin} https://images.unsplash.com`,
              `frame-src 'self' blob: ${backendOrigin}`,
              `connect-src 'self' ${backendOrigin} ${backendSocket} https://fonts.gstatic.com ws://localhost:*`,
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
