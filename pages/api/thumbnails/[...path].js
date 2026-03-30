/**
 * Thumbnails API - serves thumbnails from R2 or local filesystem
 * 
 * In production on Cloudflare: redirects to cdn-cgi/image transform
 * In dev/preview: falls back to serving the source image directly
 * 
 * Replaces the old sharp-based on-the-fly compression
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

export default async function handler(req, res) {
  try {
    const { path: imagePath, type = 'thumbnail' } = req.query

    if (!imagePath || imagePath.length === 0) {
      return res.status(400).json({ error: 'Image path is required' })
    }

    if (!['thumbnail', 'fullsize'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type parameter' })
    }

    // Build the source image path
    // The rewrite sends:
    //   /.pic/thumb/:path* → /api/thumbnails/:path*?type=thumbnail
    //   /.pic/full/:path*  → /api/thumbnails/:path*?type=fullsize
    //
    // imagePath might be ['.pic', 'xxx.jpg'] for nested .pic paths
    // (from WaterfallCards: /.pic/thumb/.pic/xxx.jpg → /api/thumbnails/.pic/xxx.jpg)
    let cleanPath = imagePath.join('/')

    // Handle the nested .pic/ prefix from WaterfallCards
    if (cleanPath.startsWith('.pic/')) {
      cleanPath = cleanPath // keep as-is, it's already the R2 key prefix
    } else if (cleanPath.startsWith('content/')) {
      // Photography content paths
      cleanPath = 'photography/' + cleanPath
    } else if (cleanPath.startsWith('photography/')) {
      // Already has the full photography path
      cleanPath = cleanPath
    }

    // Security checks
    if (cleanPath.includes('..') || cleanPath.includes('//')) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Serve image directly from R2 (cdn-cgi/image requires Pro plan)
    // Images are pre-optimized by scripts/optimize-images.mjs
    let r2Key = cleanPath
    
    // Try R2 first
    const r2 = await getR2()
    if (r2) {
      let object = await r2.get(r2Key)
      
      // Fallback to .webp if original not found
      if (!object && !r2Key.toLowerCase().endsWith('.webp')) {
        const webpKey = r2Key.replace(/\.(jpe?g|png|gif|bmp)$/i, '.webp')
        const webpObject = await r2.get(webpKey)
        if (webpObject) {
          object = webpObject
          r2Key = webpKey
        }
      }

      if (object) {
        const contentType = getContentType(r2Key)
        res.setHeader('Content-Type', contentType)
        res.setHeader('Cache-Control', 'public, max-age=3600')
        if (object.httpEtag) res.setHeader('ETag', object.httpEtag)
        const arrayBuffer = await object.arrayBuffer()
        return res.send(Buffer.from(arrayBuffer))
      }
    }

    // Fallback: local filesystem
    try {
      const fs = require('fs')
      const path = require('path')

      // Try direct path first (for .pic/ files)
      let localPath = path.join(process.cwd(), r2Key)
      
      // If not found, try under public/ (for photography files)
      if (!fs.existsSync(localPath)) {
        localPath = path.join(process.cwd(), 'public', r2Key)
      }

      // Fallback to .webp locally
      if (!fs.existsSync(localPath) && !r2Key.toLowerCase().endsWith('.webp')) {
        const webpKey = r2Key.replace(/\.(jpe?g|png|gif|bmp)$/i, '.webp')
        let webpLocalPath = path.join(process.cwd(), webpKey)
        if (!fs.existsSync(webpLocalPath)) {
          webpLocalPath = path.join(process.cwd(), 'public', webpKey)
        }
        if (fs.existsSync(webpLocalPath)) {
          localPath = webpLocalPath
          r2Key = webpKey
        }
      }

      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ error: 'Image not found' })
      }

      const contentType = getContentType(r2Key)
      res.setHeader('Content-Type', contentType)
      res.setHeader('Cache-Control', 'public, max-age=3600')
      return res.send(fs.readFileSync(localPath))
    } catch (fsErr) {
      return res.status(404).json({ error: 'Image not found' })
    }
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