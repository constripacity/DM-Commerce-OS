/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep typedRoutes in production while reducing dev-time CPU overhead.
    typedRoutes: process.env.NODE_ENV === "production"
  }
};

export default nextConfig;
