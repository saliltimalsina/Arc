import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@heroui/react", "@heroui/styles"],
  experimental: {
    optimizePackageImports: ["@heroui/react", "framer-motion"],
  },
};

export default nextConfig;
