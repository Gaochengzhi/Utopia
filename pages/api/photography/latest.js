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
    const db = await getDB()
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    // Get latest 50 photos
    const { results: photos } = await db.prepare(`
      SELECT * FROM photos ORDER BY created_at DESC LIMIT 50
    `).all()

    const images = (photos || []).map(row => ({
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
      images,
    })
  } catch (error) {
    console.error('Error fetching latest photos:', error)
    return res.status(500).json({ error: 'Failed to fetch photos' })
  }
}
