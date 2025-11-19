import fs from 'fs'
import path from 'path'
import {
  validateImagePath,
  getImageContentType,
  setCacheHeaders,
  checkIfModified,
  resolveImagePath
} from '../../../lib/imageApiUtils'

export default function handler(req, res) {
  try {
    const { path: imagePath } = req.query

    if (!imagePath || imagePath.length === 0) {
      return res.status(400).json({ error: 'Image path is required' })
    }

    // Resolve image path from multiple possible locations
    const fullPath = resolveImagePath(imagePath)

    if (!fullPath) {
      return res.status(404).json({ error: 'Image not found' })
    }

    // Security check
    if (!validateImagePath(fullPath)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Check if it's a file
    const stat = fs.statSync(fullPath)
    if (!stat.isFile()) {
      return res.status(404).json({ error: 'Not a file' })
    }

    // Check if client has cached version
    if (!checkIfModified(req, stat.mtime)) {
      return res.status(304).end()
    }

    // Set response headers
    const contentType = getImageContentType(fullPath)
    res.setHeader('Content-Type', contentType)
    setCacheHeaders(res, stat.mtime, 86400) // 24 hour cache

    // Read and send file
    const imageBuffer = fs.readFileSync(fullPath)
    res.send(imageBuffer)

  } catch (error) {
    console.error('Error serving image:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// API configuration
export const config = {
  api: {
    responseLimit: '10mb',
  },
}