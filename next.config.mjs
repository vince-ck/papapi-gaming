/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['lh3.googleusercontent.com'], // Allow Google profile images
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb', // Increase the body size limit for server actions
    },
  },
};

export default nextConfig;
