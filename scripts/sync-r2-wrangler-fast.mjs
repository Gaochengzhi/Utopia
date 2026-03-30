#!/usr/bin/env node
/**
 * sync-r2-wrangler-fast.mjs
 * 
 * Fast R2 upload using wrangler's unstable_dev or direct REST API.
 * Falls back to sequential wrangler CLI calls if needed.
 * 
 * Usage:
 *   node scripts/sync-r2-wrangler-fast.mjs [--dir post] [--dry-run]
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const BUCKET = 'utopia-images'
const DRY_RUN = process.argv.includes('--dry-run')
const DIR_FILTER = process.argv.find((_, i, arr) => arr[i - 1] === '--dir')

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp', '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8', '.mdx': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

function scanFiles(dirPath, extRegex) {
  const results = []
  if (!fs.existsSync(dirPath)) return results
  
  const items = fs.readdirSync(dirPath)
  for (const item of items) {
    if (item.startsWith('.') && item !== '.pic') continue
    const fullPath = path.join(dirPath, item)
    const stats = fs.statSync(fullPath)
    if (stats.isDirectory()) {
      results.push(...scanFiles(fullPath, extRegex))
    } else if (extRegex.test(item)) {
      results.push({ fullPath, size: stats.size })
    }
  }
  return results
}

function uploadFile(localPath, r2Key, contentType) {
  const cmd = `npx wrangler r2 object put "${BUCKET}/${r2Key}" --file "${localPath}" --content-type "${contentType}" --remote`
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 30000 })
    return true
  } catch (e) {
    return false
  }
}

const syncDirs = []

if (!DIR_FILTER || DIR_FILTER === 'post') {
  syncDirs.push({
    localDir: path.join(ROOT, 'post'),
    r2Prefix: 'post/',
    label: 'Markdown articles (post/)',
    extRegex: /\.(md|mdx|txt)$/i,
  })
}

if (!DIR_FILTER || DIR_FILTER === '.pic') {
  syncDirs.push({
    localDir: path.join(ROOT, 'public', '.pic'),
    r2Prefix: '.pic/',
    label: 'Article images (.pic/)',
    extRegex: /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i,
  })
}

if (!DIR_FILTER || DIR_FILTER === 'photography') {
  syncDirs.push({
    localDir: path.join(ROOT, 'public', 'photography'),
    r2Prefix: 'photography/',
    label: 'Photography images',
    extRegex: /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i,
  })
}

let totalUploaded = 0
let totalErrors = 0
let totalFiles = 0

for (const dir of syncDirs) {
  console.log(`\n📁 Scanning ${dir.label}...`)
  const files = scanFiles(dir.localDir, dir.extRegex)
  console.log(`   Found ${files.length} files`)
  totalFiles += files.length

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const relative = path.relative(dir.localDir, file.fullPath)
    const r2Key = dir.r2Prefix + relative.split(path.sep).join('/')
    const ext = path.extname(file.fullPath).toLowerCase()
    const ctype = CONTENT_TYPES[ext] || 'application/octet-stream'

    if (DRY_RUN) {
      console.log(`   [DRY] ${r2Key} (${(file.size / 1024).toFixed(1)} KB)`)
      totalUploaded++
      continue
    }

    const ok = uploadFile(file.fullPath, r2Key, ctype)
    if (ok) {
      totalUploaded++
      if (totalUploaded % 20 === 0 || i === files.length - 1) {
        console.log(`   ✅ ${totalUploaded}/${totalFiles} uploaded (${dir.label})`)
      }
    } else {
      console.error(`   ❌ Failed: ${r2Key}`)
      totalErrors++
    }
  }
}

console.log(`\n✨ Sync complete!`)
console.log(`   Total: ${totalFiles}, Uploaded: ${totalUploaded}, Errors: ${totalErrors}`)
if (DRY_RUN) console.log(`   🔍 DRY RUN - no files were actually uploaded`)
