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
  async redirects() {
    // Redirect removed user-management route (now lives in apps/admin) to web dashboard
    return [
      {
        source: "/usuarios",
        destination: "/",
        permanent: true,
      },
      {
        source: "/usuarios/:path*",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
