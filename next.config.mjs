/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql", "libsql"],
};

export default nextConfig;
