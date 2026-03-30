# Utopia 代码库全局分析：数据流、冗余问题与优化方案

## 一、整体架构总览

```
┌─────────── 本地开发 ───────────┐     ┌──────── Cloudflare 基础设施 ────────┐
│                                │     │                                     │
│  post/         Markdown 文章   │     │  D1 (SQLite)   元数据 + FTS 索引    │
│  public/.pic/  博客图片         │ ──→ │  R2 (S3)       原始内容 + 图片      │
│  public/photography/  摄影图片  │     │  Worker        Next.js SSR/API      │
│                                │     │  Edge CDN      静态资源 + R2 直连    │
└────────────────────────────────┘     └─────────────────────────────────────┘
```

---

## 二、核心数据流

### 2.1 内容发布流

```
本地 Markdown ─→ build-content-index.mjs ─→ d1-seed.sql ─→ D1
                                          ↗
本地 Markdown ─→ sync-r2.mjs ────────────→ R2(post/ 前缀)
本地图片     ─→ optimize-images.mjs ─────→ R2(.pic/ + photography/)
```

**分析**：此数据流有一个重要设计——D1 只存元数据（title、slug、content_preview 前 1500 字符、content_plain 前 50KB 用于 FTS），不存全文。全文 Markdown 存在 R2 中。这避免了 D1 的 100KB/行限制。

### 2.2 构建与部署流

```
deploy.sh (完整部署)
├── Phase 1: upload.sh (内容同步，并行)
│   ├── Task A: optimize-images.mjs → R2 (图片)
│   ├── Task B: sync-r2.mjs --dir post → R2 (文章)
│   ├── Task C: build-content-index.mjs → d1-seed.sql
│   └── 串行: d1-seed-remote.sh → D1 (分块上传 SQL)
│
├── Phase 2: cf:build (opennextjs-cloudflare → .open-next/)
├── Phase 3: wrangler deploy (Worker + Assets)
└── Phase 4: purge-cloudflare-cache.mjs (清缓存)
```

### 2.3 页面数据流

#### 首页 (index.js)
```
getStaticProps → D1.path_tree → 文件树
              → D1.posts(LIMIT 10) → 文章列表(含 content_preview, first_image)
              → D1.path_tree(folders) → 一级目录

Client fallback → /api/paths, /api/posts (若 SSG 无数据)
              → /api/auth/check-diary (认证检查)
```

#### 博客文章 ([...slug].js)
```
getStaticPaths → D1.posts(All slugs) + D1.path_tree(folders) → 预渲染路径
getStaticProps → D1.posts(WHERE slug=?) → 元数据
              → R2.get(slug) → 完整 Markdown → 去 frontmatter → normalizeImagePath

若文章 is_protected：
  Client → /api/auth/check-diary → 认证
        → /api/posts/protected/[slug] → R2 → 真实内容
```

#### 摄影首页 (photographer/index.js)
```
getStaticProps → D1.photos(LIMIT 50) → 最新照片列表
              → D1.photos(DISTINCT category) → 分类列表 + 封面

Client fallback → /api/photography/latest + /api/photography/categories
```

#### 摄影分类 (photographer/[slug].js)
```
Client → /api/photography/[category] → D1.photos(WHERE category=?) → 图片列表
```

### 2.4 图片请求流

```
┌─ CDN 直连路径（目标架构，已配置） ──────────────────────────────────┐
│                                                                    │
│  <img src="https://cdn.gaochengzhi.com/photography/thumb/...">    │
│        ↓                                                           │
│  Cloudflare Edge → Cache HIT → 直接返回 (0ms Worker/R2 调用)      │
│                  → Cache MISS → R2 Public Bucket → 缓存 → 返回     │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌─ Worker 代理路径（遗留/降级路径） ─────────────────────────────────┐
│                                                                    │
│  <img src="/.pic/post/xxx.webp">                                  │
│        ↓ (next.config.js rewrite)                                  │
│  /api/images/[...path] → CDN_URL? → 301 重定向到 CDN              │
│                        → 无 CDN → R2.get() → arrayBuffer → 返回    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 2.5 搜索数据流
```
Client → /api/search?query=xxx → D1.posts_fts(FTS5 MATCH) → 格式化结果
                               → fallback: D1.posts(LIKE) → 格式化结果
