/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  serverExternalPackages: ['mysql2', 'bcryptjs', 'nodemailer'],
};
export default nextConfig;
