/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vasanth-dsp-marketplace001.s3.ap-south-2.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;