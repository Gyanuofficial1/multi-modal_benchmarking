import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: "/aap",
        destination: "/app",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
