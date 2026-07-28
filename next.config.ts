import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Optimize RAM usage during Next.js production build */
  experimental: {
    cpus: 1,
  },
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
