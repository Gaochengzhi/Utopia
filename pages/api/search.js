// Search API - search keywords in markdown files
import { rateLimit, getClientIp } from '../../lib/rateLimit'
import { isProtectedPath, maskContent, verifyAuthCookie } from '../../lib/auth'

export default function handler(req, res) {
  // Rate limiting: 10 requests per minute per IP
  const clientIp = getClientIp(req)
  const rateLimitResult = rateLimit(clientIp, { limit: 10, windowMs: 60000 })

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', '10')
  res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetIn / 1000).toString())

  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(rateLimitResult.resetIn / 1000)
    })
  }

  const { query } = req.query

  // Input validation
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Invalid search query' })
  }

  // Security check: filter dangerous characters
  const dangerousChars = /[|&;$`\\'"<>]/g
  if (dangerousChars.test(query)) {
    return res.status(400).json({ error: 'Invalid characters in search query' })
  }

  // Limit search query length
  if (query.length > 100) {
    return res.status(400).json({ error: 'Search query too long' })
  }

  // Minimum query length
  if (query.trim().length < 2) {
    return res.status(400).json({ error: 'Search query too short' })
  }

  // Check authentication status
  const isAuthenticated = verifyAuthCookie(req.cookies)

  // Escape special regex characters
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const { exec } = require("child_process")

  // Use safer grep command with limited results
  const command = `grep -ir --line-number --binary-files=without-match --max-count=50 '${escapedQuery}' './post'`

  exec(command, { timeout: 5000 }, (err, stdout, stderr) => {
    if (err) {
      // If no matches found
      if (err.code === 1) {
        return res.status(200).json({ results: [], total: 0 })
      }
      // Other errors - don't expose internal details
      console.error('Search error:', err)
      return res.status(500).json({ error: 'Search failed' })
    }

    // Process results
    const lines = stdout.trim().split('\n').filter(line => line.length > 0)

    // Mask protected content if not authenticated
    const processedLines = lines.map(line => {
      // Extract file path from grep output (format: filepath:line:content)
      const match = line.match(/^([^:]+):(\d+):(.*)$/)
      if (!match) return line

      const [, filePath, lineNum, content] = match

      // Check if this file is protected
      if (isProtectedPath(filePath) && !isAuthenticated) {
        // Mask the content but keep file path and line number
        const maskedContent = maskContent(content)
        return `${filePath}:${lineNum}:${maskedContent}`
      }

      return line
    })

    const results = processedLines.slice(0, 30) // Limit results for frontend

    res.status(200).json({
      results: results,
      total: results.length,
      hasMore: lines.length > 30
    })
  })
}
