/**
 * Shared photo utility functions.
 *
 * Centralises helpers that were previously duplicated across:
 *   - pages/photographer/index.js
 *   - pages/api/photography/categories.js
 *   - pages/api/photography/[category].js
 *   - pages/api/photography/latest.js
 */

/**
 * Normalise a raw photo path (as stored in D1) into a canonical R2-style key.
 *
 * @param {string|null} rawPath   – the `path` column from the photos table
 * @param {string|null} category  – photo category (used to build fallback)
 * @param {string|null} filename  – photo filename  (used to build fallback)
 * @returns {string|null}
 */
export function normalizePhotoKey(rawPath, category, filename) {
  const fallback = category && filename ? `photography/content/${category}/${filename}` : null
  if (!rawPath) return fallback

  let key = String(rawPath).trim()
  if (!key) return fallback

  key = key.replace(/^https?:\/\/(?:www\.)?gaochengzhi\.com\//i, '')
  key = key.replace(/^\/+/, '')

  if (key.startsWith('photography/')) return key
  if (key.startsWith('content/')) return `photography/${key}`
  if (key.startsWith('.pic/')) return key
  if (key.startsWith('api/images/')) return `.pic/${key.slice('api/images/'.length)}`

  if (category) {
    if (key.includes('/')) return `photography/content/${key}`
    return `photography/content/${category}/${key}`
  }

  return fallback || key
}

/**
 * Convert an R2 key to a public-facing path (leading slash).
 */
export function toPublicPath(key) {
  if (!key) return null
  return `/${String(key).replace(/^\/+/, '')}`
}

/**
 * Normalise a category name (trim whitespace, reject blanks).
 */
export function normalizeCategoryName(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

/**
 * Look for a manually-uploaded category cover image on the local filesystem.
 * Only meaningful during SSG (build-time); in Worker runtime this returns null.
 */
export function findManualCoverPath(category) {
  try {
    const fs = require('fs')
    const path = require('path')
    const base = path.join(process.cwd(), 'public', 'photography', 'cata')
    const exts = ['jpg', 'jpeg', 'webp', 'png']

    for (const ext of exts) {
      const filePath = path.join(base, `${category}.${ext}`)
      if (fs.existsSync(filePath)) {
        return `/photography/cata/${category}.${ext}`
      }
    }
  } catch (e) { /* fs unavailable in Worker runtime */ }

  return null
}
