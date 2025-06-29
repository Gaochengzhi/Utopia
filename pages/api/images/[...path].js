import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  try {
    const { path: imagePath } = req.query
    
    if (!imagePath || imagePath.length === 0) {
      return res.status(400).json({ error: 'Image path is required' })
    }

    // 构建完整的文件路径
    const fullPath = path.join(process.cwd(), 'public', '.pic', ...imagePath)
    
    // 安全检查：确保路径在允许的目录内
    const publicPicDir = path.join(process.cwd(), 'public', '.pic')
    if (!fullPath.startsWith(publicPicDir)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Image not found' })
    }
    
    // 检查是否是文件而不是目录
    const stat = fs.statSync(fullPath)
    if (!stat.isFile()) {
      return res.status(404).json({ error: 'Not a file' })
    }
    
    // 获取文件扩展名并设置正确的Content-Type
    const ext = path.extname(fullPath).toLowerCase()
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg', 
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.ico': 'image/x-icon'
    }
    
    const contentType = contentTypeMap[ext] || 'application/octet-stream'
    
    // 设置响应头
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400') // 24小时缓存
    res.setHeader('Last-Modified', stat.mtime.toUTCString())
    
    // 支持条件请求（304 Not Modified）
    const ifModifiedSince = req.headers['if-modified-since']
    if (ifModifiedSince && new Date(ifModifiedSince) >= stat.mtime) {
      return res.status(304).end()
    }
    
    // 读取并发送文件
    const imageBuffer = fs.readFileSync(fullPath)
    res.send(imageBuffer)
    
  } catch (error) {
    console.error('Error serving image:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// 配置API路由
export const config = {
  api: {
    responseLimit: '10mb', // 允许大图片
  },
}