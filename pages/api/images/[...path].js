import { serveImage } from '../../../lib/imageProxy'

export default async function handler(req, res) {
  try {
    const { path: imagePath } = req.query

    if (!imagePath || imagePath.length === 0) {
      return res.status(400).json({ error: 'Image path is required' })
    }

    // Build R2 key: the rewrite sends /.pic/:path* → /api/images/:path*
    const r2Key = '.pic/' + imagePath.join('/')

    await serveImage(req, res, r2Key, { logPrefix: 'images' })
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
