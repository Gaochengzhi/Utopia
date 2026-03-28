/** @type {import('next').NextConfig} */

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/.pic/thumb/:path*',
        destination: '/api/thumbnails/:path*?type=thumbnail'
      },
      {
        source: '/.pic/full/:path*',
        destination: '/api/thumbnails/:path*?type=fullsize'
      },
      {
        source: '/.pic/:path*',
        destination: '/api/images/:path*'
      }
    ]
  }
}

module.exports = withBundleAnalyzer(nextConfig)
