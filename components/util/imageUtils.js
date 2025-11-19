const config = require('../../config.local.js')

/**
 * Normalize image paths in markdown content
 * Replaces local file paths with the configured image server URL
 */
export function normalizeImagePath(content) {
  if (!content) return content

  return content.replace(
    new RegExp(
      "(file://)?/Users/kounarushi/mycode/web-blog/public/.pic/",
      "gm"
    ),
    config.IMAGE_SERVER_URL
  )
}

/**
 * Process image path for photography pages
 * Maps internal paths to image server URLs
 */
export function processPhotographyPath(path) {
  if (!path) return path

  return path.replace(/^\/photography\//, config.IMAGE_SERVER_URL)
}
