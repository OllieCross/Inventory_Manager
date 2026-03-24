/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http',
        hostname: process.env.MINIO_ENDPOINT ?? 'localhost',
        port: process.env.MINIO_PORT ?? '9000',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
