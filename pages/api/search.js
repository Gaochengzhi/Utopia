import { getDB } from '../../lib/cfContext'
import { verifyAuthCookieAsync } from '../../lib/auth'

function maskContent(content) {
  if (!content) return content
  return content.replace(/[^\s\n]/g, '*')
}

export default async function handler(req, res) {
  const { query } = req.query

  // Input validation
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Invalid search query' })
  }

  const dangerousChars = /[|&;$`\\'"<>]/g
  if (dangerousChars.test(query)) {
    return res.status(400).json({ error: 'Invalid characters in search query' })
  }

  if (query.length > 100) {
    return res.status(400).json({ error: 'Search query too long' })
  }

  if (query.trim().length < 2) {
    return res.status(400).json({ error: 'Search query too short' })
  }

  const db = await getDB()
  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
  }

  // Search result content is auth-sensitive (masked/unmasked)
  res.setHeader('Cache-Control', 'private, no-store, max-age=0')
  res.setHeader('Vary', 'Cookie')

  const isAuthenticated = await verifyAuthCookieAsync(req.cookies)

  try {
    // FTS5 search — quote the query to treat it as a phrase
    const ftsQuery = `"${query.trim().replace(/"/g, '""')}"`

    const { results } = await db.prepare(`
      SELECT p.slug, p.title, p.is_protected, p.path,
             snippet(posts_fts, 1, '<<', '>>', '...', 40) as snippet
      FROM posts_fts
      JOIN posts p ON p.id = posts_fts.rowid
      WHERE posts_fts MATCH ?
      ORDER BY rank
      LIMIT 30
    `).bind(ftsQuery).all()

    // Format results as grep-compatible strings for existing SearchBar.js
    // Format: "filepath:lineNumber:content"
    const formattedResults = (results || []).map(row => {
      const filePath = `./${row.slug}`
      let content = row.snippet || row.title

      // Mask protected content if not authenticated
      if (row.is_protected && !isAuthenticated) {
        content = maskContent(content)
      }

      // Remove FTS highlight markers for grep-format compatibility
      content = content.replace(/<<|>>/g, '')

      return `${filePath}:1:${content}`
    })

    res.status(200).json({
      results: formattedResults,
      total: formattedResults.length,
      hasMore: false,
    })
  } catch (error) {
    console.error('Search error:', error)
    // If FTS5 MATCH fails (e.g., bad query syntax), try LIKE fallback
    try {
      const likeQuery = `%${query.trim()}%`
      const { results } = await db.prepare(`
        SELECT slug, title, is_protected, content_preview
        FROM posts
        WHERE title LIKE ? OR content_plain LIKE ?
        LIMIT 30
      `).bind(likeQuery, likeQuery).all()

      const formattedResults = (results || []).map(row => {
        const filePath = `./${row.slug}`
        let content = row.title
        if (row.is_protected && !isAuthenticated) {
          content = maskContent(content)
        }
        return `${filePath}:1:${content}`
      })

      res.status(200).json({
        results: formattedResults,
        total: formattedResults.length,
        hasMore: false,
      })
    } catch (fallbackError) {
      console.error('Search fallback also failed:', fallbackError)
      res.status(500).json({ error: 'Search failed' })
    }
  }
}
