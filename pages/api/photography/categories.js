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

function normalizeCategoryName(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
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
      SELECT c.category,
             (
               SELECT p.path
               FROM photos p
               WHERE p.category = c.category
               ORDER BY p.created_at DESC
               LIMIT 1
             ) AS first_path,
             (
               SELECT p.filename
               FROM photos p
               WHERE p.category = c.category
               ORDER BY p.created_at DESC
               LIMIT 1
             ) AS first_filename
      FROM (
        SELECT DISTINCT category
        FROM photos
        WHERE category IS NOT NULL AND TRIM(category) != ''
      ) c
      ORDER BY c.category
    `).all()

    const categories = (catRows || []).map((row, index) => {
      const categoryName = normalizeCategoryName(row.category)
      if (!categoryName) return null

      const manualCover = findManualCoverPath(categoryName)
      const fallbackKey = normalizePhotoKey(row.first_path, categoryName, row.first_filename)
      const fallbackCover = toPublicPath(fallbackKey)
      const resolvedCover = manualCover || fallbackCover || `/photography/cata/${categoryName}.jpg`

      return {
        index: index.toString(),
        title: categoryName.toLowerCase(),
        url: `/photographer/${categoryName.toLowerCase()}`,
        coverImage: resolvedCover,
        fallbackCover: fallbackCover || resolvedCover,
      }
    }).filter(Boolean)

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')

    return res.status(200).json({
      success: true,
      categories,
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return res.status(500).json({ error: 'Failed to fetch categories' })
  }
}
