import type { NextConfig } from "next";

const REMOVED_BUSINESS_ROUTES = [
  "products",
  "inventory-movements",
  "manufacture-orders",
  "manufacturers",
  "recipients",
  "departments",
];

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
  async redirects() {
    // Redirect removed business routes (now live in apps/web) to admin dashboard
    const businessRedirects = REMOVED_BUSINESS_ROUTES.flatMap((route) => [
      {
        source: `/${route}`,
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: `/${route}/:path*`,
        destination: "/dashboard",
        permanent: true,
      },
    ]);

    return businessRedirects;
  },
};

export default nextConfig;
