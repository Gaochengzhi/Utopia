import { serveImage } from '../../../lib/imageProxy'

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
    //   /photography/cata/:path*    → /api/photography-images/cata/:path*
    const joinedPath = imgPath.join('/')
    const r2Key = joinedPath.startsWith('cata/')
      ? 'photography/' + joinedPath
      : 'photography/content/' + joinedPath

    const nodePath = require('path')
    await serveImage(req, res, r2Key, {
      logPrefix: 'photography-images',
      localSearchPaths: [
        nodePath.join(process.cwd(), 'public'),
      ],
    })
  } catch (error) {
    console.error('Error serving photography image:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const config = {
  api: { responseLimit: '10mb' },
}
