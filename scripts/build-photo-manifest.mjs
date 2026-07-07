#!/usr/bin/env node
/**
 * build-photo-manifest.mjs
 *
 * Scans every photo in the remote D1 `photos` table, fetches each image from
 * the CDN, and records its true display dimensions (EXIF-orientation
 * corrected) plus whether it is a square print with a baked-in white matte.
 *
 * Output: lib/data/photoManifest.json — consumed by the photographer homepage
 * for aspect-ratio-true layout, the white-matte squares wall, and as a data
 * fallback when D1 is not reachable (local `next dev`).
 *
 * Read-only against production (D1 SELECT + CDN GETs). Safe to run anywhere.
 *
 * Usage: node scripts/build-photo-manifest.mjs [--concurrency 8]
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pLimit from 'p-limit'

const execFileAsync = promisify(execFile)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_FILE = path.join(ROOT, 'lib', 'data', 'photoManifest.json')
const CDN_BASE = 'https://cdn.gaochengzhi.com'

const argIdx = process.argv.indexOf('--concurrency')
const CONCURRENCY = argIdx !== -1 ? Number(process.argv[argIdx + 1]) || 8 : 8

// Mirrors lib/photoUtils.js normalizePhotoKey (that file is ESM-in-.js and
// can't be imported from a .mjs script under the current package config).
function normalizePhotoKey(rawPath, category, filename) {
  const fallback = category && filename ? `photography/content/${category}/${filename}` : null
  if (!rawPath) return fallback
  let key = String(rawPath).trim()
  if (!key) return fallback
  key = key.replace(/^https?:\/\/(?:www\.)?gaochengzhi\.com\//i, '')
  key = key.replace(/^\/+/, '')
  if (key.startsWith('photography/')) return key
  if (key.startsWith('content/')) return `photography/${key}`
  if (category) {
    if (key.includes('/')) return `photography/content/${key}`
    return `photography/content/${category}/${key}`
  }
  return fallback || key
}

async function fetchRows() {
  const { stdout } = await execFileAsync(
    'npx',
    [
      'wrangler', 'd1', 'execute', 'utopia-db', '--remote', '--json',
      '--command',
      'SELECT category, filename, path, sort_order, created_at FROM photos',
    ],
    { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 },
  )
  const parsed = JSON.parse(stdout)
  const results = parsed?.[0]?.results
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('D1 returned no photo rows')
  }
  return results
}

async function fetchImage(url, attempt = 1) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  } catch (e) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 1000 * attempt))
      return fetchImage(url, attempt + 1)
    }
    throw e
  }
}

/**
 * A photo is a "white matte" print when the border ring of the image is
 * near-uniform white (the Instagram-style baked-in frame).
 */
async function detectMatte(image) {
  const SIZE = 48
  const { data, info } = await image
    .resize(SIZE, SIZE, { fit: 'fill' })
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let min = 255
  const ring = 2 // ring thickness in resized pixels
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const onRing = x < ring || y < ring || x >= info.width - ring || y >= info.height - ring
      if (!onRing) continue
      const v = data[y * info.width + x]
      if (v < min) min = v
    }
  }
  return min >= 232
}

async function probe(row) {
  const key = normalizePhotoKey(row.path, row.category, row.filename)
  const url = CDN_BASE + encodeURI(`/${key}`)
  const buf = await fetchImage(url)
  const image = sharp(buf)
  const meta = await image.metadata()

  // EXIF orientations 5-8 rotate the raster 90°: displayed w/h are swapped.
  const swap = (meta.orientation || 1) >= 5
  const w = swap ? meta.height : meta.width
  const h = swap ? meta.width : meta.height

  const isSquare = Math.abs(w - h) / Math.max(w, h) <= 0.01
  const matte = await detectMatte(sharp(buf))

  return {
    path: `/${key}`,
    category: row.category,
    filename: row.filename,
    sort_order: row.sort_order,
    created_at: row.created_at,
    w,
    h,
    square: isSquare,
    matte,
  }
}

const rows = await fetchRows()
console.log(`D1 rows: ${rows.length} — probing via ${CDN_BASE} (concurrency ${CONCURRENCY})`)

const limit = pLimit(CONCURRENCY)
let done = 0
const failures = []

const photos = (
  await Promise.all(
    rows.map(row =>
      limit(async () => {
        try {
          const entry = await probe(row)
          done++
          if (done % 50 === 0) console.log(`  ${done}/${rows.length}`)
          return entry
        } catch (e) {
          failures.push({ row, error: e.message })
          return null
        }
      }),
    ),
  )
).filter(Boolean)

photos.sort((a, b) => a.path.localeCompare(b.path))

await mkdir(path.dirname(OUT_FILE), { recursive: true })
await writeFile(
  OUT_FILE,
  JSON.stringify({ generated: new Date().toISOString(), count: photos.length, photos }, null, 1),
)

const squares = photos.filter(p => p.square)
const mattes = squares.filter(p => p.matte)
console.log(`\nwrote ${OUT_FILE}`)
console.log(`photos: ${photos.length}, squares: ${squares.length}, square+white-matte: ${mattes.length}`)
if (failures.length) {
  console.log(`FAILURES (${failures.length}):`)
  failures.forEach(f => console.log(`  ${f.row.category}/${f.row.filename}: ${f.error}`))
  process.exitCode = 1
}
