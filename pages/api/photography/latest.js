import { getDB } from '../../../lib/cfContext'

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
      path: '/' + row.path,
      title: row.filename,
      isLeaf: true,
      type: 'file',
      key: String(Math.floor(Math.random() * 9e9)),
      time: row.created_at,
    }))

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')

    return res.status(200).json({
      success: true,
      images,
    })
  } catch (error) {
    console.error('Error fetching latest photos:', error)
    return res.status(500).json({ error: 'Failed to fetch photos' })
  }
}
