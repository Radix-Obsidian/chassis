/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 14.2 gates the instrumentation.ts startup hook behind this flag; it boots the in-process
  // reminder scheduler (see instrumentation.ts → lib/reminder-scheduler.ts).
  experimental: { instrumentationHook: true },
};

export default nextConfig;
