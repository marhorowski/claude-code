/** @type {import('next').NextConfig} */
const nextConfig = {
  // Import arkusza .xlsx idzie akcją serwerową — domyślny limit 1 MB to za mało na większe pliki.
  experimental: { serverActions: { bodySizeLimit: "6mb" }, serverComponentsExternalPackages: ["exceljs"] },
};
export default nextConfig;
