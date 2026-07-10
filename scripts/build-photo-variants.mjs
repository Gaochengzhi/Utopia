#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import pLimit from 'p-limit'
import sharp from 'sharp'
import { loadProjectEnv } from './load-env.mjs'

const ROOT = process.cwd()
loadProjectEnv(ROOT)

const VARIANTS = {
  thumb: { prefix: 'thumb-v3', size: 480, quality: 70 },
  preview: { prefix: 'preview-v3', size: 960, quality: 78 },
}
const BUCKET = process.env.R2_BUCKET_NAME || 'utopia-images'
const DRY_RUN = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')
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

function toKey(publicPath) {
  return String(publicPath || '').replace(/^\/+/, '')
}

function variantKey(sourceKey, variant) {
  return sourceKey.replace(/^photography\/content\//, `photography/${VARIANTS[variant].prefix}/`)
}

function sourceCandidates(sourceKey) {
  if (/\.webp$/i.test(sourceKey)) return [sourceKey]
  return [sourceKey, sourceKey.replace(/\.(?:jpe?g|png|gif|bmp)$/i, '.webp')]
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
  for (const key of sourceCandidates(sourceKey)) {
    try {
      const response = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
      return Buffer.from(await response.Body.transformToByteArray())
    } catch (error) {
      const status = error?.$metadata?.httpStatusCode
      if (status !== 404 && error?.name !== 'NoSuchKey') throw error
    }
  }
  throw new Error(`Source not found: ${sourceKey}`)
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
  const manifestPath = path.join(ROOT, 'lib', 'data', 'photoManifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const sourceKeys = [...new Set(manifest.photos.map(photo => toKey(photo.path)))]
    .filter(key => key.startsWith('photography/content/'))

  const existingByVariant = new Map()
  for (const variant of selectedVariants) {
    existingByVariant.set(variant, await listKeys(client, `photography/${VARIANTS[variant].prefix}/`))
  }

  let jobs = sourceKeys.flatMap(sourceKey => selectedVariants.map(variant => ({ sourceKey, variant })))
  if (!FORCE) {
    jobs = jobs.filter(job => !existingByVariant.get(job.variant).has(variantKey(job.sourceKey, job.variant)))
  }
  if (limitArg > 0) jobs = jobs.slice(0, limitArg)

  console.log(`Photos: ${sourceKeys.length}`)
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

  if (failed > 0) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
