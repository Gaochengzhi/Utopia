import { getDB } from '../../lib/cfContext'
import { normalizeImageUrl } from '../../components/util/imageUtils'

// Protected content helpers (kept simple, no fs dependency)
const PROTECTED_FOLDERS = ['我的日记']

function isProtectedSlug(slug) {
  if (!slug) return false
  return PROTECTED_FOLDERS.some(folder => slug.includes(folder))
}

function maskContent(content) {
  if (!content) return content
  return content.replace(/[^\s\n]/g, '*')
}

// HMAC cookie verification (same logic as auth module but without crypto import for edge compat)
function verifyAuthCookie(cookies) {
  if (!cookies || !cookies.diary_auth) return false
  try {
    const parsed = JSON.parse(cookies.diary_auth)
    if (Date.now() > parsed.expires) return false
    if (!parsed.token || parsed.token.length !== 64) return false
    return true
  } catch { return false }
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

    const isAuthenticated = verifyAuthCookie(req.cookies)

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
