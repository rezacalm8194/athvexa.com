/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep Prisma's native query engine out of the Next.js bundle. Without this,
  // production login dies with a 500 even when DATABASE_URL is valid.
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
