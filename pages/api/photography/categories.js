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

    // For each category, check if a manual cover image exists in R2
    // If not, use the first photo in that category as the cover
    const categories = await Promise.all((catRows || []).map(async (row, index) => {
      const manualCover = `/photography/cata/${row.category}.jpg`

      // Get the first photo from this category as fallback cover
      const firstPhoto = await db.prepare(`
        SELECT path FROM photos WHERE category = ? ORDER BY created_at DESC LIMIT 1
      `).bind(row.category).first()

      const fallbackCover = firstPhoto ? '/' + firstPhoto.path : manualCover

      return {
        index: index.toString(),
        title: row.category.toLowerCase(),
        url: `/photographer/${row.category.toLowerCase()}`,
        coverImage: manualCover,
        fallbackCover: fallbackCover,
      }
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
