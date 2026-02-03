import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  fallbacks: {
    document: "/~offline",
  },
});

const nextConfig: NextConfig = {
  // Allow dev server access from network IP (e.g. 10.0.0.10)
  allowedDevOrigins: ["http://10.0.0.10:3000", "http://localhost:3000"],
};

export default withPWA(nextConfig);
