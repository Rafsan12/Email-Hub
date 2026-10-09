/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "imapflow", "mailparser", "nodemailer"],
  },
};

export default nextConfig;
