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
    // Default 1 MB; Flight + a 500 KB sticker can trip it and look like a bad PNG.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
