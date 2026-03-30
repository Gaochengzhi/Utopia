import { getDB } from '../../../lib/cfContext'
import { normalizePhotoKey, toPublicPath } from '../../../lib/photoUtils'

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
