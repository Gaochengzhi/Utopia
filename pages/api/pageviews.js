import { getDB } from '../../lib/cfContext'

export default async function handler(req, res) {
  const db = await getDB()
  if (!db) {
    return res.status(503).json({ error: 'Database not available' })
  }

  const { slug, type, slugs } = req.query

  if (req.method === 'GET') {
    try {
      // Get total views
      if (type === 'total') {
        const result = await db.prepare(
          'SELECT SUM(count) as total FROM pageviews'
        ).first()
        return res.status(200).json({ total: result?.total || 0 })
      }

      // Get batch views
      if (type === 'batch' && slugs) {
        const slugArray = slugs.split(',')
        const placeholders = slugArray.map(() => '?').join(',')
        const { results } = await db.prepare(
          `SELECT slug, count FROM pageviews WHERE slug IN (${placeholders})`
        ).bind(...slugArray).all()

        const resultMap = {}
        slugArray.forEach(s => { resultMap[s] = 0 })
        if (results) {
          results.forEach(row => { resultMap[row.slug] = row.count })
        }
        return res.status(200).json(resultMap)
      }

      // Get single page view count
      if (slug) {
        const result = await db.prepare(
          'SELECT count FROM pageviews WHERE slug = ?'
        ).bind(slug).first()
        return res.status(200).json({ slug, count: result?.count || 0 })
      }

      return res.status(400).json({ error: 'Missing required parameters' })
    } catch (error) {
      console.error('Pageviews GET error:', error)
      return res.status(500).json({ error: 'Failed to fetch pageviews' })
    }

  } else if (req.method === 'POST') {
    if (!slug) {
      return res.status(400).json({ error: 'Missing slug parameter' })
    }

    try {
      // Atomic upsert
      await db.prepare(`
        INSERT INTO pageviews (slug, count) VALUES (?, 1)
        ON CONFLICT(slug) DO UPDATE SET count = count + 1
      `).bind(slug).run()

      const result = await db.prepare(
        'SELECT count FROM pageviews WHERE slug = ?'
      ).bind(slug).first()

      return res.status(200).json({ slug, count: result?.count || 1 })
    } catch (error) {
      console.error('Pageviews POST error:', error)
      return res.status(500).json({ error: 'Failed to update pageviews' })
    }

  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
