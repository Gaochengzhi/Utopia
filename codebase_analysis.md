# Utopia 代码库全局分析：数据流、冗余问题与优化方案

> **审核日期**：2026-03-31
> **审核方式**：逐文件对照源码验证，修正原分析中的过时/不准确描述
> **最后更新**：2026-03-31（完成全部 P1 + P2 优化重构）

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

**分析**：此数据流有一个重要设计——D1 只存元数据（title、slug、content_preview 前 1500 字符、content_plain 前 50KB 用于 FTS），不存全文。全文 Markdown 存在 R2 中。这避免了 D1 的 100KB/行限制。`d1-schema.sql` 明确注释了 `content_full removed: article markdown is stored in R2, not D1`。

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
getStaticProps → getPathTree(db)              [lib/data/paths.js]
              → getPaginatedPosts(db)         [lib/data/posts.js]
              → getTopLevelFolders(db)        [lib/data/paths.js]

Client fallback → /api/paths, /api/posts (若 SSG 无数据)
              → /api/auth/check-diary (认证检查)
              → 认证后再请求 /api/posts（解锁受保护内容）
```

#### 博客文章 ([...slug].js)
```
getStaticPaths → D1.posts(All slugs) + D1.path_tree(folders) → 预渲染路径
getStaticProps → D1.posts(WHERE slug=?) → 元数据
              → R2.get(slug) → 完整 Markdown → 去 frontmatter → normalizeImagePath
              → getFolderContents(db, path)   [lib/data/paths.js] (文件夹视图)

若文章 is_protected：
  Client → /api/auth/check-diary → 认证
        → /api/posts/protected/[slug] → R2 → 真实内容
```

#### 摄影首页 (photographer/index.js)
```
getStaticProps → getLatestPhotos(db, 50)   [lib/data/photos.js]
              → getPhotoCategories(db)     [lib/data/photos.js]

Client fallback → /api/photography/latest + /api/photography/categories
```

#### 摄影分类 (photographer/[slug].js)
```
getStaticPaths → D1.photos(DISTINCT category) → 分类路径
getStaticProps → getPhotoCategories(db)        [lib/data/photos.js]
              → getPhotosByCategory(db, slug)  [lib/data/photos.js]

Client fallback → /api/photography/[category]
              → /api/photography/categories
```

### 2.4 图片请求流

```
┌─ CDN 直连路径（主架构，已实现） ────────────────────────────────────┐
│                                                                    │
│  <img src="https://cdn.gaochengzhi.com/photography/content/...">  │
│  <img src="https://cdn.gaochengzhi.com/.pic/...">                 │
│        ↓                                                           │
│  Cloudflare Edge → Cache HIT → 直接返回 (0ms Worker/R2 调用)      │
│                  → Cache MISS → R2 Public Bucket → 缓存 → 返回     │
│                                                                    │
│  来源:                                                             │
│    - 摄影图片: Wall.js/cataContainer.js 使用 getCdnUrl() 生成      │
│    - 博客图片: MarkdownArticle.js img 渲染器直接 CDN_BASE + /.pic/ │
└────────────────────────────────────────────────────────────────────┘

┌─ Worker 代理路径（仅开发环境 / CDN 不可用时降级） ──────────────────┐
│                                                                    │
│  <img src="/.pic/post/xxx.webp">                                  │
│        ↓ (next.config.js rewrite，仅在 !NEXT_PUBLIC_R2_CDN_URL)   │
│  /api/images/[...path] → serveImage(r2Key)    [lib/imageProxy.js] │
│  /api/photography-images/[...path] → serveImage(r2Key)            │
│                                                                    │
│  serveImage() 统一处理:                                            │
│    CDN_URL 有值? → 301 重定向到 CDN                                │
│    → 无 CDN → R2.get() → webp 降级 → arrayBuffer → 返回           │
│    → 无 R2  → 本地文件系统 fallback (开发用)                       │
│                                                                    │
│  注: next.config.js 已优化，当 NEXT_PUBLIC_R2_CDN_URL 存在时        │
│      rewrites() 返回空数组，rewrite 规则完全不生效                  │
└────────────────────────────────────────────────────────────────────┘
```

### 2.5 搜索数据流
```
Client → /api/search?query=xxx → D1.posts_fts(FTS5 MATCH) → 格式化结果
                               → fallback: D1.posts(LIKE) → 格式化结果
