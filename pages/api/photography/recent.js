import { getDB } from '../../../lib/cfContext'
import { decodeRecentCursor, getRecentPhotosPage } from '../../../lib/data/recentPhotos'

const DEFAULT_LIMIT = 18

export default async function handler(req, res) {
  const rawLimit = Number.parseInt(req.query.limit, 10)
  const limit = Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT
  const direction = req.query.direction === 'newer' ? 'newer' : 'older'
  const cursor = req.query.cursor ? decodeRecentCursor(req.query.cursor) : null

  if (limit < 1 || limit > 24 || (req.query.cursor && !cursor)) {
    return res.status(400).json({ error: 'Invalid recent archive cursor or limit' })
  }

  try {
    const db = await getDB()
    const page = await getRecentPhotosPage(db, { cursor, direction, limit })

    // A page is cursor-addressed and immutable for the current ordering. Keep
    // it briefly at the edge while still allowing new uploads to surface fast.
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
    return res.status(200).json({ success: true, ...page })
  } catch (error) {
    console.error('Recent photography archive failed:', error)
    return res.status(500).json({ error: 'Failed to load recent photography archive' })
  }
}
