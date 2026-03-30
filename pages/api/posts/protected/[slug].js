import { getDB, getR2 } from '../../../../lib/cfContext'
import { verifyAuthCookieAsync } from '../../../../lib/auth'

/**
 * Lightweight frontmatter stripper (avoids heavy gray-matter dependency)
 */
function stripFrontmatter(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
}

/**
 * Protected content API (B-plan)
 * Returns full markdown content for authenticated users only.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const isAuthenticated = await verifyAuthCookieAsync(req.cookies)
  if (!isAuthenticated) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const { slug } = req.query
  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' })
  }

  const decodedSlug = decodeURIComponent(slug)

  try {
    const db = await getDB()
    if (db) {
      const post = await db.prepare(
        'SELECT slug, title, is_protected FROM posts WHERE slug = ? AND is_protected = 1'
      ).bind(decodedSlug).first()

      if (!post) {
        return res.status(404).json({ error: 'Article not found' })
      }

      const r2 = await getR2()
      if (r2) {
        const obj = await r2.get(decodedSlug)
        if (obj) {
          let content = await obj.text()
          try {
            const { normalizeImagePath } = require('/components/util/imageUtils')
            content = normalizeImagePath(stripFrontmatter(content))
          } catch (e) {}

          return res.status(200).json({
            slug: post.slug,
            title: post.title,
            content: content || '',
          })
        }
      }
    }

    return res.status(404).json({ error: 'Article not found' })
  } catch (error) {
    console.error('Protected content error:', error)
    return res.status(500).json({ error: 'Failed to fetch content' })
  }
}

