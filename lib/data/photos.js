/**
 * Shared data-access layer for photography queries.
 *
 * Both getStaticProps (SSG) and API route handlers call these functions
 * so the query logic lives in one place.
 */

import { normalizePhotoKey, toPublicPath, normalizeCategoryName, findManualCoverPath } from '../photoUtils'

/**
 * Fetch the latest N photos from D1 and transform them into the
 * shape the frontend expects.
 *
 * @param {D1Database} db  – bound D1 database
 * @param {number} [limit=50]
 * @returns {Promise<Array>}
 */
export async function getLatestPhotos(db, limit = 50) {
  const { results: photos } = await db.prepare(
    `SELECT * FROM photos ORDER BY created_at DESC LIMIT ?`
  ).bind(limit).all()

  return (photos || []).map(row => ({
    path: toPublicPath(normalizePhotoKey(row.path, row.category, row.filename)),
    title: row.filename,
    isLeaf: true,
    type: 'file',
    key: String(Math.floor(Math.random() * 9e9)),
    time: row.created_at,
  }))
}

/**
 * Fetch distinct photo categories with cover images.
 *
 * @param {D1Database} db
 * @returns {Promise<Array>}
 */
export async function getPhotoCategories(db) {
  const { results: catRows } = await db.prepare(`
    SELECT c.category,
           (
             SELECT p.path
             FROM photos p
             WHERE p.category = c.category
             ORDER BY p.created_at DESC
             LIMIT 1
           ) AS first_path,
           (
             SELECT p.filename
             FROM photos p
             WHERE p.category = c.category
             ORDER BY p.created_at DESC
             LIMIT 1
           ) AS first_filename
    FROM (
      SELECT DISTINCT category
      FROM photos
      WHERE category IS NOT NULL AND TRIM(category) != ''
    ) c
    ORDER BY c.category
  `).all()

  return (catRows || []).map((row, index) => {
    const categoryName = normalizeCategoryName(row.category)
    if (!categoryName) return null

    const manualCover = findManualCoverPath(categoryName)
    const fallbackKey = normalizePhotoKey(row.first_path, categoryName, row.first_filename)
    const fallbackCover = toPublicPath(fallbackKey)
    const resolvedCover = manualCover || fallbackCover || `/photography/cata/${categoryName}.jpg`

    return {
      index: index.toString(),
      title: categoryName.toLowerCase(),
      url: `/photographer/${categoryName.toLowerCase()}`,
      coverImage: resolvedCover,
      fallbackCover: fallbackCover || resolvedCover,
    }
  }).filter(Boolean)
}
