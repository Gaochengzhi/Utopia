import { getDB } from '../../lib/cfContext'
import { verifyAuthCookieAsync } from '../../lib/auth'
import { getPaginatedPosts } from '../../lib/data/posts'

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

    const { posts, totalPosts, totalPages } = await getPaginatedPosts(db, {
      page: pageNum,
      limit: limitNum,
      isAuthenticated,
    })

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
