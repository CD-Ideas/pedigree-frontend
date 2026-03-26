import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Use webpack for builds to avoid Turbopack filesystem race conditions */
  buildActivity: true,
};

export default nextConfig;
