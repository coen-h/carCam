// 1. ADD THIS AT THE VERY TOP (Silences the warning cleanly on Windows)
process.env.SERWIST_SUPPRESS_TURBOPACK_WARNING = "1";

import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // 2. CHANGE THIS LINE HERE
  disable: process.env.NODE_ENV !== "production", 
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {}, 
  // your other settings...
};

export default withSerwist(nextConfig);