/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/ws/:path*",
        destination: "http://127.0.0.1:11434/ws/:path*", // Proxy WebSocket to Backend
      },
    ];
  },
  // Disable output buffering for streaming responses
  experimental: {
    proxyTimeout: 120000, // 2 minutes timeout for long responses
  },
  // Add headers to prevent buffering
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Accel-Buffering',
            value: 'no',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-transform',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
