/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image uploads go through server actions (default limit 1 MB). Vercel caps
  // request bodies at 4.5 MB, so allow just under that.
  experimental: { serverActions: { bodySizeLimit: "4.4mb" } },
};

export default nextConfig;
