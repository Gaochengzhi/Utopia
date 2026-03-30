/**
 * CDN URL helper — single source of truth for image CDN base URL.
 *
 * In production the R2 bucket is fronted by a Cloudflare custom domain
 * (cdn.gaochengzhi.com).  All image references should go through this
 * helper so the browser fetches images *directly* from the CDN edge
 * cache instead of routing through the Worker API handlers (which adds
 * an unnecessary redirect hop and saturates the Worker under load).
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
  } else if (key.startsWith('/photography/')) {
    // Already a thumb or other variant — keep as-is
  }

  if (CDN_BASE && key.startsWith('/')) {
    return CDN_BASE + key
  }
  return key
}

/**
 * Convert a photography content path to its CDN full-size URL.
 *
 * Input:  /photography/content/Category/image.webp
 * Output: https://cdn.gaochengzhi.com/photography/full/Category/image.webp
 */
export function getCdnFullUrl(originalPath) {
  if (!originalPath) return originalPath

  let key = originalPath
  if (key.startsWith('/photography/content/')) {
    key = key.replace('/photography/content/', '/photography/full/')
  }

  if (CDN_BASE && key.startsWith('/')) {
    return CDN_BASE + key
  }
  return key
}

/**
 * Convert any relative image path to its CDN URL.
 * For category covers, banner images, etc.
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
  // Use thumb variant if available, fall back to original cata path
  if (rawPath.includes('/photography/cata/')) {
    // Cata covers don't have /thumb/ variants — serve original via CDN
    if (CDN_BASE) return CDN_BASE + rawPath
    return rawPath
  }

  // Content images used as covers
  if (rawPath.includes('/photography/content/')) {
    return getCdnThumbUrl(rawPath)
  }

  if (CDN_BASE && rawPath.startsWith('/')) {
    return CDN_BASE + rawPath
  }
  return rawPath
}

/**
 * Get the fallback (non-CDN) URL for an image path.
 * Strips the CDN prefix so the browser falls back to the Worker rewrite path.
 */
export function getFallbackUrl(cdnUrl) {
  if (!cdnUrl || !CDN_BASE) return cdnUrl
  if (cdnUrl.startsWith(CDN_BASE)) {
    return cdnUrl.slice(CDN_BASE.length)  // e.g. /photography/thumb/cat/img.webp
  }
  return cdnUrl
}

/**
 * onError handler for <img> tags — intelligent fallback chain.
 *
 * Fallback strategy:
 *   1. CDN /thumb/ 404  →  try CDN /content/ (original full-size)
 *   2. CDN /content/ 404 →  give up (avoid infinite loop)
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

  // Attempt 2: swap /photography/full/ → /photography/content/
  if (attempt === 0 && src.includes('/photography/full/')) {
    img.dataset.fallback = '1'
    img.src = src.replace('/photography/full/', '/photography/content/')
    return
  }

  // No more fallbacks — give up
  img.dataset.fallback = '2'
}

export { CDN_BASE }
