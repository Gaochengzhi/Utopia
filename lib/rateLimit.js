// Rate limiting utility for API protection
// Simple in-memory store - resets on server restart

const rateLimitStore = new Map()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.windowStart > 60000) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Rate limiter middleware
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

  let record = rateLimitStore.get(key)

  if (!record || now - record.windowStart > windowMs) {
    // New window
    record = {
      count: 1,
      windowStart: now
    }
    rateLimitStore.set(key, record)
    return {
      allowed: true,
      remaining: limit - 1,
      resetIn: windowMs
    }
  }

  record.count++

  if (record.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: windowMs - (now - record.windowStart)
    }
  }

  return {
    allowed: true,
    remaining: limit - record.count,
    resetIn: windowMs - (now - record.windowStart)
  }
}

/**
 * Get client IP from request
 * Handles proxies (X-Forwarded-For, X-Real-IP)
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown'
}

/**
 * Blocked paths that should return 404 immediately
 * Common scanner targets
 */
export const blockedPaths = [
  /\.php$/i,
  /\.asp$/i,
  /\.aspx$/i,
  /\.jsp$/i,
  /\.cgi$/i,
  /wp-admin/i,
  /wp-content/i,
  /wp-includes/i,
  /wordpress/i,
  /xmlrpc/i,
  /phpmyadmin/i,
  /admin\.php/i,
  /config\.php/i,
  /setup\.php/i,
  /install\.php/i,
  /\.env$/i,
  /\.git\//i,
  /\.svn\//i,
  /\.htaccess/i,
  /\.htpasswd/i,
  /web\.config/i,
  /\.sql$/i,
  /\.bak$/i,
  /\.backup$/i,
  /\.old$/i,
  /\.orig$/i,
  /\.swp$/i,
  /\.DS_Store/i,
  /Thumbs\.db/i,
]

/**
 * Check if a path should be blocked
 */
export function isBlockedPath(pathname) {
  return blockedPaths.some(pattern => pattern.test(pathname))
}
