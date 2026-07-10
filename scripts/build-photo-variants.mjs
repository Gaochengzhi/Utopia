#!/usr/bin/env node

import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import pLimit from 'p-limit'
import sharp from 'sharp'
import { loadProjectEnv } from './load-env.mjs'

loadProjectEnv(process.cwd())

const VARIANTS = {
  thumb: { prefix: 'thumb-v3', size: 480, quality: 70 },
  preview: { prefix: 'preview-v3', size: 960, quality: 78 },
}
const BUCKET = process.env.R2_BUCKET_NAME || 'utopia-images'
const DRY_RUN = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')
const MOVE_MANIFEST_PATH = path.join(process.cwd(), 'scripts', '.photo-moves.json')
const variantArg = valueAfter('--variant') || 'all'
const limitArg = Number(valueAfter('--limit') || 0)
const selectedVariants = variantArg === 'all' ? Object.keys(VARIANTS) : [variantArg]

function valueAfter(flag) {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] : null
}

function requireConfig() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY')
  }
  return { accountId, accessKeyId, secretAccessKey }
}

function variantKey(sourceKey, variant) {
  return sourceKey.replace(/^photography\/content\//, `photography/${VARIANTS[variant].prefix}/`)
}

function loadPhotoMoves() {
  if (!fs.existsSync(MOVE_MANIFEST_PATH)) return []
  try {
    const data = JSON.parse(fs.readFileSync(MOVE_MANIFEST_PATH, 'utf8'))
    if (data?.version !== 1 || !Array.isArray(data.moves)) throw new Error('unsupported format')
    return data.moves.filter(move =>
      typeof move?.fromPath === 'string' &&
      typeof move?.toPath === 'string' &&
      move.fromPath.startsWith('photography/content/') &&
      move.toPath.startsWith('photography/content/') &&
      move.fromPath !== move.toPath
    )
  } catch (error) {
    console.warn(`Ignoring invalid photo move manifest: ${error.message}`)
    return []
  }
}

function copySource(key) {
  // S3 CopySource is bucket/key with path segments URL-encoded, not a URL.
  return `${BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`
}

async function listKeys(client, prefix) {
  const keys = new Set()
  let continuationToken
  do {
    const response = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }))
    for (const object of response.Contents || []) keys.add(object.Key)
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
  } while (continuationToken)
  return keys
}

async function readSource(client, sourceKey) {
  const response = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: sourceKey }))
  return Buffer.from(await response.Body.transformToByteArray())
}

async function main() {
  for (const variant of selectedVariants) {
    if (!VARIANTS[variant]) throw new Error(`Unknown variant: ${variant}`)
  }

  const config = requireConfig()
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
  // Source discovery must come from R2 rather than the checked-in layout
  // manifest. A photographer can add images on the content machine without
  // making a code commit; after the source sync, this finds precisely those
  // newly uploaded files and creates only their missing presentation variants.
  const sourceKeys = [...await listKeys(client, 'photography/content/')]
    .filter(key => /\.(?:jpe?g|png|gif|webp|bmp)$/i.test(key))
  const sourceKeySet = new Set(sourceKeys)
  const moves = loadPhotoMoves().filter(move => sourceKeySet.has(move.toPath))

  const existingByVariant = new Map()
  for (const variant of selectedVariants) {
    existingByVariant.set(variant, await listKeys(client, `photography/${VARIANTS[variant].prefix}/`))
  }

  let copied = 0
  let cleaned = 0
  const pendingCleanup = []
  if (!FORCE && moves.length > 0) {
    console.log(`Detected ${moves.length} photography move(s); reusing matching R2 variants...`)
    for (const move of moves) {
      for (const variant of selectedVariants) {
        const existing = existingByVariant.get(variant)
        const fromKey = variantKey(move.fromPath, variant)
        const toKey = variantKey(move.toPath, variant)
        if (!existing.has(fromKey) || fromKey === toKey) continue

        if (existing.has(toKey)) {
          pendingCleanup.push({ variant, fromKey, toKey })
          continue
        }

        if (DRY_RUN) {
          console.log(`[DRY MOVE] ${fromKey} → ${toKey}`)
          existing.add(toKey)
          pendingCleanup.push({ variant, fromKey, toKey })
          continue
        }

        try {
          await client.send(new CopyObjectCommand({
            Bucket: BUCKET,
            Key: toKey,
            CopySource: copySource(fromKey),
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
            MetadataDirective: 'REPLACE',
          }))
          existing.add(toKey)
          copied++
          pendingCleanup.push({ variant, fromKey, toKey })
        } catch (error) {
          // Keep the old variant intact and let the normal missing-output path
          // regenerate the new one as a safe fallback.
          console.warn(`Could not move ${fromKey}; will regenerate ${toKey}: ${error.message}`)
          pendingCleanup.push({ variant, fromKey, toKey })
        }
      }
    }
  }

  let jobs = sourceKeys.flatMap(sourceKey => selectedVariants.map(variant => ({ sourceKey, variant })))
  if (!FORCE) {
    jobs = jobs.filter(job => !existingByVariant.get(job.variant).has(variantKey(job.sourceKey, job.variant)))
  }
  if (limitArg > 0) jobs = jobs.slice(0, limitArg)

  console.log(`Photography sources: ${sourceKeys.length}`)
  console.log(`Variants: ${selectedVariants.join(', ')}`)
  console.log(`Missing outputs: ${jobs.length}${FORCE ? ' (force mode)' : ''}`)
  if (DRY_RUN || jobs.length === 0) return

  const concurrency = pLimit(3)
  let completed = 0
  let failed = 0
  await Promise.all(jobs.map(job => concurrency(async () => {
    const spec = VARIANTS[job.variant]
    const targetKey = variantKey(job.sourceKey, job.variant)
    try {
      const source = await readSource(client, job.sourceKey)
      const output = await sharp(source)
        .rotate()
        .resize({
          width: spec.size,
          height: spec.size,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: spec.quality })
        .toBuffer()
      await client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: targetKey,
        Body: output,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }))
      existingByVariant.get(job.variant).add(targetKey)
    } catch (error) {
      failed++
      console.error(`Failed ${targetKey}: ${error.message}`)
    } finally {
      completed++
      if (completed % 25 === 0 || completed === jobs.length) {
        console.log(`Processed ${completed}/${jobs.length} (failed: ${failed})`)
      }
    }
  })))

  if (!DRY_RUN && failed === 0) {
    for (const { variant, fromKey, toKey } of pendingCleanup) {
      if (!existingByVariant.get(variant).has(toKey)) continue
      try {
        await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fromKey }))
        cleaned++
      } catch (error) {
        failed++
        console.error(`Failed to remove old variant ${fromKey}: ${error.message}`)
      }
    }
  }

  if (!DRY_RUN && failed === 0 && moves.length > 0) {
    fs.unlinkSync(MOVE_MANIFEST_PATH)
  }

  if (copied > 0 || cleaned > 0) {
    console.log(`Moved variants: ${copied} copied, ${cleaned} old variants removed`)
  }

  if (failed > 0) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
