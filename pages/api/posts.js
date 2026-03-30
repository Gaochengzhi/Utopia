import { getDB } from '../../lib/cfContext'
import { normalizeImageUrl } from '../../components/util/imageUtils'
import { verifyAuthCookieAsync } from '../../lib/auth'

function maskContent(content) {
  if (!content) return content
  return content.replace(/[^\s\n]/g, '*')
}

export default async function handler(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)

    if (pageNum < 1 || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'page must be >= 1, limit must be between 1 and 50'
      })
    }

    const db = await getDB()
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    // This endpoint is auth-sensitive; avoid CDN/browser caching by cookie-agnostic key
    res.setHeader('Cache-Control', 'private, no-store, max-age=0')
    res.setHeader('Vary', 'Cookie')

    const isAuthenticated = await verifyAuthCookieAsync(req.cookies)

    // Get total count
    const countResult = await db.prepare(
      'SELECT COUNT(*) as total FROM posts'
    ).first()
    const totalPosts = countResult?.total || 0

    // Paginated query
    const offset = (pageNum - 1) * limitNum
    const { results } = await db.prepare(`
      SELECT slug, title, category, content_preview, first_image,
             is_protected, created_at, updated_at, path
      FROM posts
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limitNum, offset).all()

    // Transform to match existing frontend API contract
    const posts = (results || []).map(row => {
      let content = row.content_preview || ''
      const isProtected = !!row.is_protected

      if (isProtected && !isAuthenticated) {
        content = maskContent(content)
      }

      return {
        path: row.slug,
        title: row.title,
        time: row.created_at,
        isLeaf: true,
        type: 'file',
        key: String(Math.floor(Math.random() * 9e9)),
        content,
        isProtected: isProtected && !isAuthenticated,
        firstImage: normalizeImageUrl(row.first_image) || null,
      }
    })

    const totalPages = Math.ceil(totalPosts / limitNum)

    res.status(200).json({
      posts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalPosts,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        limit: limitNum,
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch posts'
    })
  }
}
