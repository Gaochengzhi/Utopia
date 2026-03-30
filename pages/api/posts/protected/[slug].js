import { getDB, getR2 } from '../../../../lib/cfContext'
import { verifyAuthCookieAsync } from '../../../../lib/auth'

/**
 * Protected content API (B-plan)
 * Returns full markdown content for authenticated users only.
 * In production: fetches from R2
 * In dev: falls back to local filesystem
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify authentication
  const isAuthenticated = await verifyAuthCookieAsync(req.cookies)
  if (!isAuthenticated) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const { slug } = req.query
  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' })
  }

  // Decode the slug (it comes URL-encoded from the client)
  const decodedSlug = decodeURIComponent(slug)

  try {
    // Try D1 + R2 first (production)
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
            const matter = require('gray-matter')
            const { normalizeImagePath } = require('/components/util/imageUtils')
            content = normalizeImagePath(matter(content).content)
          } catch (e) {}

          return res.status(200).json({
            slug: post.slug,
            title: post.title,
            content: content || '',
          })
        }
      }
    }

    // Fallback: read from local filesystem (dev mode)
    const fs = require('fs')
    const path = require('path')
    const matter = require('gray-matter')
    const { normalizeImagePath } = require('/components/util/imageUtils')
    const { isProtectedPath } = require('/lib/auth')

    const filePath = path.join(process.cwd(), decodedSlug)
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Article not found' })
    }

    if (!isProtectedPath(filePath)) {
      return res.status(403).json({ error: 'Not a protected article' })
    }

    const rawMarkdown = fs.readFileSync(filePath, 'utf-8')
    const normalizedMarkdown = normalizeImagePath(rawMarkdown)
    const parsed = matter(normalizedMarkdown)

    return res.status(200).json({
      slug: decodedSlug,
      title: path.basename(filePath),
      content: parsed.content || '',
    })
  } catch (error) {
    console.error('Protected content error:', error)
    return res.status(500).json({ error: 'Failed to fetch content' })
  }
}
