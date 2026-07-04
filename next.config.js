/** @type {import('next').NextConfig} */

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

// Initialize Cloudflare dev environment when running `next dev`
if (process.env.NODE_ENV === 'development') {
  try {
    const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare")
    initOpenNextCloudflareForDev()
  } catch (e) {
    // @opennextjs/cloudflare may not be available in all environments
    console.warn('Cloudflare dev bindings not available:', e.message)
  }
}

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@opennextjs/cloudflare'],
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // Keep image rewrites enabled in every environment.
    // Most requests should go straight to the CDN, but if a page or user
    // requests origin paths like /.pic/* directly, the API routes can still
    // redirect to CDN (or proxy from R2 when CDN is unavailable).
    return [
      // Photography images (content, thumb, full, cata, banner)
      {
        source: '/photography/:variant(content|thumb|full|cata|banner)/:path*',
        destination: '/api/photography-images/:variant/:path*'
      },
      // Blog images
      {
        source: '/.pic/:path*',
        destination: '/api/images/:path*'
      }
    ]
  }
}

module.exports = withBundleAnalyzer(nextConfig)
