import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
  if (process.env.NODE_ENV === 'development') {
    return [{ source: "/api/:path*", destination: "http://localhost:3000/api/:path*" }];
  }
  return [];
}
};

export default nextConfig;
