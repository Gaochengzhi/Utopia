#!/usr/bin/env node
/**
 * preflight-sync-check.mjs
 *
 * Runs before upload.sh syncs anything. Compares local content counts with
 * what already exists in R2 and aborts the sync when this machine doesn't
 * appear to hold the full content set (e.g. a dev machine without
 * public/.pic or with only part of the photography library).
 *
 * Why: upload.sh is "local wins" — sync-r2 --delete removes remote-only R2
 * objects and build-content-index rebuilds the D1 photos/path_tree tables
 * from the local filesystem. Running it from an incomplete checkout would
 * silently destroy production content.
 *
 * Usage:
 *   node scripts/preflight-sync-check.mjs                  # check all scopes
 *   node scripts/preflight-sync-check.mjs --articles-only  # post/ + photography (D1 index still rebuilds photos)
 *   node scripts/preflight-sync-check.mjs --images-only    # .pic/ + photography
 *   node scripts/preflight-sync-check.mjs --force          # print comparison but never abort
 *
 * Exit codes: 0 = safe to sync, 1 = abort.
 */

import fs from 'fs'
import path from 'path'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { loadProjectEnv } from './load-env.mjs'

loadProjectEnv()

const ROOT = process.cwd()
const ARTICLES_ONLY = process.argv.includes('--articles-only')
const IMAGES_ONLY = process.argv.includes('--images-only')
const FORCE = process.argv.includes('--force')

const BUCKET = process.env.R2_BUCKET_NAME || 'utopia-images'
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i
const ARTICLE_EXT = /\.(md|mdx|txt)$/i

// scope selection mirrors what upload.sh will actually touch:
// - photography is always checked: it is synced in image mode AND re-indexed
//   into D1 (DELETE FROM photos + reinsert) in article mode.
const SCOPES = [
  {
    name: 'post',
    prefix: 'post/',
    localDir: path.join(ROOT, 'post'),
    extRegex: ARTICLE_EXT,
    enabled: !IMAGES_ONLY,
  },
  {
    name: '.pic',
    prefix: '.pic/',
    localDir: path.join(ROOT, 'public', '.pic'),
    extRegex: IMAGE_EXT,
    enabled: !ARTICLES_ONLY,
  },
  {
    name: 'photography',
    prefix: 'photography/',
    localDir: path.join(ROOT, 'public', 'photography'),
    extRegex: IMAGE_EXT,
    enabled: true,
  },
]

function countLocalFiles(dirPath, extRegex) {
  let count = 0
  if (!fs.existsSync(dirPath)) return 0
  const items = fs.readdirSync(dirPath)
  for (const item of items) {
    if (item.startsWith('.') && item !== '.pic') continue
    const fullPath = path.join(dirPath, item)
    try {
      const lstat = fs.lstatSync(fullPath)
      if (lstat.isSymbolicLink()) continue
      const stats = fs.statSync(fullPath)
      if (stats.isDirectory()) {
        count += countLocalFiles(fullPath, extRegex)
      } else if (extRegex.test(item)) {
        count++
      }
    } catch (e) {
      if (e.code === 'ENOENT') continue
      throw e
    }
  }
  return count
}

async function countRemoteObjects(s3, prefix) {
  let count = 0
  let token
  while (true) {
    const r = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: 1000,
      ContinuationToken: token,
    }))
    count += (r.Contents || []).length
    if (!r.IsTruncated) break
    token = r.NextContinuationToken
  }
  return count
}

async function main() {
  if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
    console.warn('⚠️  Preflight: R2 credentials not set — skipping safety check (sync will fail on its own).')
    return
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  })

  const problems = []
  console.log('🔎 Preflight: comparing local content with R2...')

  for (const scope of SCOPES) {
    if (!scope.enabled) continue

    const local = countLocalFiles(scope.localDir, scope.extRegex)
    let remote
    try {
      remote = await countRemoteObjects(s3, scope.prefix)
    } catch (e) {
      console.warn(`⚠️  Preflight: cannot list R2 prefix "${scope.prefix}" (${e.message}) — skipping this scope.`)
      continue
    }

    const status =
      (remote >= 20 && local === 0) ? 'MISSING LOCALLY' :
      (local < remote * 0.5) ? 'SUSPICIOUSLY INCOMPLETE' :
      'ok'

    console.log(`   ${scope.name.padEnd(12)} local=${String(local).padStart(5)}  remote=${String(remote).padStart(5)}  ${status === 'ok' ? '✅' : '🛑 ' + status}`)

    if (status !== 'ok') {
      problems.push(`"${scope.name}": local has ${local} files but R2 has ${remote} objects`)
    }
  }

  if (problems.length > 0) {
    console.error('')
    console.error('🛑 Preflight failed — this machine does not hold the full content set:')
    for (const p of problems) console.error(`   - ${p}`)
    console.error('')
    console.error('   Syncing from here would DELETE remote content (R2 --delete, D1 photos rebuild).')
    console.error('   Run the upload from the machine that holds the content, or use --force to override.')
    if (!FORCE) process.exit(1)
    console.error('   --force given: continuing anyway. You have been warned.')
  }
}

main().catch(err => {
  // A preflight infrastructure failure should not brick publishing:
  // warn and let the individual sync steps surface their own errors.
  console.warn('⚠️  Preflight check errored (continuing):', err.message)
})
