/**
 * Shared image proxy logic for API routes that serve images from R2 / local FS.
 *
 * Used by:
 *   - /api/images/[...path]           (blog images, prefix: .pic/)
 *   - /api/photography-images/[...path] (photography images, prefix: photography/)
 */

import { getR2 } from './cfContext'

export const CONTENT_TYPE_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
}

export const CACHE_CONTROL = 'public, max-age=31536000, immutable'
const RETRY_TIMES = 2
const RETRY_DELAY_MS = 30

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Detect content type from file extension.
 *
 * @param {string} filePath
 * @returns {string}
 */
export function getContentType(filePath) {
  const ext = '.' + filePath.split('.').pop().toLowerCase()
  return CONTENT_TYPE_MAP[ext] || 'application/octet-stream'
}

/**
 * Attempt to fetch an R2 object with retries.
 *
 * @param {R2Bucket} r2
 * @param {string} key
 * @param {string} [logPrefix='imageProxy']
 * @returns {Promise<R2Object|null>}
 */
export async function getObjectWithRetry(r2, key, logPrefix = 'imageProxy') {
  for (let attempt = 1; attempt <= RETRY_TIMES; attempt++) {
    try {
      return await r2.get(key)
    } catch (err) {
      if (attempt >= RETRY_TIMES) {
        console.warn(`[${logPrefix}] R2 get failed after retries: ${key}`, err?.message || err)
        return null
      }
      await sleep(RETRY_DELAY_MS * attempt)
    }
  }
  return null
}

/**
 * Main handler: serve an image by its R2 key.
 *
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 * @param {string} r2Key – the R2 object key to serve
 * @param {Object} [options]
 * @param {string} [options.logPrefix] – prefix for log messages
 * @param {string[]} [options.localSearchPaths] – ordered list of local root dirs to search (dev fallback)
 */
export async function serveImage(req, res, r2Key, { logPrefix = 'imageProxy', localSearchPaths } = {}) {
  // Security: block path traversal
  if (r2Key.includes('..') || r2Key.includes('//')) {
    return res.status(403).json({ error: 'Access denied' })
  }

  // If R2 CDN is configured, redirect instead of proxying
  const cdnUrl = process.env.NEXT_PUBLIC_R2_CDN_URL
  if (cdnUrl) {
    res.setHeader('Cache-Control', CACHE_CONTROL)
    return res.redirect(301, `${cdnUrl}/${r2Key}`)
  }

  // Try R2 first (production)
  const r2 = await getR2()
  let currentKey = r2Key

  if (r2) {
    let object = await getObjectWithRetry(r2, currentKey, logPrefix)

    // Fallback to .webp if original not found
    if (!object && !currentKey.toLowerCase().endsWith('.webp')) {
      const webpKey = currentKey.replace(/\.(jpe?g|png|gif|bmp)$/i, '.webp')
      const webpObject = await getObjectWithRetry(r2, webpKey, logPrefix)
      if (webpObject) {
        object = webpObject
        currentKey = webpKey
      }
    }

    if (object) {
      const contentType = getContentType(currentKey)
      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', CACHE_CONTROL)
      res.setHeader('Referrer-Policy', 'no-referrer')
      res.setHeader('Access-Control-Allow-Origin', '*')
      if (object.httpEtag) {
        res.setHeader('ETag', object.httpEtag)
      }
      const arrayBuffer = await object.arrayBuffer()
      return res.send(Buffer.from(arrayBuffer))
    }
  }

  // Fallback: local filesystem (dev mode)
  const searchRoots = localSearchPaths || [
    process.cwd(),
    require('path').join(process.cwd(), 'public'),
  ]

  try {
    const fs = require('fs')
    const nodePath = require('path')

    let localPath = null

    // Search through all roots for the file
    for (const root of searchRoots) {
      const candidate = nodePath.join(root, currentKey)
      if (fs.existsSync(candidate)) {
        localPath = candidate
        break
      }
    }

    // Fallback to .webp locally
    if (!localPath && !currentKey.toLowerCase().endsWith('.webp')) {
      const webpKey = currentKey.replace(/\.(jpe?g|png|gif|bmp)$/i, '.webp')
      for (const root of searchRoots) {
        const candidate = nodePath.join(root, webpKey)
        if (fs.existsSync(candidate)) {
          localPath = candidate
          currentKey = webpKey
          break
        }
      }
    }

    if (!localPath) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const contentType = getContentType(currentKey)
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', CACHE_CONTROL)
    res.setHeader('Referrer-Policy', 'no-referrer')
    return res.send(fs.readFileSync(localPath))
  } catch (fsErr) {
    return res.status(404).json({ error: 'Image not found' })
  }
}
