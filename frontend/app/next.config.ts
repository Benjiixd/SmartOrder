import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.occ.axfood.se" },
      { protocol: "https", hostname: "assets.axfood.se" },
      { protocol: "https", hostname: "static.ica.se" },
      { protocol: "https", hostname: "assets.icanet.se" },
      { protocol: "https", hostname: "www.ica.se" },
      { protocol: "https", hostname: "ica.se" },
    ],
  },
};


export default nextConfig;
