import type { NextConfig } from "next";

// Limit thread pool and CPU workers to avoid OS thread exhaustion (EAGAIN / os error 11) on high-core servers
process.env.NEXT_CPU_COUNT = process.env.NEXT_CPU_COUNT || '2';
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '4';

const nextConfig: NextConfig = {
  experimental: {
    cpus: 2,
    webpackBuildWorker: false,
  },
};

export default nextConfig;
