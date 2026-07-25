import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid serving a stale client RSC payload when navigating into a Fecha.
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
};

export default nextConfig;
