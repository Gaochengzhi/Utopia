import { readAllFile } from "/components/util/readAllfile"

export default async function handler(req, res) {
  try {
    const { category } = req.query
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' })
    }

    // 直接读取文件系统获取实际目录名
    const fs = require('fs')
    const path = require('path')
    
    const contentDir = path.join(process.cwd(), 'public/photography/content')
    const directories = fs.readdirSync(contentDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
    
    // 找到与category匹配的实际目录名（不区分大小写）
    const actualCategory = directories.find(dir => 
      dir.toLowerCase() === category.toLowerCase()
    )
    
    if (!actualCategory) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // 实时扫描目录获取最新图片列表
    let infoArray = await readAllFile(
      "public/photography" + "/content/" + actualCategory,
      (i) => i.replace("public", "")
    )
    
    const images = infoArray.SortedInfoArray

    // 设置缓存头，允许短时间缓存但经常检查更新
    res.setHeader('Cache-Control', 'public, max-age=1, stale-while-revalidate=10')
    
    return res.status(200).json({
      success: true,
      category: actualCategory,
      images: images
    })
    
  } catch (error) {
    console.error('Error fetching photography images:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch images',
      details: error.message 
    })
  }
}