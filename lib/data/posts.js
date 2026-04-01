/**
 * Shared data-access layer for post queries.
 *
 * Both getStaticProps (SSG) and API route handlers call these functions
 * so the query logic lives in one place.
 */

import { normalizeImageUrl } from '../../components/util/imageUtils'

/**
 * Mask non-whitespace characters with '*' for protected content.
 *
 * @param {string} content
 * @returns {string}
 */
export function maskContent(content) {
  if (!content) return content
  return content.replace(/[^\s\n]/g, '*')
}

/**
 * Transform raw D1 post rows into the shape the frontend expects.
 *
 * @param {Array} rows – raw rows from D1 `posts` table
 * @param {Object} [options]
 * @param {boolean} [options.isAuthenticated=false] – whether user is authenticated
 * @returns {Array}
 */
export function transformPostRows(rows, { isAuthenticated = false } = {}) {
  return (rows || []).map(row => {
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
}

/**
 * Fetch paginated posts from D1.
 *
 * @param {D1Database} db
 * @param {Object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.limit=10]
 * @param {boolean} [options.isAuthenticated=false]
 * @returns {Promise<{posts: Array, totalPosts: number, totalPages: number}>}
 */
export async function getPaginatedPosts(db, { page = 1, limit = 10, isAuthenticated = false } = {}) {
  const countResult = await db.prepare('SELECT COUNT(*) as total FROM posts').first()
  const totalPosts = countResult?.total || 0

  const offset = (page - 1) * limit
  const { results } = await db.prepare(`
    SELECT slug, title, category, content_preview, first_image,
           is_protected, created_at, updated_at, path
    FROM posts
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all()

  const posts = transformPostRows(results, { isAuthenticated })
  const totalPages = Math.ceil(totalPosts / limit)

  return { posts, totalPosts, totalPages }
}
