import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output mode for Vercel (default is best for Vercel)
  // Use 'standalone' if deploying to Docker/Railway instead
  // output: "standalone",

  // Allow backend API images if needed
  images: {
    unoptimized: true,
  },

  // Environment variables validation at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },

  // Headers for security and CORS
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