```

---

## 三、数据服务层（Data Access Layer）

本次重构将所有 D1 查询逻辑统一提取到 `lib/data/` 目录，SSG 和 API 共享同一份查询逻辑：

```
lib/data/
├── paths.js    # buildTreeFromRows(), getPathTree(), getTopLevelFolders(), getFolderContents()
├── posts.js    # maskContent(), transformPostRows(), getPaginatedPosts()
└── photos.js   # getLatestPhotos(), getPhotoCategories(), getPhotosByCategory()

lib/
├── imageProxy.js  # serveImage(), getContentType(), getObjectWithRetry()
├── cdnUrl.js      # getCdnUrl(), getCdnThumbUrl(), getCdnFullUrl(), handleCdnError()
├── cfContext.js   # getCfEnv(), getDB(), getR2()
├── photoUtils.js  # normalizePhotoKey(), toPublicPath(), normalizeCategoryName()
├── auth.js        # verifyAuthCookieAsync()
└── rateLimit.js   # rate limiting utilities
```

### 消费方映射

| 共享函数 | SSG 消费方 | API 消费方 |
|---------|-----------|-----------|
| `buildTreeFromRows()` | — (内部使用) | — |
| `getPathTree()` | `index.js` | `api/paths.js` |
| `getTopLevelFolders()` | `index.js` | — |
| `getFolderContents()` | `[...slug].js` | — |
| `getPaginatedPosts()` | `index.js` | `api/posts.js` |
| `transformPostRows()` | — (内部使用) | — |
| `getLatestPhotos()` | `photographer/index.js` | `api/photography/latest.js` |
| `getPhotoCategories()` | `photographer/index.js`, `[slug].js` | `api/photography/categories.js` |
| `getPhotosByCategory()` | `photographer/[slug].js` | `api/photography/[category].js` |
| `serveImage()` | — | `api/images/[...path].js`, `api/photography-images/[...path].js` |

---

## 四、已修复问题存档

### ✅ 第一轮修复（之前完成）

1. ~~`normalizePhotoKey()` 重复定义 4 次~~ → 已提取到 `lib/photoUtils.js`
2. ~~`handleErrorPic.js` 是死代码~~ → 已删除
3. ~~`lib/imageApiUtils.js` 是过时的遗留代码~~ → 已删除
4. ~~`sync-r2-wrangler-fast.mjs` 等冗余备用脚本~~ → 已删除
5. ~~`config.local.js` 中的 `SERVER_IP`/`SERVER_PORT` 是遗留 VPS 配置~~ → 已清理
6. ~~`getStaticProps` 中 photography SSG 重复 API 逻辑~~ → 已修复
7. ~~Markdown 图片仍走 Worker 代理~~ → 已修复，CDN 直连
8. ~~`next.config.js` 的 7 条 rewrite 规则大部分已失效~~ → 已优化
9. ~~`.env` 不在 `.gitignore` 中~~ → 已确认安全

### ✅ 第二轮修复（本次完成）

#### 1. ~~首页 `index.js` 的 `getStaticProps` 仍内联大量查询逻辑~~ → **已修复**

- `buildTreeFromRows()` 提取到 `lib/data/paths.js`，`index.js` 和 `api/paths.js` 共用 `getPathTree()`
- posts 查询变换提取到 `lib/data/posts.js`，`index.js` 和 `api/posts.js` 共用 `getPaginatedPosts()`
- folders 查询提取到 `lib/data/paths.js` 的 `getTopLevelFolders()`

#### 2. ~~`photographer/[slug].js` 的 `getStaticProps` 仍直接写 D1 查询~~ → **已修复**

- 新增 `getPhotosByCategory()` 到 `lib/data/photos.js`
- `photographer/[slug].js` 和 `api/photography/[category].js` 共用同一函数
- 清理了未使用的 `normalizePhotoKey`、`toPublicPath`、`findManualCoverPath` import

#### 3. ~~API 图片代理路由之间约 100 行代码重复~~ → **已修复**

- 创建 `lib/imageProxy.js`，包含 `serveImage()`、`getContentType()`、`getObjectWithRetry()` 等公共逻辑
- `api/images/[...path].js` 从 142 行精简到 27 行
- `api/photography-images/[...path].js` 从 140 行精简到 41 行
- 唯一差异（R2 key 前缀构建）保留在各自的路由中

#### 4. ~~`[...slug].js` 中 folder 查询逻辑独立~~ → **已修复**

- `extractTitle()` 辅助函数和 JOIN 查询提取到 `lib/data/paths.js` 的 `getFolderContents()`
- `[...slug].js` 中约 40 行内联逻辑精简为 2 行调用

#### 5. ~~posts 查询变换逻辑重复~~ → **已修复**

- `maskContent()`、字段映射逻辑统一到 `lib/data/posts.js`
- SSG (`index.js`) 和 API (`api/posts.js`) 共用 `getPaginatedPosts()`

#### 6. 部署文档 → 待补充

GitHub Actions vs 本地 `deploy.sh` 的职责划分建议补充到 README 或 deploy.sh 注释中。

---

## 五、架构亮点（值得保留的设计）

1. **CDN 优先架构**：`lib/cdnUrl.js` 提供统一的 `getCdnUrl()` / `getCdnThumbUrl()` / `getCdnFullUrl()` 入口，前端组件统一通过此生成 CDN URL。`handleCdnError()` 提供优雅的降级机制。

2. **SSG + Client Fallback 模式**：所有页面都使用 `getStaticProps` 做 SSG 预渲染，同时在 `useEffect` 中检测 SSG 数据是否为空并做客户端降级 fetch。这保证了即使 D1 在构建时不可用，页面仍能工作。

3. **受保护内容的 B-Plan**：受保护文章在 SSG 阶段内容字符被替换为 `*`，客户端认证后通过 `/api/posts/protected/[slug]` 获取真实内容。既保证了 SSG 性能，又实现了访问控制。

4. **增量部署**：`upload.sh` 支持 `--incremental`（默认）、`--skip-images`、`--skip-d1` 等选项，`build-content-index.mjs` 使用 content hash 判断增量。

5. **统一数据服务层**：`lib/data/` 目录实现了完整的关注点分离，所有 D1 查询逻辑集中管理，SSG 和 API 都调用同一份逻辑，改一处即可。

6. **统一图片代理**：`lib/imageProxy.js` 集中处理 R2 读取、CDN 重定向、webp 降级、本地文件系统 fallback，两个图片 API 路由只需传入 key 构建策略。

---

## 六、CI/CD 流分析

```
GitHub Actions (deploy-cloudflare.yml)
├── CI (push/PR to main)
│   └── checkout → npm ci → build-content-index → cf:build → 验证通过
│
└── Deploy (手动触发 workflow_dispatch)
    └── checkout → npm ci → build-content-index → cf:build
        → wrangler deploy → purge cache → health check
