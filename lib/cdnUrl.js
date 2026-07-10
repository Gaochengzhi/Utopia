/**
 * CDN URL helper — single source of truth for image CDN base URL.
 *
 * All image references go through these helpers so the browser fetches
 * images *directly* from the CDN edge cache (cdn.gaochengzhi.com).
 *
 * Gallery previews use pre-generated R2 variants. Lightboxes keep using the
 * original /content/ object so display quality is unchanged.
 */

const RAW_CDN_BASE = process.env.NEXT_PUBLIC_R2_CDN_URL || ''
const CDN_BASE = RAW_CDN_BASE.replace(/\/+$/, '')
const ENABLE_LOCAL_ORIGIN_FALLBACK =
  process.env.NEXT_PUBLIC_ENABLE_LOCAL_ORIGIN_FALLBACK === 'true'
const WEBP_SOURCE_EXT_PATTERN = /\.(?:jpe?g|png|gif|bmp)$/i

function toWebpUrl(src) {
  if (!src || typeof src !== 'string') return null

  const match = src.match(/^([^?#]+)(\?[^#]*)?(#.*)?$/)
  if (!match) return null

  const [, pathname, search = '', hash = ''] = match
  if (!WEBP_SOURCE_EXT_PATTERN.test(pathname)) return null

  return pathname.replace(WEBP_SOURCE_EXT_PATTERN, '.webp') + search + hash
}

/**
 * Convert any path to its CDN URL. The universal helper.
 * Just prepends CDN_BASE — no path rewriting.
 */
export function getCdnUrl(relativePath) {
  if (!relativePath) return relativePath
  if (CDN_BASE && relativePath.startsWith('/')) {
    return CDN_BASE + relativePath
  }
  return relativePath
}

function getPhotoVariantUrl(originalPath, variant) {
  if (!originalPath) return originalPath

  const variantPath = originalPath.startsWith('/photography/content/')
    ? originalPath.replace('/photography/content/', `/photography/${variant}/`)
    : originalPath

  return getCdnUrl(variantPath)
}

/** 480px contact-sheet tile. */
export function getCdnThumbUrl(originalPath) {
  return getPhotoVariantUrl(originalPath, 'thumb-v3')
}

/** 960px gallery/film preview. */
export function getCdnPreviewUrl(originalPath) {
  return getPhotoVariantUrl(originalPath, 'preview-v3')
}

/** Original image, requested only after opening the lightbox. */
export const getCdnFullUrl = getCdnUrl

export function getCdnCataThumbUrl(originalPath) {
  if (originalPath?.startsWith('/photography/content/')) return getCdnThumbUrl(originalPath)
  return getCdnUrl(originalPath)
}

/**
 * onError handler for <img> tags.
 * If CDN fails, strip CDN prefix to fall back to origin.
 */
export function handleCdnError(e) {
  const img = e.currentTarget || e.target
  if (!img) return

  const src = img.getAttribute('src')
  if (!src) return

  // A derived asset may not have been backfilled yet. Fall back to the
  // matching original before trying the historical jpg -> webp fallback.
  if (img.dataset.variantFallback !== '1' && /\/photography\/(?:thumb-v3|preview-v3|thumb-v2|preview-v2|thumb|preview)\//.test(src)) {
    img.dataset.variantFallback = '1'
    img.src = src.replace(/\/photography\/(?:thumb-v3|preview-v3|thumb-v2|preview-v2|thumb|preview)\//, '/photography/content/')
    return
  }

  // Next fallback: same URL but with .webp extension
  if (img.dataset.webpFallback !== '1') {
    const webpSrc = toWebpUrl(src)
    if (webpSrc && webpSrc !== src) {
      img.dataset.webpFallback = '1'
      img.src = webpSrc
      return
    }
  }

  // Final fallback: strip CDN prefix and load from origin path once.
  if (img.dataset.fallback) return
  if (!CDN_BASE || !src.startsWith(CDN_BASE)) return

  // In local dev, keep CDN URL by default to avoid incorrect localhost fallback.
  if (
    typeof window !== 'undefined' &&
    !ENABLE_LOCAL_ORIGIN_FALLBACK &&
    /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
  ) {
    img.dataset.fallback = '1'
    return
  }

  img.dataset.fallback = '1'
  img.src = src.slice(CDN_BASE.length)
}

export { CDN_BASE }
