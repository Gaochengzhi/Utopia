/**
 * CDN URL helper — single source of truth for image CDN base URL.
 *
 * All image references go through these helpers so the browser fetches
 * images *directly* from the CDN edge cache (cdn.gaochengzhi.com).
 *
 * Simple rule: CDN_BASE + original_path → direct R2 edge fetch.
 * No /thumb/, no /full/ — always serve /content/ originals.
 */

const RAW_CDN_BASE = process.env.NEXT_PUBLIC_R2_CDN_URL || ''
const CDN_BASE = RAW_CDN_BASE.replace(/\/+$/, '')
const ENABLE_LOCAL_ORIGIN_FALLBACK =
  process.env.NEXT_PUBLIC_ENABLE_LOCAL_ORIGIN_FALLBACK === 'true'

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

// All variants are the same — serve originals via CDN, no path rewriting.
export const getCdnThumbUrl = getCdnUrl
export const getCdnFullUrl = getCdnUrl
export const getCdnCataThumbUrl = getCdnUrl

/**
 * onError handler for <img> tags.
 * If CDN fails, strip CDN prefix to fall back to origin.
 */
export function handleCdnError(e) {
  const img = e.currentTarget || e.target
  if (!img) return
  if (img.dataset.fallback) return  // already tried

  const src = img.getAttribute('src')
  if (!src || !CDN_BASE || !src.startsWith(CDN_BASE)) return

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
