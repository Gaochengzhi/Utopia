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
    // In production the frontend uses CDN URLs directly (lib/cdnUrl.js).
    // These rewrites are only needed as a dev/fallback path when
    // NEXT_PUBLIC_R2_CDN_URL is not configured.
    if (process.env.NEXT_PUBLIC_R2_CDN_URL) {
      return []
    }

    return [
      // Photography images (content, thumb, full, cata)
      {
        source: '/photography/:variant(content|thumb|full|cata)/:path*',
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
