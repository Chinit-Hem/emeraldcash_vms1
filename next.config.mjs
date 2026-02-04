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
    const allowedOrigin = appOrigin || vercelOrigin || "*";
    const allowCredentials = allowedOrigin !== "*";

    const corsHeaders = [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: allowedOrigin,
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
        ],
      },
    ];

    if (allowCredentials) {
      corsHeaders[0].headers.push({
        key: "Access-Control-Allow-Credentials",
        value: "true",
      });
    }

    return corsHeaders;
  },
};

export default nextConfig;
