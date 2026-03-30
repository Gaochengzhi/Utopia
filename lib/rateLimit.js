/**
 * Rate limiting utility for API protection
 * Worker-compatible: no setInterval, uses lazy cleanup
 */

const rateLimitStore = new Map()

// Lazy cleanup threshold
const CLEANUP_THRESHOLD = 1000

/**
 * Clean up old entries (called lazily, not on a timer)
 */
function lazyCleanup(windowMs) {
  if (rateLimitStore.size < CLEANUP_THRESHOLD) return

  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.windowStart > windowMs * 2) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Rate limiter
 * @param {string} ip - Client IP address
 * @param {object} options - Configuration options
 * @param {number} options.limit - Max requests per window (default: 10)
 * @param {number} options.windowMs - Time window in ms (default: 60000 = 1 minute)
 * @returns {object} { allowed: boolean, remaining: number, resetIn: number }
 */
export function rateLimit(ip, options = {}) {
  const { limit = 10, windowMs = 60000 } = options
  const now = Date.now()
  const key = ip

  // Lazy cleanup instead of setInterval
  lazyCleanup(windowMs)

  let record = rateLimitStore.get(key)

  if (!record || now - record.windowStart > windowMs) {
    record = { count: 1, windowStart: now }
    rateLimitStore.set(key, record)
    return { allowed: true, remaining: limit - 1, resetIn: windowMs }
  }

  record.count++

  if (record.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: windowMs - (now - record.windowStart),
    }
  }

  return {
    allowed: true,
    remaining: limit - record.count,
    resetIn: windowMs - (now - record.windowStart),
  }
}

/**
 * Get client IP from request
 */
export function getClientIp(req) {
  // Cloudflare provides CF-Connecting-IP
  const cfIp = req.headers['cf-connecting-ip']
  if (cfIp) return cfIp

  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()

  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown'
}

/**
 * Blocked paths that should return 404 immediately
 */
export const blockedPaths = [
  /\.php$/i, /\.asp$/i, /\.aspx$/i, /\.jsp$/i, /\.cgi$/i,
  /wp-admin/i, /wp-content/i, /wp-includes/i,
  /wordpress/i, /xmlrpc/i, /phpmyadmin/i,
  /admin\.php/i, /config\.php/i, /setup\.php/i, /install\.php/i,
  /\.env$/i, /\.git\//i, /\.svn\//i,
  /\.htaccess/i, /\.htpasswd/i, /web\.config/i,
  /\.sql$/i, /\.bak$/i, /\.backup$/i, /\.old$/i,
  /\.orig$/i, /\.swp$/i, /\.DS_Store/i, /Thumbs\.db/i,
]

export function isBlockedPath(pathname) {
  return blockedPaths.some(pattern => pattern.test(pathname))
}
