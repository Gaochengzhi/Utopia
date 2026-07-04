#!/usr/bin/env node
/**
 * sync-r2.mjs
 * 
 * Syncs local files to R2 bucket using S3-compatible API.
 * Features:
 *   - Incremental: skips files that already exist with same size
 *   - --delete: removes R2 objects not present locally
 *   - Parallel uploads for speed
 * 
 * Prerequisites:
 *   npm install -D @aws-sdk/client-s3
 * 
 * Environment variables:
 *   R2_ACCOUNT_ID - Cloudflare account ID
 *   R2_ACCESS_KEY_ID - R2 API token access key  
 *   R2_SECRET_ACCESS_KEY - R2 API token secret
 *   R2_BUCKET_NAME - R2 bucket name (default: utopia-images)
 * 
 * Usage:
 *   node scripts/sync-r2.mjs                    # Full sync (all dirs)
 *   node scripts/sync-r2.mjs --dry-run          # Preview only
 *   node scripts/sync-r2.mjs --file public/.pic/example.webp  # Upload one file
 *   node scripts/sync-r2.mjs --dir post         # Sync only post/
 *   node scripts/sync-r2.mjs --dir .pic         # Sync only .pic/
 *   node scripts/sync-r2.mjs --dir photography  # Sync only photography/
 *   node scripts/sync-r2.mjs --delete           # Also delete remote files not present locally
 *   node scripts/sync-r2.mjs --delete --dry-run # Preview what would be deleted
 *   node scripts/sync-r2.mjs --delete --force-delete  # Bypass the mass-deletion safety guard
 *
 * Safety: with --delete, deletion is refused (exit code 1) when the local
 * dir is empty/missing or when it would remove more than max(50, 25%) of
 * the remote objects under a prefix — this protects against running the
 * sync on a machine that doesn't hold the full content set.
 */

import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import { loadProjectEnv } from './load-env.mjs'

loadProjectEnv()

const ROOT = process.cwd()
const BUCKET = process.env.R2_BUCKET_NAME || 'utopia-images'
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY

const DRY_RUN = process.argv.includes('--dry-run')
const DO_DELETE = process.argv.includes('--delete')
const FORCE_DELETE = process.argv.includes('--force-delete')
const DIR_FILTER = process.argv.find((_, i, arr) => arr[i - 1] === '--dir')
const FILE_FILTER = process.argv.find((_, i, arr) => arr[i - 1] === '--file')

const CONTENT_TYPE_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
  '.mdx': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return CONTENT_TYPE_MAP[ext] || 'application/octet-stream'
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/')
}

function resolveSingleFile(fileSpec) {
  if (!fileSpec) return null

  const candidates = path.isAbsolute(fileSpec)
    ? [fileSpec]
    : [
        path.join(ROOT, fileSpec),
        path.join(ROOT, 'public', fileSpec),
      ]

  const uniqueCandidates = [...new Set(candidates)]
  const matchedPath = uniqueCandidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
  if (!matchedPath) {
    throw new Error(`File not found: ${fileSpec}`)
  }

  const roots = [
    {
      localDir: path.join(ROOT, 'post'),
      r2Prefix: 'post/',
      label: 'Markdown articles (post/)',
    },
    {
      localDir: path.join(ROOT, 'public', '.pic'),
      r2Prefix: '.pic/',
      label: 'Article images (.pic/)',
    },
    {
      localDir: path.join(ROOT, 'public', 'photography'),
      r2Prefix: 'photography/',
      label: 'Photography images',
    },
  ]

  for (const root of roots) {
    const relative = path.relative(root.localDir, matchedPath)
    if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
      return {
        fullPath: matchedPath,
        size: fs.statSync(matchedPath).size,
        label: root.label,
        r2Key: root.r2Prefix + toPosixPath(relative || path.basename(matchedPath)),
      }
    }
  }

  throw new Error(`Unsupported file location for R2 sync: ${matchedPath}`)
}

