import { getDB } from '../../lib/cfContext'
import { getPathTree } from '../../lib/data/paths'

export default async function handler(req, res) {
  try {
    const db = await getDB()
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const tree = await getPathTree(db)

    // Path tree is nearly static — cache aggressively
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')

    res.status(200).json({
      paths: tree
    })
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch paths'
    })
  }
}