```

---

## 三、发现的冗余与问题

### 🔴 严重问题

#### 1. `normalizePhotoKey()` 重复定义 4 次
同一个函数在以下文件中几乎完全相同地重复定义：
- `pages/photographer/index.js` (L11-32)
- `pages/api/photography/categories.js` (L3-24)
- `pages/api/photography/[category].js` (L3-24)
- `pages/api/photography/latest.js` (L3-24)

**建议**：提取到 `lib/photoUtils.js`，统一导入。

#### 2. `toPublicPath()` + `normalizeCategoryName()` + `findManualCoverPath()` 同样重复
这些辅助函数在 `photographer/index.js` 和 `api/photography/categories.js` 中完全重复。

#### 3. API 图片代理路由变成纯 301 中转站
`/api/images/[...path].js`、`/api/thumbnails/[...path].js`、`/api/photography-images/[...path].js` 这三个 API 路由本质上做的事情完全一样：检查 `NEXT_PUBLIC_R2_CDN_URL` 环境变量，如果有就 301 重定向到 CDN。

- **每个请求仍然会命中 Worker**（消耗 CPU、增加延迟）
- 三个文件中 `CONTENT_TYPE_MAP`、`getContentType()`、`getObjectWithRetry()` 等辅助函数重复
- `next.config.js` 中有 7 条 rewrite 规则指向这些 API

**建议**：前端直接使用 CDN URL（`lib/cdnUrl.js` 已经提供了这个能力），完全不经过 Worker。保留 API 路由仅作开发环境降级。

#### 4. `handleErrorPic.js` 是死代码
`obseverImg()` 函数的第一行就是 `return`，后面全部是不可达代码。该文件在 `[...slug].js` 中被调用，但实际上什么都不做。

### 🟡 架构隐患

#### 5. `getStaticProps` 中直接重复 API 逻辑
`photographer/index.js` 的 `getStaticProps` 手动写 D1 查询，重复了 `api/photography/categories.js` 和 `api/photography/latest.js` 的完整逻辑。`index.js` 同理重复了 `api/posts.js` 和 `api/paths.js` 的逻辑。

这意味着**改一个查询必须改两处**。

**建议**：将共享逻辑提取到 `lib/` 下的服务层函数，SSG 和 API 均调用同一个函数。

#### 6. `lib/imageApiUtils.js` 是过时的遗留代码
该文件使用 `fs.existsSync()` 查找本地文件系统的图片——这在 Cloudflare Worker 环境下不可能工作（没有文件系统）。但它仍然被保留在项目中，未被任何文件导入。

**建议**：删除 `lib/imageApiUtils.js`。

#### 7. `config.local.js` 的 `SERVER_IP` 和 `SERVER_PORT` 是遗留配置
这些指向旧的自建 VPS（`74.48.115.131:8888`），已经不再使用。现在一切都在 Cloudflare 上。

#### 8. `sync-r2-wrangler-fast.mjs` 和 `sync-r2-wrangler.sh` 是备用冗余
主要的同步脚本是 `sync-r2.mjs`（通过 S3 API 直接上传），但还有两个备用脚本分别用 `wrangler r2 object put` 逐文件上传。这些是早期的备用方案，不再需要。

#### 9. `sync-r2-local.mjs` 未使用

#### 10. `.env` 中的敏感信息直接硬编码
R2 密钥、API Token、日记密码等全部明文保存在 `.env` 中，且该文件不在 `.gitignore` 中（`.env.example` 有，但 `.env` 本身需确认）。

### 🟢 优化建议

#### 11. 图片加载慢的根因
当前前端组件（如 `cataContainer.js`、`Wall.js`）使用 `lib/cdnUrl.js` 的辅助函数将路径转为 `https://cdn.gaochengzhi.com/...` CDN 直连 URL。但是：

