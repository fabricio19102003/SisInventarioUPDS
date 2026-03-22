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
  experimental: {
    optimizePackageImports: ["lucide-react", "@upds/ui"],
  },
};

export default nextConfig;
