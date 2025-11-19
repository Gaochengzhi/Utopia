import fs from 'fs'
import path from 'path'

/**
 * Validate that a file path is within allowed directories
 */
export function validateImagePath(fullPath) {
  const publicPicDir = path.join(process.cwd(), 'public', '.pic')
  const publicPhotoDir = path.join(process.cwd(), 'public', 'photography')

  return fullPath.startsWith(publicPicDir) || fullPath.startsWith(publicPhotoDir)
}

/**
 * Get content type for image file based on extension
 */
export function getImageContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const contentTypeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon'
  }

  return contentTypeMap[ext] || 'application/octet-stream'
}

/**
 * Set standard cache headers for images
 */
export function setCacheHeaders(res, mtime, maxAge = 86400) {
  res.setHeader('Cache-Control', `public, max-age=${maxAge}`)
  res.setHeader('Last-Modified', mtime.toUTCString())
}

/**
 * Check if request can use cached version (304 Not Modified)
 */
export function checkIfModified(req, mtime) {
  const ifModifiedSince = req.headers['if-modified-since']
  if (ifModifiedSince && new Date(ifModifiedSince) >= mtime) {
    return false // Not modified
  }
  return true // Modified or no cache
}

/**
 * Try multiple possible paths for an image
 */
export function resolveImagePath(imagePath) {
  const possiblePaths = [
    path.join(process.cwd(), 'public', '.pic', ...imagePath),
    path.join(process.cwd(), 'public', 'photography', ...imagePath)
  ]

  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      return testPath
    }
  }

  return null
}
