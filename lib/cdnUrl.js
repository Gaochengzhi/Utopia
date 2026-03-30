/**
 * CDN URL helper — single source of truth for image CDN base URL.
 *
 * All image references go through these helpers so the browser fetches
 * images *directly* from the CDN edge cache (cdn.gaochengzhi.com)
 * instead of routing through the Worker API handlers.
 *
 * Path pattern (same as blog images):
 *   CDN_BASE + original_path  →  direct R2 edge fetch
 *
 * R2 layout:
 *   .pic/                      → blog article images
 *   photography/content/Cat/   → original photos
 *   photography/thumb/Cat/     → 400px webp thumbnails
 *   photography/cata/          → category cover images
 */

// Works on both server (Node) and client (browser)
const CDN_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_R2_CDN_URL || '')
    : (process.env.NEXT_PUBLIC_R2_CDN_URL || '')

/**
 * Convert a photography content path to its CDN thumbnail URL.
 *
 * Input:  /photography/content/Category/image.webp
 * Output: https://cdn.gaochengzhi.com/photography/thumb/Category/image.webp
 */
export function getCdnThumbUrl(originalPath) {
  if (!originalPath) return originalPath

  let key = originalPath
  if (key.startsWith('/photography/content/')) {
    key = key.replace('/photography/content/', '/photography/thumb/')
  }

  if (CDN_BASE && key.startsWith('/')) {
    return CDN_BASE + key
  }
  return key
}

/**
 * Convert a photography content path to its CDN full-size URL.
 * Full-size = the original in /content/ (no separate /full/ variant).
 *
 * Input:  /photography/content/Category/image.webp
 * Output: https://cdn.gaochengzhi.com/photography/content/Category/image.webp
 */
export function getCdnFullUrl(originalPath) {
  if (!originalPath) return originalPath

  // Serve content/ originals directly — no /full/ variant exists in R2
  let key = originalPath

  if (CDN_BASE && key.startsWith('/')) {
    return CDN_BASE + key
  }
  return key
}

/**
 * Convert any relative image path to its CDN URL.
 * The simplest helper — just prepends CDN_BASE.
 * Used for blog images, banner images, etc.
 */
export function getCdnUrl(relativePath) {
  if (!relativePath) return relativePath
  if (CDN_BASE && relativePath.startsWith('/')) {
    return CDN_BASE + relativePath
  }
  return relativePath
}

/**
 * Convert a category cover path to its CDN thumbnail URL.
 * CataContainer uses this for category banner images.
 */
export function getCdnCataThumbUrl(rawPath) {
  if (!rawPath) return rawPath

  // Category cover images stored under /photography/cata/
  if (rawPath.includes('/photography/cata/')) {
    if (CDN_BASE) return CDN_BASE + rawPath
    return rawPath
  }

  // Content images used as covers → use thumb variant
  if (rawPath.includes('/photography/content/')) {
    return getCdnThumbUrl(rawPath)
  }

  if (CDN_BASE && rawPath.startsWith('/')) {
    return CDN_BASE + rawPath
  }
  return rawPath
}

/**
 * onError handler for <img> tags — intelligent fallback chain.
 *
 * Fallback strategy:
 *   1. CDN /thumb/ 404  →  try CDN /content/ (original full-size)
 *   2. CDN /full/ 404   →  try CDN /content/
 *   3. Already /content/ or other →  give up
 *
 * Uses data-fallback counter to track retry state.
 */
export function handleCdnError(e) {
  const img = e.currentTarget || e.target
  if (!img) return

  const attempt = parseInt(img.dataset.fallback || '0', 10)
  const src = img.getAttribute('src')
  if (!src) return

  // Attempt 1: swap /thumb/ → /content/ (still on CDN)
  if (attempt === 0 && src.includes('/photography/thumb/')) {
    img.dataset.fallback = '1'
    img.src = src.replace('/photography/thumb/', '/photography/content/')
    return
  }

  // Attempt 2: swap /full/ → /content/
  if (attempt === 0 && src.includes('/photography/full/')) {
    img.dataset.fallback = '1'
    img.src = src.replace('/photography/full/', '/photography/content/')
    return
  }

  // No more fallbacks — give up
  img.dataset.fallback = '2'
}

export { CDN_BASE }
