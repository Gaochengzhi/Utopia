import { getDB } from '../../../lib/cfContext'

export default async function handler(req, res) {
  try {
    const db = await getDB()
    if (!db) {
      return res.status(503).json({ error: 'Database not available' })
    }

    const { results: catRows } = await db.prepare(`
      SELECT DISTINCT category FROM photos ORDER BY category
    `).all()

    const categories = (catRows || []).map((row, index) => ({
      index: index.toString(),
      title: row.category.toLowerCase(),
      url: `/photographer/${row.category.toLowerCase()}`,
      coverImage: `/photography/cata/${row.category}.jpg`,
    }))

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')

    return res.status(200).json({
      success: true,
      categories,
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return res.status(500).json({ error: 'Failed to fetch categories' })
  }
}
