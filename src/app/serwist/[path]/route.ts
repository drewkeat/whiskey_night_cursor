import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";
import type { NextConfig } from "next";

// Next.js config so Serwist can configure the service worker. Use dynamic import
// to avoid circular dependency and path issues.
const nextConfig: NextConfig = (await import("../../../../next.config")).default;

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
    swSrc: "src/app/sw.ts",
    nextConfig,
    useNativeEsbuild: true,
  });
