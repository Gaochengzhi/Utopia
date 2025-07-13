# Utopia 博客系统

基于 Next.js 的个人博客和摄影作品集系统。

## 核心功能

### 📝 博客系统
- 基于文件的内容管理，markdown 文件驱动
- 支持数学公式渲染 (KaTeX)
- 代码语法高亮
- 目录自动生成
- 全文搜索功能

### 📸 摄影作品集
- 分类展示摄影作品
- 响应式瀑布流布局
- 图片放大查看功能
- **智能压缩系统**：两级压缩优化带宽

## 图片压缩系统

### 系统架构
```
原始图片 (public/photography/) 
    ↓
双重压缩处理
    ├── 缩略图: 400×300px, 60%质量, WebP
    └── 全尺寸压缩: 原尺寸, 85%质量, WebP
    ↓
渐进式加载到用户端
```

### 技术特点
- **带宽优化**: 相比原图大幅减少数据传输
- **渐进式加载**: 先显示缩略图，点击查看全尺寸压缩图
- **智能缓存**: 自动检测文件更新，按需重新压缩
- **透明处理**: 用户始终看到压缩后的图片，但体验无损

### URL 结构
```bash
# 缩略图 (初始加载)
/.pic/thumb/photography/category/image.jpg

# 全尺寸压缩图 (点击查看)  
/.pic/full/photography/category/image.jpg

# 原图 (仅后台处理，不对用户提供)
/.pic/photography/category/image.jpg
```

## 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器 (端口 8888)
npm start

# 代码检查
npm run lint

# 预生成压缩图片
npm run compress-images

# 捆绑分析
npm run analyze
```

## 技术栈

- **框架**: Next.js 12.2.4 + React 18.2.0
- **样式**: Tailwind CSS + Ant Design
- **图片处理**: Sharp (压缩) + react-photo-view (查看器)
- **内容渲染**: react-markdown + 语法高亮 + KaTeX
- **静态生成**: ISR (增量静态再生)

## 文件结构

```
├── pages/
│   ├── api/
│   │   ├── images/[...path].js     # 原图服务 API
│   │   ├── thumbnails/[...path].js # 压缩图服务 API
│   │   └── search.js               # 搜索 API
│   ├── photographer/               # 摄影页面
│   └── [...slug].js               # 博客动态路由
├── components/
│   ├── photo/                     # 摄影组件
│   │   ├── Wall.js               # 照片墙 (支持压缩)
│   │   ├── Banner.js             # 轮播横幅 (支持压缩)
│   │   └── ...
│   └── ...
├── public/
│   ├── photography/              # 原始图片存储
│   └── .pic/
│       └── compressed/           # 压缩图片缓存
│           ├── thumbnails/       # 缩略图
│           └── fullsize/         # 全尺寸压缩图
├── post/                        # 博客文章 (markdown)
└── scripts/
    └── generateCompressedImages.js # 批量压缩脚本
```

## 性能优化

### 图片加载优化
1. **初始加载**: 仅加载缩略图，页面响应快速
2. **按需加载**: 点击时才加载全尺寸压缩图
3. **格式优化**: 全部转换为 WebP 格式，体积更小
4. **缓存策略**: 长期缓存 + 智能更新检测

### 渲染优化
- **SSG + ISR**: 静态生成 + 增量更新，SEO 友好
- **懒加载**: 图片延迟加载，减少初始资源消耗
- **代码分割**: 按页面分割 JavaScript 包

## 部署说明

### 压缩图片预生成 (推荐)
```bash
# 部署前运行，预生成所有压缩图片
npm run compress-images
npm run build
```

### 运行时压缩 (备选)
系统支持运行时动态压缩，首次访问时自动生成并缓存。

## 开发注意事项

### 图片上传
1. 将原始图片放入 `public/photography/` 对应分类目录
2. 系统会自动发现新图片并生成压缩版本
3. 无需手动处理图片压缩

### API 路由
- `/api/thumbnails/[...path]?type=thumbnail` - 生成缩略图
- `/api/thumbnails/[...path]?type=fullsize` - 生成全尺寸压缩图
- URL 重写规则自动处理路径映射

### 安全特性
- 路径验证，防止目录遍历攻击
- 文件类型检查，仅处理图片格式
- 参数限制，防止恶意请求

---

这个系统在保持视觉质量的同时，显著优化了网络传输效率，特别适合图片较多的摄影作品集网站。