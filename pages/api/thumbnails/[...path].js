/**
 * Thumbnails API - serves thumbnails from R2 or local filesystem
 * 
 * In production: reads pre-optimized images from R2
 * In dev/preview: falls back to local filesystem
 */
import { getR2 } from '../../../lib/cfContext'

const CONTENT_TYPE_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

function getContentType(filePath) {
  const ext = '.' + filePath.split('.').pop().toLowerCase()
  return CONTENT_TYPE_MAP[ext] || 'application/octet-stream'
}

const CACHE_CONTROL = 'public, max-age=31536000, immutable'

const RETRY_TIMES = 2
const RETRY_DELAY_MS = 30

function dedupe(values) {
  return [...new Set(values.filter(Boolean))]
}

function withWebpFallback(key) {
  if (!key || key.toLowerCase().endsWith('.webp')) return [key]
  return [key, key.replace(/\.(jpe?g|png|gif|bmp)$/i, '.webp')]
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getObjectWithRetry(r2, key) {
  for (let attempt = 1; attempt <= RETRY_TIMES; attempt++) {
    try {
      return await r2.get(key)
    } catch (err) {
      if (attempt >= RETRY_TIMES) {
        console.warn(`[thumbnails] R2 get failed after retries: ${key}`, err?.message || err)
        return null
      }
      await sleep(RETRY_DELAY_MS * attempt)
    }
  }
  return null
}

function buildCandidateKeys(imagePath, type) {
  let cleanPath = imagePath.join('/').replace(/^\/+/, '')
  if (!cleanPath) return []

  // Blog image path from /.pic/*
  if (cleanPath.startsWith('.pic/')) {
    return [cleanPath]
  }

  // Photography path normalization
  if (cleanPath.startsWith('content/')) {
    cleanPath = `photography/${cleanPath}`
  } else if (!cleanPath.startsWith('photography/')) {
    cleanPath = `photography/${cleanPath}`
  }

  const candidates = []
  let suffix = null

  if (cleanPath.startsWith('photography/cata/')) {
    suffix = cleanPath.slice('photography/cata/'.length)
    if (type === 'thumbnail') candidates.push(`photography/thumb/cata/${suffix}`)
    candidates.push(`photography/cata/${suffix}`)
  } else if (cleanPath.startsWith('photography/thumb/cata/')) {
    suffix = cleanPath.slice('photography/thumb/cata/'.length)
    candidates.push(`photography/thumb/cata/${suffix}`)
    candidates.push(`photography/cata/${suffix}`)
  } else if (cleanPath.startsWith('photography/full/cata/')) {
    suffix = cleanPath.slice('photography/full/cata/'.length)
    candidates.push(`photography/cata/${suffix}`)
    if (type === 'thumbnail') candidates.push(`photography/thumb/cata/${suffix}`)
  } else if (cleanPath.startsWith('photography/content/')) {
    suffix = cleanPath.slice('photography/content/'.length)
    if (type === 'thumbnail') candidates.push(`photography/thumb/${suffix}`)
    candidates.push(`photography/content/${suffix}`)
    candidates.push(`photography/${suffix}`)
  } else if (cleanPath.startsWith('photography/thumb/')) {
    suffix = cleanPath.slice('photography/thumb/'.length)
    candidates.push(`photography/thumb/${suffix}`)
    candidates.push(`photography/content/${suffix}`)
    candidates.push(`photography/${suffix}`)
  } else if (cleanPath.startsWith('photography/full/')) {
    suffix = cleanPath.slice('photography/full/'.length)
    candidates.push(`photography/full/${suffix}`)
    candidates.push(`photography/content/${suffix}`)
    candidates.push(`photography/${suffix}`)
    if (type === 'thumbnail') candidates.push(`photography/thumb/${suffix}`)
  } else {
    suffix = cleanPath.slice('photography/'.length)
    if (type === 'thumbnail') candidates.push(`photography/thumb/${suffix}`)
    candidates.push(`photography/${suffix}`)
    candidates.push(`photography/content/${suffix}`)
  }

  // Backward compatibility for old keys with thumb/content/*
  if (type === 'thumbnail') {
    for (const key of [...candidates]) {
      if (key.startsWith('photography/thumb/')) {
        candidates.push(`photography/thumb/content/${key.slice('photography/thumb/'.length)}`)
      }
    }
  }

  return dedupe(candidates)
}

export default async function handler(req, res) {
  try {
    const { path: imagePath, type = 'thumbnail' } = req.query

    if (!imagePath || imagePath.length === 0) {
      return res.status(400).json({ error: 'Image path is required' })
    }

    if (!['thumbnail', 'fullsize'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type parameter' })
    }

    const candidateKeys = buildCandidateKeys(imagePath, type)
    if (candidateKeys.length === 0) {
      return res.status(400).json({ error: 'Image path is required' })
    }

    for (const key of candidateKeys) {
      if (key.includes('..') || key.includes('//')) {
        return res.status(403).json({ error: 'Access denied' })
      }
    }

    // If R2 CDN is configured, redirect to the first candidate key
    const cdnUrl = process.env.NEXT_PUBLIC_R2_CDN_URL
    if (cdnUrl) {
      res.setHeader('Cache-Control', CACHE_CONTROL)
      return res.redirect(301, `${cdnUrl}/${candidateKeys[0]}`)
    }

    // Try R2 first
    const r2 = await getR2()
    if (r2) {
      for (const key of candidateKeys) {
        for (const tryKey of withWebpFallback(key)) {
          const object = await getObjectWithRetry(r2, tryKey)
          if (!object) continue

          const contentType = getContentType(tryKey)
          res.setHeader('Content-Type', contentType)
          res.setHeader('Cache-Control', CACHE_CONTROL)
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Referrer-Policy', 'no-referrer')
          if (object.httpEtag) res.setHeader('ETag', object.httpEtag)
          const arrayBuffer = await object.arrayBuffer()
          return res.send(Buffer.from(arrayBuffer))
        }
      }
    }

    // Fallback: local filesystem
    try {
      const fs = require('fs')
      const path = require('path')

      for (const key of candidateKeys) {
        for (const tryKey of withWebpFallback(key)) {
          let localPath = path.join(process.cwd(), tryKey)
          if (!fs.existsSync(localPath)) {
            localPath = path.join(process.cwd(), 'public', tryKey)
          }
          if (!fs.existsSync(localPath)) continue

          const contentType = getContentType(tryKey)
          res.setHeader('Content-Type', contentType)
          res.setHeader('Cache-Control', CACHE_CONTROL)
          res.setHeader('Referrer-Policy', 'no-referrer')
          return res.send(fs.readFileSync(localPath))
        }
      }
    } catch (fsErr) {
      // Continue to unified 404 below
    }

    return res.status(404).json({ error: 'Image not found' })
  } catch (error) {
    console.error('Error processing thumbnail:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const config = {
  api: {
    responseLimit: '10mb',
  },
}
