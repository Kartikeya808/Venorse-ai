import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/:path*",
          destination: `${process.env.BACKEND_URL || "http://localhost:3000"}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
