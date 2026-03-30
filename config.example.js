// 配置文件示例 - 复制此文件为 config.local.js 并修改相应配置

const config = {
  // API 域名配置
  API_DOMAIN: process.env.NODE_ENV === 'production' 
    ? 'yourdomain.com'           // 生产环境域名
    : 'localhost:3000',          // 本地开发环境

  // 图片路径前缀（由 CDN/Cloudflare 代理处理）
  IMAGE_SERVER_URL: '/.pic/',

  // 社交媒体链接
  SOCIAL_LINKS: {
    twitter: 'https://x.com/yourusername',
    github: 'https://github.com/yourusername',
    weibo: 'https://m.weibo.cn/profile/yourweiboid',
    douban: 'https://www.douban.com/people/yourdoubanid'
  }
}

module.exports = config