import type { NextConfig } from "next";

const API_ORIGIN = process.env.MITRA_API_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  devIndicators: false,
  // drei <Html> portals double-mount under StrictMode in dev and log a React unmount race; production is unaffected.
  reactStrictMode: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Voice + AI extraction can take a while when models are busy; keep the proxy open long enough.
    proxyTimeout: 90_000,
  },
  // Same-origin API proxy: the session cookie stays httpOnly and first-party.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
