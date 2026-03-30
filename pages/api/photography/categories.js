import { getDB } from '../../../lib/cfContext'

function normalizePhotoKey(rawPath, category, filename) {
  const fallback = category && filename ? `photography/content/${category}/${filename}` : null
  if (!rawPath) return fallback

  let key = String(rawPath).trim()
  if (!key) return fallback

  key = key.replace(/^https?:\/\/(?:www\.)?gaochengzhi\.com\//i, '')
  key = key.replace(/^\/+/, '')

  if (key.startsWith('photography/')) return key
  if (key.startsWith('content/')) return `photography/${key}`
  if (key.startsWith('.pic/')) return key
  if (key.startsWith('api/images/')) return `.pic/${key.slice('api/images/'.length)}`

  if (category) {
    if (key.includes('/')) return `photography/content/${key}`
    return `photography/content/${category}/${key}`
  }

  return fallback || key
}

function toPublicPath(key) {
  if (!key) return null
  return `/${String(key).replace(/^\/+/, '')}`
}

function findManualCoverPath(category) {
  try {
    const fs = require('fs')
    const path = require('path')
    const base = path.join(process.cwd(), 'public', 'photography', 'cata')
    const exts = ['jpg', 'jpeg', 'webp', 'png']

    for (const ext of exts) {
      const filePath = path.join(base, `${category}.${ext}`)
      if (fs.existsSync(filePath)) {
        return `/photography/cata/${category}.${ext}`
      }
    }
  } catch (e) {}

  return null
}

export default async function handler(req, res) {
  try {
    const db = await getDB()
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const { results: catRows } = await db.prepare(`
      SELECT DISTINCT category FROM photos ORDER BY category
    `).all()

    const categories = await Promise.all((catRows || []).map(async (row, index) => {
      const manualCover = findManualCoverPath(row.category)

      const firstPhoto = await db.prepare(`
        SELECT path, filename FROM photos WHERE category = ? ORDER BY created_at DESC LIMIT 1
      `).bind(row.category).first()

      const fallbackKey = normalizePhotoKey(firstPhoto?.path, row.category, firstPhoto?.filename)
      const fallbackCover = toPublicPath(fallbackKey)
      const resolvedCover = manualCover || fallbackCover || `/photography/cata/${row.category}.jpg`

      return {
        index: index.toString(),
        title: row.category.toLowerCase(),
        url: `/photographer/${row.category.toLowerCase()}`,
        coverImage: resolvedCover,
        fallbackCover: fallbackCover || resolvedCover,
      }
    }))

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')

    return res.status(200).json({
      success: true,
      categories,
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return res.status(500).json({ error: 'Failed to fetch categories' })
  }
}
