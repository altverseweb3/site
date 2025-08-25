import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "token-logos.family.co",
      },
    ],
  },
};

export default nextConfig;
