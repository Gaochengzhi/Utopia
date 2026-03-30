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

export default async function handler(req, res) {
  try {
    const { category } = req.query

    if (!category) {
      return res.status(400).json({ error: 'Category is required' })
    }

    const db = await getDB()
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    // Query photos from D1 (case-insensitive match)
    const { results } = await db.prepare(`
      SELECT * FROM photos 
      WHERE LOWER(category) = LOWER(?) 
      ORDER BY sort_order, filename
    `).bind(category).all()

    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Get the actual category name from the first result
    const actualCategory = results[0].category

    // Transform to match existing frontend contract
    // The frontend expects: { success, category, images: [{path, title, ...}] }
    const images = results.map(row => ({
      path: toPublicPath(normalizePhotoKey(row.path, row.category, row.filename)),
      title: row.filename,
      isLeaf: true,
      type: 'file',
      key: String(Math.floor(Math.random() * 9e9)),
      time: row.created_at,
    }))

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')

    return res.status(200).json({
      success: true,
      category: actualCategory,
      images,
    })
  } catch (error) {
    console.error('Error fetching photography images:', error)
    return res.status(500).json({
      error: 'Failed to fetch images',
      details: error.message,
    })
  }
}