function scanFiles(dirPath, extRegex) {
  const results = []
  if (!fs.existsSync(dirPath)) return results

  const items = fs.readdirSync(dirPath)
  for (const item of items) {
    if (item.startsWith('.') && item !== '.pic') continue

    const fullPath = path.join(dirPath, item)
    try {
      // Skip symlinks (e.g. public/.pic/photography -> ../photography) so the
      // same files are never uploaded twice under a second key prefix.
      const lstat = fs.lstatSync(fullPath)
      if (lstat.isSymbolicLink()) continue

      const stats = fs.statSync(fullPath)
      if (stats.isDirectory()) {
        results.push(...scanFiles(fullPath, extRegex))
      } else if (extRegex.test(item)) {
        results.push({ fullPath, size: stats.size })
      }
    } catch (e) {
      if (e.code === 'ENOENT') continue // file vanished mid-scan
      throw e
    }
  }
  return results
}

// List all objects in R2 under a given prefix
async function listRemoteObjects(s3, prefix) {
  const objects = new Map() // key -> { size }
  let continuationToken = undefined

  while (true) {
    const params = {
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: 1000,
    }
    if (continuationToken) params.ContinuationToken = continuationToken

    const response = await s3.send(new ListObjectsV2Command(params))
    
    if (response.Contents) {
      for (const obj of response.Contents) {
        objects.set(obj.Key, { size: obj.Size })
      }
    }

    if (!response.IsTruncated) break
    continuationToken = response.NextContinuationToken
  }

  return objects
}

async function uploadSingleFile(s3, fileSpec) {
  if (DO_DELETE) {
    throw new Error('--delete cannot be combined with --file')
  }

  const file = resolveSingleFile(fileSpec)
  const contentType = getContentType(file.fullPath)
  const remoteLabel = `${file.label} → ${file.r2Key}`

  let remote = null
  try {
    remote = await s3.send(new HeadObjectCommand({
      Bucket: BUCKET,
      Key: file.r2Key,
    }))
  } catch (err) {
    if (err?.$metadata?.httpStatusCode !== 404 && err?.name !== 'NotFound') {
      throw err
    }
  }

  if (remote && Number(remote.ContentLength || 0) === file.size) {
    console.log(`⏭️  Skipped unchanged file: ${remoteLabel}`)
    console.log(`\n✨ Sync complete!`)
    console.log(`   Uploaded: 0`)
    console.log(`   Skipped (unchanged): 1`)
    console.log(`   Errors: 0`)
    return
  }

  if (DRY_RUN) {
    const action = remote ? 'UPDATE' : 'NEW'
    console.log(`[DRY ${action}] ${remoteLabel} (${(file.size / 1024).toFixed(1)} KB)`)
    console.log(`\n✨ Sync complete!`)
    console.log(`   Uploaded: 1`)
    console.log(`   Skipped (unchanged): 0`)
    console.log(`   Errors: 0`)
    console.log(`   🔍 DRY RUN - no changes were made`)
    return
  }

  const body = fs.readFileSync(file.fullPath)
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: file.r2Key,
    Body: body,
    ContentType: contentType,
  }))

  console.log(`✅ Uploaded file: ${remoteLabel}`)
  console.log(`\n✨ Sync complete!`)
  console.log(`   Uploaded: 1`)
  console.log(`   Skipped (unchanged): 0`)
  console.log(`   Errors: 0`)
}

