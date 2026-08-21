import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't bundle sharp into the serverless function — that 500s Ajustes on
  // Vercel ("Could not load the sharp module using the linux-x64 runtime").
  serverExternalPackages: ["sharp"],
  // Avoid serving a stale client RSC payload when navigating into a Fecha.
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
};

export default nextConfig;
