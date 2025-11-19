import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import {
  getImageContentType,
  setCacheHeaders
} from '../../../lib/imageApiUtils'

export default async function handler(req, res) {
  try {
    const { path: imagePath, type = 'thumbnail' } = req.query

    if (!imagePath || imagePath.length === 0) {
      return res.status(400).json({ error: 'Image path is required' })
    }

    // Type validation
    if (!['thumbnail', 'fullsize'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type parameter' })
    }

    // Build original image path
    let originalPath
    if (imagePath[0] === 'content') {
      originalPath = path.join(process.cwd(), 'public', 'photography', ...imagePath)
    } else {
      originalPath = path.join(process.cwd(), 'public', ...imagePath)
    }

    // Security check
    const publicDir = path.join(process.cwd(), 'public')
    if (!originalPath.startsWith(publicDir)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Check if original file exists
    if (!fs.existsSync(originalPath)) {
      return res.status(404).json({ error: 'Original image not found' })
    }

    const stat = fs.statSync(originalPath)
    if (!stat.isFile()) {
      return res.status(404).json({ error: 'Not a file' })
    }

    // Compressed image paths
    const compressedDir = path.join(process.cwd(), 'public', '.pic', 'compressed', type)
    if (!fs.existsSync(compressedDir)) {
      fs.mkdirSync(compressedDir, { recursive: true })
    }

    const relativePath = path.relative(path.join(process.cwd(), 'public'), originalPath)
    const ext = path.extname(originalPath).toLowerCase()
    const nameWithoutExt = relativePath.replace(ext, '')
    const compressedFileName = `${nameWithoutExt}.webp`
    const compressedPath = path.join(compressedDir, compressedFileName)

    // Ensure directory exists
    const compressedFileDir = path.dirname(compressedPath)
    if (!fs.existsSync(compressedFileDir)) {
      fs.mkdirSync(compressedFileDir, { recursive: true })
    }

    // Serve cached compressed image if it exists and is fresh
    if (fs.existsSync(compressedPath)) {
      const compressedStats = fs.statSync(compressedPath)
      if (compressedStats.mtime >= stat.mtime) {
        res.setHeader('Content-Type', 'image/webp')
        setCacheHeaders(res, compressedStats.mtime, 31536000) // 1 year cache

        const cachedBuffer = fs.readFileSync(compressedPath)
        return res.send(cachedBuffer)
      }
    }

    // Generate new compressed image
    try {
      let sharpInstance = sharp(originalPath)

      if (type === 'thumbnail') {
        // Thumbnail: resize to max 400x300, quality 60%
        sharpInstance = sharpInstance
          .resize(400, 300, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 60 })
      } else {
        // Fullsize: keep original dimensions, quality 85%
        sharpInstance = sharpInstance.webp({ quality: 85 })
      }

      const compressedBuffer = await sharpInstance.toBuffer()

      // Save compressed image
      fs.writeFileSync(compressedPath, compressedBuffer)

      // Serve compressed image
      res.setHeader('Content-Type', 'image/webp')
      setCacheHeaders(res, new Date(), 31536000) // 1 year cache

      res.send(compressedBuffer)

    } catch (sharpError) {
      console.error('Sharp processing error:', sharpError)

      // Fallback: serve original image
      const contentType = getImageContentType(originalPath)
      res.setHeader('Content-Type', contentType)
      setCacheHeaders(res, stat.mtime, 86400) // 24 hours

      const originalBuffer = fs.readFileSync(originalPath)
      res.send(originalBuffer)
    }

  } catch (error) {
    console.error('Error serving compressed image:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const config = {
  api: {
    responseLimit: '10mb',
  },
}