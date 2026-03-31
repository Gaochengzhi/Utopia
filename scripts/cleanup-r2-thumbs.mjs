#!/usr/bin/env node
/**
 * cleanup-r2-thumbs.mjs
 *
 * One-shot script to delete all objects under the `photography/thumb/`
 * prefix from the R2 bucket. Run with --dry-run first to preview.
 *
 * Usage:
 *   node scripts/cleanup-r2-thumbs.mjs --dry-run   # preview
 *   node scripts/cleanup-r2-thumbs.mjs             # actually delete
 */

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { loadProjectEnv } from './load-env.mjs'

loadProjectEnv()

const BUCKET      = process.env.R2_BUCKET_NAME || 'utopia-images'
const ACCOUNT_ID  = process.env.R2_ACCOUNT_ID
const ACCESS_KEY  = process.env.R2_ACCESS_KEY_ID
const SECRET_KEY  = process.env.R2_SECRET_ACCESS_KEY
const DRY_RUN     = process.argv.includes('--dry-run')
const TARGET_PREFIX = 'photography/thumb/'

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error('❌ Missing R2 credentials in .env')
  process.exit(1)
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
})

async function listAll(prefix) {
  const keys = []
  let token

  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: 1000,
      ...(token ? { ContinuationToken: token } : {}),
    }))
    for (const obj of res.Contents ?? []) keys.push(obj.Key)
    token = res.IsTruncated ? res.NextContinuationToken : null
  } while (token)

  return keys
}

async function deleteInBatches(keys) {
  // DeleteObjects accepts up to 1000 keys per request
  let deleted = 0
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000).map(Key => ({ Key }))
    const res = await s3.send(new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: { Objects: batch, Quiet: true },
    }))
    if (res.Errors?.length) {
      for (const e of res.Errors) console.error(`  ❌ ${e.Key}: ${e.Message}`)
    }
    deleted += batch.length - (res.Errors?.length ?? 0)
    console.log(`  🗑️  Deleted ${deleted}/${keys.length}...`)
  }
  return deleted
}

async function main() {
  console.log(`\n🔍 Listing objects under: ${TARGET_PREFIX}`)
  const keys = await listAll(TARGET_PREFIX)
  console.log(`   Found ${keys.length} objects`)

  if (keys.length === 0) {
    console.log('✅ Nothing to delete.')
    return
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — would delete:')
    keys.slice(0, 20).forEach(k => console.log(`   ${k}`))
    if (keys.length > 20) console.log(`   ... and ${keys.length - 20} more`)
    console.log(`\n   Total: ${keys.length} objects — run without --dry-run to delete.`)
    return
  }

  console.log(`\n🗑️  Deleting ${keys.length} objects from R2...`)
  const deleted = await deleteInBatches(keys)
  console.log(`\n✅ Done! Deleted ${deleted} objects from ${TARGET_PREFIX}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