async function main() {
  if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
    console.error('❌ Missing R2 credentials. Set values in .env or .env.local:')
    console.log('   R2_ACCOUNT_ID=<your-account-id>')
    console.log('   R2_ACCESS_KEY_ID=<token-access-key>')
    console.log('   R2_SECRET_ACCESS_KEY=<token-secret>')
    console.log('\n   To create R2 API tokens:')
    console.log('   Dashboard → R2 → Manage R2 API Tokens → Create API Token')
    console.log('   Select "Object Read & Write" permission, apply to "utopia-images" bucket')
    process.exit(1)
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
  })

  if (FILE_FILTER) {
    await uploadSingleFile(s3, FILE_FILTER)
    return
  }

  // Define sync directories
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
  let totalSkipped = 0
  let totalDeleted = 0
  let totalErrors = 0

  for (const dir of syncDirs) {
    console.log(`\n📁 Scanning ${dir.label}...`)
    
    const localFiles = scanFiles(dir.localDir, dir.extRegex)
    console.log(`   Local: ${localFiles.length} files`)

    // Build local file map: r2Key -> { fullPath, size }
    const localMap = new Map()
    for (const file of localFiles) {
      const relative = path.relative(dir.localDir, file.fullPath)
      const r2Key = dir.r2Prefix + relative.split(path.sep).join('/')
      localMap.set(r2Key, file)
    }

    // List existing remote objects for dedup
    console.log(`   Listing remote objects (${dir.r2Prefix})...`)
    let remoteMap
    try {
      remoteMap = await listRemoteObjects(s3, dir.r2Prefix)
      console.log(`   Remote: ${remoteMap.size} objects`)
    } catch (e) {
      console.log(`   Remote: unable to list (${e.message}), uploading all`)
      remoteMap = new Map()
    }

    // Upload new/changed files
    let dirUploaded = 0
    let dirSkipped = 0
    
    for (const [r2Key, file] of localMap) {
      const remote = remoteMap.get(r2Key)
      
      // Skip if remote exists with same size
      if (remote && remote.size === file.size) {
        dirSkipped++
        totalSkipped++
        continue
      }

      if (DRY_RUN) {
        const action = remote ? 'UPDATE' : 'NEW'
        console.log(`   [DRY ${action}] ${r2Key} (${(file.size / 1024).toFixed(1)} KB)`)
        dirUploaded++
        totalUploaded++
        continue
      }

      try {
        const body = fs.readFileSync(file.fullPath)
        const contentType = getContentType(file.fullPath)

        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: r2Key,
          Body: body,
          ContentType: contentType,
        }))

        dirUploaded++
        totalUploaded++
        if (dirUploaded % 50 === 0) {
          console.log(`   ✅ Uploaded ${dirUploaded} files...`)
        }
      } catch (err) {
        console.error(`   ❌ Upload failed: ${r2Key}: ${err.message}`)
        totalErrors++
      }
    }

    if (dirSkipped > 0) {
      console.log(`   ⏭️  Skipped ${dirSkipped} unchanged files`)
    }
    if (dirUploaded > 0) {
      console.log(`   ✅ Uploaded ${dirUploaded} files`)
    }

    // Delete remote files not present locally (if --delete flag)
    if (DO_DELETE) {
      const deleteCandidates = [...remoteMap.keys()].filter(k => !localMap.has(k))

      // Safety guards: "local wins" deletion is catastrophic when run on a
      // machine that doesn't hold the full content set (e.g. the dev machine
      // without public/.pic). Refuse suspicious mass deletions.
      const massDeleteThreshold = Math.max(50, Math.ceil(remoteMap.size * 0.25))
      if (!FORCE_DELETE && deleteCandidates.length > 0 && localMap.size === 0) {
        console.warn(`   🛑 REFUSED to delete ${deleteCandidates.length} remote files under "${dir.r2Prefix}":`)
        console.warn(`      local directory is empty or missing (${dir.localDir}).`)
        console.warn(`      This machine probably doesn't hold this content. Use --force-delete to override.`)
        totalErrors++
        continue
      }
      if (!FORCE_DELETE && deleteCandidates.length > massDeleteThreshold) {
        console.warn(`   🛑 REFUSED to delete ${deleteCandidates.length}/${remoteMap.size} remote files under "${dir.r2Prefix}":`)
        console.warn(`      exceeds safety threshold (${massDeleteThreshold}). If intentional, re-run with --force-delete.`)
        totalErrors++
        continue
      }

      let dirDeleted = 0
      for (const [remoteKey] of remoteMap) {
        if (!localMap.has(remoteKey)) {
          if (DRY_RUN) {
            console.log(`   [DRY DELETE] ${remoteKey}`)
            dirDeleted++
            totalDeleted++
          } else {
            try {
              await s3.send(new DeleteObjectCommand({
                Bucket: BUCKET,
                Key: remoteKey,
              }))
              dirDeleted++
              totalDeleted++
            } catch (err) {
              console.error(`   ❌ Delete failed: ${remoteKey}: ${err.message}`)
              totalErrors++
            }
          }
        }
      }
      if (dirDeleted > 0) {
        console.log(`   🗑️  Deleted ${dirDeleted} remote-only files`)
      }
    }
  }

  console.log(`\n✨ Sync complete!`)
  console.log(`   Uploaded: ${totalUploaded}`)
  console.log(`   Skipped (unchanged): ${totalSkipped}`)
  if (DO_DELETE) console.log(`   Deleted: ${totalDeleted}`)
  console.log(`   Errors: ${totalErrors}`)
  if (DRY_RUN) console.log(`   🔍 DRY RUN - no changes were made`)

  if (totalErrors > 0) {
    process.exitCode = 1
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
