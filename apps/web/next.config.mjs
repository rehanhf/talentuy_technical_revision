/**
 * Browser memanggil `/api/...` pada domain yang sama dengan frontend, lalu server
 * Next.js meneruskannya ke backend. Dengan begitu cukup satu alamat publik
 * (mis. satu Cloudflare Tunnel ke port 3000) dan tidak ada masalah CORS.
 *
 * API_PROXY_TARGET: alamat backend yang dapat dijangkau dari server Next.js
 * (Docker: http://backend:8000; `npm run dev` lokal: http://localhost:8000).
 */
const API_PROXY_TARGET = (process.env.API_PROXY_TARGET ?? "http://localhost:8000").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  // Pengambilan data X dan ekspor dapat berjalan lebih dari 30 detik (bawaan proxy).
  experimental: { proxyTimeout: 300_000 },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_PROXY_TARGET}/:path*` }];
  },
};

export default nextConfig;
