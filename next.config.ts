import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/Randort" : "",
  assetPrefix: process.env.NODE_ENV === "production" ? "/Randort/" : "",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
        pathname: "/maps/api/place/photo/**",
      },
    ],
  },
};

export default nextConfig;
