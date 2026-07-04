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

    // Build R2 key from path segments.
    // The rewrite keeps the variant in the destination:
    //   /photography/:variant(content|thumb|full|cata|banner)/:path*
    //     → /api/photography-images/:variant/:path*
    // R2 only stores content/, cata/ and banner/ — thumb/ and full/ are
    // legacy URL shapes that map back to the content/ original.
    const joinedPath = imgPath.join('/')
    const [variant, ...rest] = imgPath
    let r2Key
    if (variant === 'content' || variant === 'cata' || variant === 'banner') {
      r2Key = 'photography/' + joinedPath
    } else if (variant === 'thumb' || variant === 'full') {
      r2Key = 'photography/content/' + rest.join('/')
    } else {
      // Bare path without a variant segment (defensive fallback)
      r2Key = 'photography/content/' + joinedPath
    }

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
