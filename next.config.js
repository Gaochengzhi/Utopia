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
  async rewrites() {
    return [
      // Photography images: thumb/full variants
      {
        source: '/photography/thumb/:path*',
        destination: '/api/thumbnails/photography/:path*?type=thumbnail'
      },
      {
        source: '/photography/full/:path*',
        destination: '/api/thumbnails/photography/:path*?type=fullsize'
      },
      // Photography images: direct serve
      {
        source: '/photography/content/:path*',
        destination: '/api/photography-images/:path*'
      },
      // Photography cata (category covers)
      {
        source: '/photography/cata/:path*',
        destination: '/api/photography-images/cata/:path*'
      },
      // Blog images: thumb/full variants
      {
        source: '/.pic/thumb/:path*',
        destination: '/api/thumbnails/:path*?type=thumbnail'
      },
      {
        source: '/.pic/full/:path*',
        destination: '/api/thumbnails/:path*?type=fullsize'
      },
      // Blog images: direct serve
      {
        source: '/.pic/:path*',
        destination: '/api/images/:path*'
      }
    ]
  }
}

module.exports = withBundleAnalyzer(nextConfig)
