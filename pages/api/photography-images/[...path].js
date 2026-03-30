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

/**
 * Serves photography images from R2 (production) or local filesystem (dev).
 * Rewrite: /photography/content/:path* → /api/photography-images/:path*
 */
export default async function handler(req, res) {
  try {
    const { path: imgPath } = req.query

    if (!imgPath || imgPath.length === 0) {
      return res.status(400).json({ error: 'Path is required' })
    }

    // Build R2 key from path segments
    // Rewrite sends:
    //   /photography/content/:path* → /api/photography-images/:path*
    //   /photography/cata/:path* → /api/photography-images/cata/:path*
    const joinedPath = imgPath.join('/')
    let r2Key
    if (joinedPath.startsWith('cata/')) {
      r2Key = 'photography/' + joinedPath
    } else {
      r2Key = 'photography/content/' + joinedPath
    }

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
        res.setHeader('Cache-Control', 'public, max-age=86400')
        res.setHeader('Access-Control-Allow-Origin', '*')
        if (object.httpEtag) res.setHeader('ETag', object.httpEtag)
        const arrayBuffer = await object.arrayBuffer()
        return res.send(Buffer.from(arrayBuffer))
      }
    }

    // Fallback: local filesystem (dev mode)
    try {
      const fs = require('fs')
      // Try local filesystem fallback
      let localPath = path.join(process.cwd(), 'public', r2Key)

      // Fallback to .webp
      if (!fs.existsSync(localPath) && !r2Key.toLowerCase().endsWith('.webp')) {
        const webpKey = r2Key.replace(/\.(jpe?g|png|gif|bmp)$/i, '.webp')
        const webpLocalPath = path.join(process.cwd(), 'public', webpKey)
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
    console.error('Error serving photography image:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const config = {
  api: { responseLimit: '10mb' },
}
