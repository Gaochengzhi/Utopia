/**
 * Cursor-paginated photography archive data.
 *
 * The cursor is based on the immutable-at-publish-time ordering tuple
 * (created_at, path), rather than an offset. New uploads can therefore appear
 * at the top without shifting a visitor's already-loaded pages.
 */
import manifest from './photoManifest.json'
import { normalizePhotoKey, toPublicPath } from '../photoUtils'

const dimsByPath = new Map(manifest.photos.map(photo => [photo.path, photo]))

function keyFor(row) {
  return normalizePhotoKey(row.path, row.category, row.filename)
}

function entryFor(row) {
  const key = keyFor(row)
  const path = toPublicPath(key)
  const dims = dimsByPath.get(path)
  return {
    p: path,
    cat: row.category || 'Archive',
    filename: row.filename || path?.split('/').pop() || 'Untitled',
    createdAt: Number(row.created_at || dims?.created_at || 0),
    w: dims?.w || null,
    h: dims?.h || null,
    cursor: cursorFor(row),
  }
}

function cursorFor(row) {
  return JSON.stringify({
    t: Number(row.created_at || 0),
    k: keyFor(row),
  })
}

export function decodeRecentCursor(value) {
  if (!value || typeof value !== 'string') return null
  try {
    const cursor = JSON.parse(value)
    if (!Number.isFinite(cursor?.t) || typeof cursor?.k !== 'string' || !cursor.k) return null
    return cursor
  } catch {
    return null
  }
}

function compareNewestFirst(a, b) {
  const timeDiff = Number(b.created_at || 0) - Number(a.created_at || 0)
  if (timeDiff) return timeDiff
  return keyFor(b).localeCompare(keyFor(a))
}

function filterAfterCursor(rows, cursor, direction) {
  if (!cursor) return rows
  return rows.filter(row => {
    const time = Number(row.created_at || 0)
    const key = keyFor(row)
    if (direction === 'newer') return time > cursor.t || (time === cursor.t && key > cursor.k)
    return time < cursor.t || (time === cursor.t && key < cursor.k)
  })
}

async function getFallbackPage({ cursor, direction, limit }) {
  const rows = manifest.photos.map(photo => ({
    category: photo.category,
    filename: photo.filename,
    path: photo.path,
    created_at: photo.created_at,
  }))
  const ordered = filterAfterCursor(rows, cursor, direction).sort(compareNewestFirst)
  const page = direction === 'newer'
    ? ordered.slice(-limit)
    : ordered.slice(0, limit)
  const resultRows = direction === 'newer' ? page : page
  return {
    photos: resultRows.map(entryFor),
    nextCursor: resultRows.length === limit ? cursorFor(resultRows[resultRows.length - 1]) : null,
    hasMore: ordered.length > resultRows.length,
  }
}

/**
 * Return one chronological page. `older` is newest-first (the normal initial
 * direction); `newer` returns the immediately preceding page, still rendered
 * newest-first, for the bounded client-side scroll window to restore.
 */
export async function getRecentPhotosPage(db, { cursor = null, direction = 'older', limit = 18 } = {}) {
  const safeDirection = direction === 'newer' ? 'newer' : 'older'
  const safeLimit = Math.min(Math.max(Number(limit) || 18, 1), 24)

  if (!db) return getFallbackPage({ cursor, direction: safeDirection, limit: safeLimit })

  // The content index writes canonical R2 paths to `photos.path`; keeping the
  // cursor tuple on real columns lets D1 use idx_photos_recent.
  const keyExpr = 'path'
  const where = []
  const values = []
  if (cursor) {
    if (safeDirection === 'newer') {
      where.push(`(created_at > ? OR (created_at = ? AND ${keyExpr} > ?))`)
    } else {
      where.push(`(created_at < ? OR (created_at = ? AND ${keyExpr} < ?))`)
    }
    values.push(cursor.t, cursor.t, cursor.k)
  }

  // Query one extra row, so the API can tell the client whether another
  // sequential page exists without a second COUNT(*) request.
  const order = safeDirection === 'newer'
    ? `created_at ASC, ${keyExpr} ASC`
    : `created_at DESC, ${keyExpr} DESC`
  const sql = `
    SELECT category, filename, path, created_at
    FROM photos
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${order}
    LIMIT ?
  `
  const { results } = await db.prepare(sql).bind(...values, safeLimit + 1).all()
  const rows = results || []
  const hasMore = rows.length > safeLimit
  const page = rows.slice(0, safeLimit)
  // The database must scan upwards for a newer page, then we put it back into
  // the same newest → oldest display order as every other page.
  const orderedPage = safeDirection === 'newer' ? page.reverse() : page
  const boundary = safeDirection === 'newer' ? orderedPage[0] : orderedPage[orderedPage.length - 1]

  return {
    photos: orderedPage.map(entryFor),
    nextCursor: boundary ? cursorFor(boundary) : null,
    hasMore,
  }
}
