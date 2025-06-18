import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "retroachievements.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
