import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@heroui/react", "@heroui/styles"],
  experimental: {
    optimizePackageImports: ["@heroui/react", "framer-motion"],
  },
};

export default nextConfig;
