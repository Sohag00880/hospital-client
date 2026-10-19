/** @type {import('next').NextConfig} */
const backendUrl = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/+$/, "");

const nextConfig = {
  reactStrictMode: true,
  // Keep verification builds separate from a running development server.
  distDir: process.env.NEXT_VERIFY_BUILD === "1" ? ".next-verify" : ".next",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
