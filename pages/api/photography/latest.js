import { getDB } from '../../../lib/cfContext'
import { getLatestPhotos } from '../../../lib/data/photos'

export default async function handler(req, res) {
  try {
    const db = await getDB()
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const images = await getLatestPhotos(db, 50)

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
