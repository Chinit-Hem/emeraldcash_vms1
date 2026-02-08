/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
    const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
    const vercelOrigin = vercelUrl
      ? vercelUrl.startsWith("http")
        ? vercelUrl
        : `https://${vercelUrl}`
      : "";
    
    // In development, allow all origins to prevent CORS issues
    // In production, use strict origin checking
    const isDevelopment = process.env.NODE_ENV === 'development';
    const allowedOrigin = isDevelopment 
      ? "*" 
      : (appOrigin || vercelOrigin || "http://localhost:3000");
    const allowCredentials = !isDevelopment; // Credentials not allowed with wildcard



    const apiHeaders = [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: allowedOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
          { key: "Access-Control-Max-Age", value: "86400" },
          ...(allowCredentials ? [{ key: "Access-Control-Allow-Credentials", value: "true" }] : []),
        ],
      },

      {
        source: "/(.*)",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];

    return apiHeaders;

  },
};

export default nextConfig;
