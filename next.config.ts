import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://10.0.0.10:3000", "http://localhost:3000"],
};

export default withSerwist({
  ...nextConfig,
  cacheComponents: false,
});
