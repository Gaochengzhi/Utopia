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
}

module.exports = nextConfig
