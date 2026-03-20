import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@upds/ui",
    "@upds/validators",
    "@upds/services",
    "@upds/db",
    "@upds/types",
  ],
};

export default nextConfig;
