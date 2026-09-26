/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Permite compatibilidad con bibliotecas dinámicas de UI y Chart.js
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvg: false,
      html2canvas: false,
      dompurify: false,
    };
    return config;
  },
};

export default nextConfig;
