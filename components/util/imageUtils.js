// Image path constants - uses environment variable or default
const IMAGE_SERVER_URL = process.env.NEXT_PUBLIC_IMAGE_URL || '/.pic/'

/**
 * Normalize image paths in markdown content
 * Replaces local file paths with the configured image server URL
 */
export function normalizeImagePath(content) {
  if (!content) return content

  // Replace hardcoded local paths
  return content
    .replace(
      new RegExp(
        "(file://)?/Users/kounarushi/mycode/web-blog/public/.pic/",
        "gm"
      ),
      IMAGE_SERVER_URL
    )
    .replace(
      new RegExp(
        "(file://)?/Users/[^/]+/[^/]+/web-blog/public/.pic/",
        "gm"
      ),
      IMAGE_SERVER_URL
    )
}

/**
 * Process image path for photography pages
 * Maps internal paths to image server URLs
 */
export function processPhotographyPath(path) {
  if (!path) return path

  return path.replace(/^\/photography\//, IMAGE_SERVER_URL)
}
