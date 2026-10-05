/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Root of the agency domain points at the VSL page, not the taskflow app
      {
        source: "/",
        has: [{ type: "host", value: "(www\\.)?trifecta-agency\\.pl" }],
        destination: "/vsl-alchemik",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [{ source: "/vsl-alchemik", destination: "/vsl-alchemik/index.html" }];
  },
};

export default nextConfig;
