import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            new URL("https://pub-a9d1d733450b4c238f0f8fcd82d6d699.r2.dev/**"),
        ],
    },
    /* config options here */
};

export default nextConfig;