a) **Photography 缩略图路径映射**：`getCdnThumbUrl()` 将 `/photography/content/X/img.webp` 映射到 `/photography/thumb/X/img.webp`。如果 R2 中不存在 `thumb/` 路径下的文件（optimize-images.mjs 会生成 thumb 但可能未同步到 R2），则需要回退到 content/ 版大图。

b) **博客图片仍走 Worker**：Markdown 中的图片路径被 `normalizeImagePath()` 转为 `/.pic/xxx.webp`。在前端渲染时，`/.pic/*` 由 `next.config.js` rewrite 到 `/api/images/*`，后者再 301 到 CDN —— 多了一次 Worker 往返。

**优化**：在 `MarkdownArticle.js` 的渲染器中，直接将 `/.pic/xxx` 前缀替换为 `CDN_BASE + /.pic/xxx`，跳过 Worker 代理。

#### 12. `next.config.js` 的 7 条 rewrite 规则大部分已失效
由于前端已经使用 `getCdnUrl()` 系列函数直接生成 CDN URL，这些 rewrite 规则只在极少数遗留路径中被触发。可以考虑精简。

---

## 四、CI/CD 流分析

```
GitHub Actions (deploy-cloudflare.yml)
├── CI (push/PR to main)
│   └── checkout → npm ci → build-content-index → cf:build → 验证通过
│
└── Deploy (手动触发 workflow_dispatch)
    └── checkout → npm ci → build-content-index → cf:build → wrangler deploy → purge cache → health check
```

**问题**：
1. CI 中的 `build-content-index.mjs` 没有 R2/D1 凭证，生成的 seed.sql 中的文件时间戳（`birthtimeMs`）在 GitHub Actions 的 `actions/checkout` 后会变成 checkout 时间，而非真正的创建时间。这导致 CI 生成的 SQL 数据与本地不一致。
2. Deploy job 同样会重新生成 `d1-seed.sql` 但不上传到 D1（没有 `d1:seed` 步骤）。实际的 D1 更新只在本地 `deploy.sh` 中完成。

**建议**：CI 仅做构建验证（当前行为合理），但应在文档中明确：**生产数据只能通过本地 `deploy.sh` 推送**。

---

## 五、存储分布总结

| 存储 | 内容 | 访问方式 |
|-----|------|---------|
| **D1** | posts (元数据+preview+FTS)、photos (索引)、path_tree (目录树)、pageviews | Worker API 路由查询 |
| **R2** | `post/` (完整 Markdown)、`.pic/` (博客图片)、`photography/content/` (原图)、`photography/thumb/` (缩略图)、`photography/cata/` (分类封面) | CDN 直连 或 Worker 代理 |
| **Worker Assets** | `.open-next/assets/` (HTML/JS/CSS，不含图片) | Cloudflare Edge |
| **Edge CDN** | `cdn.gaochengzhi.com` → R2 Public Bucket | 边缘缓存，1年 TTL |

---

## 六、优先级排序的改进建议

### P0 — 立即修复
1. 删除 `handleErrorPic.js` 中的 `return` 行，或完全移除该文件及其调用
2. 提取 `normalizePhotoKey` 等重复函数到 `lib/photoUtils.js`

### P1 — 近期优化
3. Markdown 图片 CDN 直连：在 `MarkdownArticle.js` 中替换 `/.pic/` 前缀为 CDN URL
4. 删除不再需要的文件：`lib/imageApiUtils.js`、`sync-r2-wrangler-fast.mjs`、`sync-r2-wrangler.sh`、`sync-r2-local.mjs`
5. 提取 SSG 与 API 共享逻辑到 `lib/data/` 服务层

### P2 — 长期改进
6. 精简 `next.config.js` rewrite 规则，只保留开发环境降级
7. 清理 `config.local.js` 中的遗留 VPS 配置
8. 确保 `.env` 在 `.gitignore` 中
