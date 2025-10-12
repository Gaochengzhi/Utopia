/** @type {import('next').NextConfig} */

// next.config.js

const shouldAnalyzeBundles = process.env.ANALYZE === true

if (shouldAnalyzeBundles) {
  const withNextBundleAnalyzer =
    require("next-bundle-analyzer")(/* options come there */)
  nextConfig = withNextBundleAnalyzer(nextConfig)
}
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

// module.exports = withBundleAnalyzer({})
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
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

module.exports = nextConfig
