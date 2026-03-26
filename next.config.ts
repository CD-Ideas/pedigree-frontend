import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Disable turbopack for build to avoid filesystem race conditions */
  experimental: {
  },
};

export default nextConfig;
