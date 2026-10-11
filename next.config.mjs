/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Permite compatibilidad con bibliotecas dinámicas de UI y Chart.js
  async headers() {
    return [
      {
        source: '/central-neuralgica',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *',
          },
        ],
      },
    ];
  },
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
