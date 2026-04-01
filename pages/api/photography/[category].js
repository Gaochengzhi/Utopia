import { getDB } from '../../../lib/cfContext'
import { getPhotosByCategory } from '../../../lib/data/photos'

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

    const { images, actualCategory } = await getPhotosByCategory(db, category)

    if (!images || images.length === 0) {
      return res.status(404).json({ error: 'Category not found' })
    }

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
