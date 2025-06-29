// 搜索API - 在markdown文件中搜索关键词

export default function handler(req, res) {
  const { query } = req.query
  
  // 输入验证
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Invalid search query' })
  }

  // 安全检查：过滤危险字符
  const dangerousChars = /[|&;$`\\'"<>]/g
  if (dangerousChars.test(query)) {
    return res.status(400).json({ error: 'Invalid characters in search query' })
  }

  // 限制搜索词长度
  if (query.length > 100) {
    return res.status(400).json({ error: 'Search query too long' })
  }

  // 转义特殊正则字符
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  
  const { exec } = require("child_process")
  
  // 使用更安全的grep命令，限制结果数量
  const command = `grep -ir --line-number --binary-files=without-match --max-count=50 '${escapedQuery}' './post'`
  
  exec(command, { timeout: 5000 }, (err, stdout, stderr) => {
    if (err) {
      // 如果是因为没找到匹配项
      if (err.code === 1) {
        return res.status(200).json({ results: [], total: 0 })
      }
      // 其他错误
      console.error('Search error:', err)
      return res.status(500).json({ error: 'Search failed' })
    }
    
    // 处理结果
    const lines = stdout.trim().split('\n').filter(line => line.length > 0)
    const results = lines.slice(0, 30) // 限制前端结果数量
    
    res.status(200).json({ 
      results: results,
      total: results.length,
      hasMore: lines.length > 30
    })
  })
}