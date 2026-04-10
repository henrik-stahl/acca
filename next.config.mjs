/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
    serverComponentsExternalPackages: ["@libsql/client", "@prisma/adapter-libsql", "libsql"],
  },
};

export default nextConfig;
