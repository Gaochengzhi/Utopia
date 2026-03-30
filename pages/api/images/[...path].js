import { getR2 } from '../../../lib/cfContext'

const CONTENT_TYPE_MAP = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
}

function getContentType(filePath) {
  const ext = '.' + filePath.split('.').pop().toLowerCase()
  return CONTENT_TYPE_MAP[ext] || 'application/octet-stream'
}

export default async function handler(req, res) {
  try {
    const { path: imagePath } = req.query

    if (!imagePath || imagePath.length === 0) {
      return res.status(400).json({ error: 'Image path is required' })
    }

    // Build R2 key from path segments
    // The rewrite sends /.pic/:path* → /api/images/:path*
    let r2Key = '.pic/' + imagePath.join('/')

    // Security: block path traversal
    if (r2Key.includes('..') || r2Key.includes('//')) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Try R2 first (production)
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
        res.setHeader('Referrer-Policy', 'no-referrer')
        res.setHeader('Access-Control-Allow-Origin', '*')
        if (object.httpEtag) {
          res.setHeader('ETag', object.httpEtag)
        }
        const arrayBuffer = await object.arrayBuffer()
        return res.send(Buffer.from(arrayBuffer))
      }
    }

    // Fallback: read from local filesystem (dev mode)
    try {
      const fs = require('fs')
      const path = require('path')
      
      // Try project root first, then public/ directory
      let localPath = path.join(process.cwd(), r2Key)
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
    console.error('Error serving image:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const config = {
  api: {
    responseLimit: '10mb',
  },
}