```

**观察**：
1. CI 中 `build-content-index.mjs` 没有 R2/D1 凭证，生成的 `d1-seed.sql` 中的文件时间戳（`birthtimeMs`）在 `actions/checkout` 后会变成 checkout 时间，而非真正的创建时间。但这只用于验证脚本能否正常执行，不会上传到 D1。

2. Deploy job 执行 `wrangler deploy` 部署 Worker 代码，但**不会更新 D1 数据**（没有 `d1-seed-remote.sh` 步骤）。实际的 D1 数据更新（文章元数据、FTS 索引、摄影索引等）只在本地 `deploy.sh` → `upload.sh` → `d1-seed-remote.sh` 中完成。

3. 这意味着：**GitHub Actions 只部署代码，不部署内容**。内容发布必须通过本地 `deploy.sh`（或至少 `upload.sh`）执行。这是有意设计——内容索引构建依赖本地文件的时间戳和完整性。

---

## 七、存储分布总结

| 存储 | 内容 | 访问方式 |
|-----|------|---------|
| **D1** | posts (元数据+preview+FTS)、photos (索引)、path_tree (目录树)、pageviews | Worker API 路由查询 |
| **R2** | `post/` (完整 Markdown)、`.pic/` (博客图片)、`photography/content/` (原图)、`photography/thumb/` (缩略图)、`photography/cata/` (分类封面) | CDN 直连 (生产) 或 Worker 代理 (开发) |
| **Worker Assets** | `.open-next/assets/` (HTML/JS/CSS，不含图片) | Cloudflare Edge |
| **Edge CDN** | `cdn.gaochengzhi.com` → R2 Public Bucket | 边缘缓存 |

---

## 八、剩余改进建议

### P2 — 待完成
1. **补充部署文档**：在 `README.md` 或 `deploy.sh` 的注释中明确记录 GitHub Actions vs 本地部署的职责划分
