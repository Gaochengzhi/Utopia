#!/usr/bin/env node
/**
 * Generate SQL to backfill posts.updated_at from local markdown mtimes.
 *
 * This script does not touch D1. Run it on a machine whose post/ mtimes are
 * known to be trustworthy, inspect the generated SQL, then execute it manually.
 */

import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const POST_DIR = path.join(ROOT, 'post')
const OUTPUT_FILE = path.join(ROOT, 'scripts', 'backfill-updated-at.sql')
const CLUSTER_LIMIT = 0.15
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

function escSQL(str) {
  return "'" + String(str).replace(/'/g, "''") + "'"
}

function scanMarkdownFiles(dirPath) {
  const results = []
  if (!fs.existsSync(dirPath)) return results

  const items = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const item of items) {
    if (item.name.startsWith('.')) continue

    const fullPath = path.join(dirPath, item.name)
    if (item.isDirectory()) {
      results.push(...scanMarkdownFiles(fullPath))
      continue
    }

    const ext = path.extname(item.name).toLowerCase()
    if (ext !== '.md' && ext !== '.mdx') continue

    const stats = fs.statSync(fullPath)
    results.push({
      slug: path.relative(ROOT, fullPath),
      updatedAt: Math.floor(stats.mtimeMs),
      updatedAtSecond: Math.floor(stats.mtimeMs / 1000),
    })
  }

  return results
}

function formatDate(ms) {
  return new Date(ms).toISOString()
}

const files = scanMarkdownFiles(POST_DIR)

if (files.length === 0) {
  console.error(`No markdown files found under ${path.relative(ROOT, POST_DIR)}`)
  process.exit(1)
}

const clusters = new Map()
for (const file of files) {
  const count = clusters.get(file.updatedAtSecond) || 0
  clusters.set(file.updatedAtSecond, count + 1)
}

const largestCluster = [...clusters.entries()]
  .map(([second, count]) => ({ second, count, ratio: count / files.length }))
  .sort((a, b) => b.count - a.count)[0]

console.log(`Scanned ${files.length} markdown files`)
console.log(
  `Largest same-second mtime cluster: ${largestCluster.count}/${files.length} ` +
  `(${(largestCluster.ratio * 100).toFixed(1)}%) at ${formatDate(largestCluster.second * 1000)}`
)

if (largestCluster.ratio > CLUSTER_LIMIT) {
  console.error(
    `Refusing to generate SQL: more than ${(CLUSTER_LIMIT * 100).toFixed(0)}% ` +
    'of files share the same mtime second.'
  )
  console.error('Run this only on a content copy whose file mtimes are trustworthy.')
  process.exit(1)
}

const sortedFiles = files.slice().sort((a, b) => a.slug.localeCompare(b.slug))
const newest = files.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

console.log('Newest local mtimes:')
for (const file of newest) {
  console.log(`  ${formatDate(file.updatedAt)}  ${file.slug}`)
}

if (DRY_RUN) {
  console.log('Dry run only; no SQL written.')
  process.exit(0)
}

const statements = [
  '-- Backfill posts.updated_at from local markdown mtimes',
  '-- Generated at ' + new Date().toISOString(),
  '-- Review before executing against D1.',
  'BEGIN TRANSACTION;',
  ...sortedFiles.map(file =>
    `UPDATE posts SET updated_at = ${file.updatedAt} WHERE slug = ${escSQL(file.slug)};`
  ),
  'COMMIT;',
  '',
]

fs.writeFileSync(OUTPUT_FILE, statements.join('\n'))
console.log(`Wrote ${sortedFiles.length} UPDATE statements to ${path.relative(ROOT, OUTPUT_FILE)}`)
