// Image path constants - uses environment variable or default
const IMAGE_SERVER_URL = process.env.NEXT_PUBLIC_IMAGE_URL || '/.pic/'
const LOCAL_PIC_CONTENT_PATTERNS = [
  new RegExp("(file://)?/Users/kounarushi/mycode/web-blog/public/.pic/", "gm"),
  new RegExp("(file://)?/Users/[^/]+/[^/]+/web-blog/public/.pic/", "gm"),
]
const LOCAL_PIC_URL_PATTERNS = [
  new RegExp("^(file://)?/Users/kounarushi/mycode/web-blog/public/.pic/", "i"),
  new RegExp("^(file://)?/Users/[^/]+/[^/]+/web-blog/public/.pic/", "i"),
]
const LEGACY_API_IMAGE_CONTENT_PATTERN = /(https?:\/\/(?:www\.)?gaochengzhi\.com)?\/api\/images\//gm
const LEGACY_API_IMAGE_URL_PATTERN = /^(https?:\/\/(?:www\.)?gaochengzhi\.com)?\/api\/images\//i

function dedupePicPrefix(value) {
  return value
    .replace(/\/\.pic\/\.pic\//g, '/.pic/')
    .replace(/^\.pic\//i, '/.pic/')
}

/**
 * Normalize image paths in markdown content
 * Replaces local file paths with the configured image server URL
 */
export function normalizeImagePath(content) {
  if (!content) return content

  let normalized = content
  for (const pattern of LOCAL_PIC_CONTENT_PATTERNS) {
    normalized = normalized.replace(pattern, IMAGE_SERVER_URL)
  }

  // Legacy image URLs: /api/images/* and https://gaochengzhi.com/api/images/*
  normalized = normalized.replace(LEGACY_API_IMAGE_CONTENT_PATTERN, IMAGE_SERVER_URL)

  return dedupePicPrefix(normalized)
}

/**
 * Normalize a single image URL/path to the current image server.
 */
export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return url

  let normalized = url.trim()

  for (const pattern of LOCAL_PIC_URL_PATTERNS) {
    normalized = normalized.replace(pattern, IMAGE_SERVER_URL)
  }

  if (LEGACY_API_IMAGE_URL_PATTERN.test(normalized)) {
    normalized = normalized.replace(LEGACY_API_IMAGE_URL_PATTERN, IMAGE_SERVER_URL)
  }

  return dedupePicPrefix(normalized)
}

/**
 * Process image path for photography pages
 * Maps internal paths to image server URLs
 */
export function processPhotographyPath(path) {
  if (!path) return path

  return path.replace(/^\/photography\//, IMAGE_SERVER_URL)
}
