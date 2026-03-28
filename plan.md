# Utopia 迁移 Cloudflare 详细执行计划

> 基于 refact.md v2 审计 + 全量代码复审 + 附录 B 决策确认
> 日期：2026-03-28

---

## 0. refact.md 勘误

在制定最终计划前，需要修正 refact.md 中的错误：

| #   | 问题                                                | 修正                                                                                                                                                                                                                                                                                                       |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 决策 5 选择"用 `@cloudflare/next-on-pages` 保持 12" | **不可行**。该包已废弃，且从未支持 Next.js 12。替代方案 `@opennextjs/cloudflare` 仅支持 Next.js 15+（14 支持已于 2026 Q1 移除）。**必须升级 Next.js 到 15+**                                                                                                                                               |
| 2   | `/api/paths` 返回 `{ paths: infoArray.paths }`      | 代码中 `readAllFile` 返回 `{ SortedInfoArray, InfoArray }`，`infoArray.paths` 是 `undefined`。这是**现存 bug**，前端依赖 localStorage 缓存的 `paths`（在 `index.js` getStaticProps 中正确赋值），实际很少触发 `/api/paths` 调用                                                                            |
| 3   | 搜索 API "返回 grep 格式字符串"                     | API 已返回结构化 JSON `{ results: [...], total, hasMore }`，但 results 数组元素是 grep 格式字符串 `"filepath:line:content"`                                                                                                                                                                                |
| 4   | `photographer/[slug].js` 图片路径处理               | 遗漏：首张大图使用 `config.IMAGE_SERVER_URL + 'full/'` 拼接，不只是简单替换                                                                                                                                                                                                                                |
| 5   | `fake/index.js` 描述为"纯静态"                      | 实际有 `getStaticProps` 调用 `readAllFile("public/photography")`，但返回的 `path` prop 在前端未使用（无用代码）                                                                                                                                                                                            |
| 6   | Ant Design 使用范围                                 | 缺少完整清单。实际使用：`Spin`(antd), `Divider`(antd), `Tree`(antd), `Carousel`(antd), `Input`(antd), `Modal`(antd), `Drawer`(antd) + icons: `SearchOutlined`, `CodeOutlined`, `CameraOutlined`, `BankOutlined`, `HomeFilled`, `BarsOutlined`, `FileTextOutlined`, `FolderOpenOutlined`, `CompassOutlined` |

---

## 1. 最终决策摘要

| 项目         | 决策                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------- |
| 受保护内容   | **B 档（强保护）**：受保护文章不参与静态导出，正文存 D1 加密字段或 R2 私有，前端授权后动态拉取 |
| 图片存储     | **R2**：摄影图 + 文章图全部上 R2                                                               |
| 搜索返回     | **立即升级为结构化 JSON 对象**，前后端同步改造                                                 |
| Images Paid  | **否**，保持 Free（5000 唯一变换/月）                                                          |
| Next.js 版本 | **必须升级到 15+**（`@cloudflare/next-on-pages` 已废弃，`@opennextjs/cloudflare` 仅支持 15+）  |
| Ant Design   | **移除**，用 TailwindCSS + headless 方案替代                                                   |
| 中文分词     | **不引入 jieba**，接受 FTS5 默认逐字拆分。后续搜索优化另议                                     |

---

## 2. 架构总览

```
Browser
  ├─ 静态页面/JS/CSS → Workers Static Assets（免费静态流量）
  ├─ /api/* → Worker（业务逻辑）
  │            ├─ D1（文章元数据/FTS搜索/浏览量/路径树/摄影索引）
  │            └─ R2（摄影原图/文章图片）
  └─ /cdn-cgi/image/... → Cloudflare Images Transform（缩放/压缩/格式自动）

Worker 部署方式：
  Next.js 15 + @opennextjs/cloudflare adapter
  → 保留 SSR 能力（getStaticProps + ISR 在 CF 上由 adapter 处理）
  → API routes 直接在 Worker 中运行
  → 无需 next export，无需独立 Worker 项目
```

**架构变更说明（与 refact.md 的重大差异）：**

采用 `@opennextjs/cloudflare` 后，不需要独立的 `worker/` 项目。Next.js 的 API routes 和页面渲染都在 Worker 中运行。这大幅简化了迁移：

- API routes 可以直接改为使用 D1/R2 binding，不需要搬到独立的 Worker
- `getStaticProps` + ISR 继续可用（adapter 支持）
- `fallback: true / 'blocking'` 继续可用
- middleware 继续可用

---

## 3. 完整依赖变更清单

### 3.1 需要升级的包

| 包                      | 当前版本 | 目标版本 | 说明                  |
| ----------------------- | -------- | -------- | --------------------- |
| `next`                  | 12.2.4   | 15.x     | 必须，adapter 要求    |
| `react`                 | 18.2.0   | 19.x     | Next 15 要求 React 19 |
| `react-dom`             | 18.2.0   | 19.x     | 同上                  |
| `eslint-config-next`    | 12.2.4   | 15.x     | 跟随 next             |
| `@next/bundle-analyzer` | 12.2.5   | 15.x     | 跟随 next             |

### 3.2 需要移除的包

| 包                            | 原因                                      |
| ----------------------------- | ----------------------------------------- |
| `antd` ^4.22.4                | 决策：用 TailwindCSS headless 替代        |
| `@ant-design/icons` ^4.7.0    | 同上，图标用 SVG inline 或 heroicons 替代 |
| `next-images` ^1.8.4          | Next 13+ 内置 Image 组件，不需要此包      |
| `sharp` ^0.34.3               | 图片压缩改由 Cloudflare cdn-cgi 处理      |
| `@mdx-js/loader` ^3.1.1       | 项目中未实际使用 MDX                      |
| `@next/mdx` ^16.0.5           | 同上                                      |
| `next-bundle-analyzer` ^0.6.4 | 与 `@next/bundle-analyzer` 功能重复       |

### 3.3 需要新增的包

| 包                                    | 用途                              |
| ------------------------------------- | --------------------------------- |
| `@opennextjs/cloudflare`              | Cloudflare Worker adapter         |
| `wrangler` (devDep)                   | Cloudflare CLI                    |
| `@aws-sdk/client-s3` (devDep/scripts) | R2 图片同步脚本（R2 兼容 S3 API） |

### 3.4 保留不变的包

`gray-matter`, `github-markdown-css`, `js-cookie`, `react-markdown`, `react-photo-view`,
`react-scroll-parallax`, `react-syntax-highlighter`, `rehype-katex`, `rehype-raw`,
`remark-gfm`, `remark-math`, `cross-env`, `tailwindcss`, `postcss`, `autoprefixer`, `eslint`

---

## 4. Ant Design 替换方案

### 4.1 antd 组件替换映射

| antd 组件  | 使用位置                                              | 替换方案                                                                   |
| ---------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `Spin`     | `pages/[...slug].js` (loading spinner)                | TailwindCSS 动画 div（`animate-spin`，已在 WaterfallCards 中使用类似方案） |
| `Divider`  | `components/footer.js`, `components/main/PostList.js` | `<hr>` + TailwindCSS `border-gray-200`                                     |
| `Tree`     | `components/main/FileTree.js`                         | 自定义 Tree 组件（递归渲染，用 TailwindCSS 样式）                          |
| `Carousel` | `components/photo/Banner.js`                          | 纯 CSS 轮播或轻量库如 `embla-carousel-react`                               |
| `Input`    | `components/SearchBox.js`                             | 原生 `<input>` + TailwindCSS（SearchBar.js 已经这么做了）                  |
| `Modal`    | `components/ShareLInk.js`                             | headless dialog（自定义或 `@headlessui/react`）                            |
| `Drawer`   | `components/DrawerView.js`                            | 自定义 slide panel + TailwindCSS transition                                |

### 4.2 antd icons 替换

所有 `@ant-design/icons` 替换为内联 SVG 或 [heroicons](https://heroicons.com/)：

| Icon                                             | 使用位置                                  | 替换                   |
| ------------------------------------------------ | ----------------------------------------- | ---------------------- |
| `SearchOutlined`                                 | SearchBar.js, SearchIcon.js, SearchBox.js | 内联 SVG search icon   |
| `FileTextOutlined`                               | FileTree.js, PostList.js                  | 内联 SVG document icon |
| `FolderOpenOutlined`                             | FolderList.js                             | 内联 SVG folder icon   |
| `CompassOutlined`                                | TocToggleButton.js                        | 内联 SVG compass icon  |
| `CodeOutlined`, `CameraOutlined`, `BankOutlined` | photo/Banner.js                           | 内联 SVG               |
| `HomeFilled`, `BarsOutlined`                     | photo/Pnav.js                             | 内联 SVG               |

---

## 5. D1 数据库设计

### 5.1 Schema

```sql
-- 文章表
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,           -- 'post/Writings/car.md'
  title TEXT NOT NULL,
  category TEXT,                        -- 'Writings'
  content_preview TEXT,                 -- 构建时截断前 1500 字符
  content_plain TEXT,                   -- 纯文本（FTS 索引用）
  content_full TEXT,                    -- 完整 markdown（B档受保护文章此字段为空）
  first_image TEXT,                     -- 第一张图片 URL
  is_protected BOOLEAN DEFAULT 0,
  created_at INTEGER,                   -- 文件创建时间戳 (ms)
  updated_at INTEGER,
  path TEXT NOT NULL                    -- 前端路由路径 '/<slug>'
);

-- FTS 虚拟表
CREATE VIRTUAL TABLE posts_fts USING fts5(
  title, content_plain,
  content='posts',
  content_rowid='id'
);

-- FTS 同步触发器
CREATE TRIGGER posts_ai AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(rowid, title, content_plain) VALUES (new.id, new.title, new.content_plain);
END;
CREATE TRIGGER posts_ad AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, content_plain) VALUES('delete', old.id, old.title, old.content_plain);
END;
CREATE TRIGGER posts_au AFTER UPDATE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, content_plain) VALUES('delete', old.id, old.title, old.content_plain);
  INSERT INTO posts_fts(rowid, title, content_plain) VALUES (new.id, new.title, new.content_plain);
END;

-- 浏览量表
CREATE TABLE pageviews (
  slug TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);

-- 摄影索引表
CREATE TABLE photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,               -- 'City', 'Emotion' 等
  filename TEXT NOT NULL,
  path TEXT NOT NULL,                   -- R2 key: 'photography/content/City/xxx.jpg'
  sort_order INTEGER,                   -- 排序用
  created_at INTEGER
);

-- 路径树表
CREATE TABLE path_tree (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  path TEXT NOT NULL,
  parent_path TEXT,
  is_leaf BOOLEAN,
  type TEXT,                            -- 'folder' or 'file'
  node_key TEXT,                        -- 前端 Tree 组件的 key
  created_at INTEGER
);
```

### 5.2 数据规模预估

| 表        | 预计行数 | 预计体积                                    |
| --------- | -------- | ------------------------------------------- |
| posts     | 366      | ~30-50MB（含 content_plain + content_full） |
| posts_fts | 366      | ~20-40MB                                    |
| pageviews | ~10      | < 1KB                                       |
| photos    | 653      | < 100KB                                     |
| path_tree | ~500     | < 100KB                                     |
| **合计**  |          | **~50-90MB**（D1 Free 上限 10GB，充裕）     |

---

## 6. API 迁移详细设计

### 6.1 /api/posts

**当前**：`readAllFile` fs 扫描 → `gray-matter` 解析 → 分页返回
**目标**：D1 分页查询

```javascript
// 核心查询
const posts = await env.DB.prepare(
  `
  SELECT slug, title, category, content_preview, first_image,
         is_protected, created_at, path
  FROM posts
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`,
)
  .bind(limit, (page - 1) * limit)
  .all();

// 受保护文章处理：如果未认证，对 content_preview 做 maskContent
```

**返回结构不变**：`{ posts: [...], pagination: { currentPage, totalPages, totalPosts, hasNextPage, hasPrevPage, limit } }`

### 6.2 /api/search

**当前**：`grep -ir` + `child_process.exec`
**目标**：D1 FTS5 MATCH

```javascript
// 新返回格式（结构化 JSON）
{
  results: [
    {
      slug: "post/Writings/car.md",
      title: "Car",
      snippet: "...匹配内容高亮...",
      path: "/post/Writings/car.md",
      is_protected: false
    }
  ],
  total: 15,
  hasMore: false
}
```

**前端 SearchBar.js 同步改造**：

- 不再 `item.split(":")` 解析 grep 格式
- 直接使用 `item.slug`, `item.title`, `item.snippet`, `item.path`
- `handleGoToPage` 改为直接使用 `item.path`
- 高亮逻辑用 `snippet` 中的标记或前端自行高亮

### 6.3 /api/paths

**当前**：有 bug（`infoArray.paths` 为 undefined）
**目标**：从 D1 path_tree 表查询，重建树结构返回

```javascript
// 查询所有节点
const nodes = await env.DB.prepare(
  "SELECT * FROM path_tree ORDER BY path",
).all();
// 在 Worker 中重建树结构
const tree = buildTreeFromFlatNodes(nodes.results);
return { paths: tree };
```

### 6.4 /api/photography/[category]

**当前**：`readAllFile` 扫描 `public/photography/content/{category}/`
**目标**：D1 photos 表查询

```javascript
const photos = await env.DB.prepare(
  `
  SELECT * FROM photos WHERE LOWER(category) = LOWER(?) ORDER BY sort_order
`,
)
  .bind(category)
  .all();
```

**返回结构不变**：`{ success: true, category, images: [...] }`

### 6.5 /api/pageviews

**当前**：`fs.readFileSync/writeFileSync` 读写 JSON
**目标**：D1 原子 UPSERT

```javascript
// POST: 自增
await env.DB.prepare(
  `
  INSERT INTO pageviews (slug, count) VALUES (?, 1)
  ON CONFLICT(slug) DO UPDATE SET count = count + 1
`,
)
  .bind(slug)
  .run();

// GET batch:
const placeholders = slugs.map(() => "?").join(",");
const result = await env.DB.prepare(
  `
  SELECT slug, count FROM pageviews WHERE slug IN (${placeholders})
`,
)
  .bind(...slugs)
  .all();

// GET total:
const total = await env.DB.prepare(
  "SELECT SUM(count) as total FROM pageviews",
).first();
```

### 6.6 /api/auth/check-diary + /api/auth/verify-diary

**当前安全问题**：token 无签名验证，任何人伪造 64 位 hex + 未来时间即可绕过

**目标**：Worker 环境中用 HMAC-SHA256 签名

```javascript
// verify-diary: 密码验证 + 签发 HMAC token
async function signToken(secret) {
  const payload = { exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  const data = JSON.stringify(payload);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return btoa(data) + "." + btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// check-diary: 验证 HMAC 签名
async function verifyToken(token, secret) {
  const [dataB64, sigB64] = token.split(".");
  // ... 验证签名 + 检查过期
}
```

**Secret 存储**：`wrangler secret put DIARY_PASSWORD` + `wrangler secret put HMAC_SECRET`

### 6.7 /api/images/[...path] + /api/thumbnails/[...path]

**当前**：fs 读文件 + sharp 动态压缩
**目标**：R2 代理 + cdn-cgi 重定向

```javascript
// /.pic/<path>        → R2 直接返回或 302 到 R2 自定义域名
// /.pic/thumb/<path>  → 302 到 /cdn-cgi/image/width=400,quality=60,format=auto/<R2_URL>
// /.pic/full/<path>   → 302 到 /cdn-cgi/image/quality=85,format=auto/<R2_URL>
```

**注意嵌套路径**：WaterfallCards 中 `/.pic/thumb/.pic/xxx.jpg` 需要在路由层提取出 `.pic/xxx.jpg`

---

## 7. 前端改造详细设计

### 7.1 Next.js 升级路线

```
Next.js 12.2.4 + React 18.2.0
      ↓
Next.js 15.x + React 19.x
```

**预期的 breaking changes：**

| 变更                                 | 影响                            | 处理方式                  |
| ------------------------------------ | ------------------------------- | ------------------------- |
| `next/image` 默认改为 Image 组件     | 当前用原生 `<img>` 为主，影响小 | 移除 `next-images` 包即可 |
| `next/link` 不再需要 `<a>` 子元素    | 多处 `<Link><a>...</a></Link>`  | 去掉内部 `<a>` 标签       |
| `next.config.js` → `next.config.mjs` | 配置文件格式                    | 可选迁移                  |
| React 19 新特性                      | use() hook 等                   | 不影响现有代码            |
| `antd/dist/antd.css` 全量引入        | 移除 antd 后不再需要            | 删除 import               |

### 7.2 config.local.js 替换

**当前引用位置（5处）：**

| 文件                            | 使用方式                                                      | 替换                                             |
| ------------------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| `pages/api/posts.js`            | `config.IMAGE_SERVER_URL` 做路径替换                          | 迁移到 D1 后，构建脚本中统一替换路径             |
| `pages/[...slug].js`            | `require('../config.local.js')` 但实际代码中**未使用** config | 直接删除 require                                 |
| `pages/photographer/[slug].js`  | `config.IMAGE_SERVER_URL` 做图片路径替换                      | 改用环境变量 `process.env.NEXT_PUBLIC_IMAGE_URL` |
| `components/util/imageUtils.js` | `config.IMAGE_SERVER_URL`                                     | 改用环境变量                                     |
| `components/SearchBar.js`       | `require('../config.local.js')` 但实际代码中**未使用** config | 直接删除 require                                 |

### 7.3 受保护内容改造（B档）

**构建时**：

- `build-content-index.mjs` 中，受保护文章 `content_full` 字段为空
- `content_preview` 用 `maskContent()` 处理
- `title` 保留原文（标题可见，内容不可见）

**`[...slug].js` getStaticProps**：

- 受保护文章仍生成页面，但 `contents` 为 masked 占位内容
- 前端检测 `isProtected`，认证后从 `/api/posts/protected/:slug` 拉取真实 content

**新增 API**：

- `GET /api/posts/protected/:slug`：验证 cookie 后返回完整 markdown 内容
- 内容从 D1（如果存在 content_full）或 R2 私有对象获取

### 7.4 imageUtils.js 硬编码路径

**当前**：`/Users/kounarushi/mycode/web-blog/public/.pic/` 硬编码
**目标**：构建脚本中统一处理。所有 markdown 中的图片路径在入 D1 前替换为 `/.pic/xxx`

---

## 8. R2 存储与图片链路

### 8.1 R2 Bucket 结构

```
utopia-images/                  ← R2 bucket
├── .pic/                       ← 文章内嵌图片（884 个文件，扁平）
│   ├── xxx.jpg
│   └── ...
├── photography/
│   ├── content/
│   │   ├── City/
│   │   ├── Emotion/
│   │   └── ...（10 个分类）
│   ├── banner/
│   └── cata/                   ← 分类封面图
└── assets/                     ← 其他静态资源（fake.jpg 等）
```

### 8.2 图片路由兼容

| 前端 URL                            | 路由行为                                          | 最终来源                              |
| ----------------------------------- | ------------------------------------------------- | ------------------------------------- |
| `/.pic/xxx.jpg`                     | API route 从 R2 get() 并 stream                   | R2 `.pic/xxx.jpg`                     |
| `/.pic/thumb/.pic/xxx.jpg`          | 302 → `/cdn-cgi/image/w=400,q=60,f=auto/<R2_URL>` | R2 + CDN 变换                         |
| `/.pic/full/.pic/xxx.jpg`           | 302 → `/cdn-cgi/image/q=85,f=auto/<R2_URL>`       | R2 + CDN 变换                         |
| `/photography/content/City/xxx.jpg` | API route 或 R2 自定义域名                        | R2 `photography/content/City/xxx.jpg` |

### 8.3 成本预估

- 653 摄影 × 2 变体 + 884 文章图 × 1 变体 ≈ **2190 唯一变换** → Free 5000 额度内
- 存储 ~637MB → R2 Free 10GB 额度内
- 注意 R2 **不开启公开目录列表**，防止文件名泄露

---

## 9. 分阶段实施计划

### Phase 0：准备与基线（0.5 天）

```
□ 0.1 冻结 API 响应快照
  - curl 所有 API 接口，保存到 api-snapshots/ 作为回归基线
  - 包括：/api/posts, /api/search, /api/paths, /api/pageviews (各种参数),
          /api/photography/city, /api/auth/check-diary

□ 0.2 合并浏览量数据
  - 合并 public/pageviews.json 和 data/pageviews.json
  - 生成 pageviews-seed.json 用于 D1 初始化

□ 0.3 Cloudflare 账号与域名确认
  - 确认 gaochengzhi.com DNS 已托管到 Cloudflare
  - 子域规划：images.gaochengzhi.com → R2
  - DNS TTL 调低到 60s

□ 0.4 回滚策略
  - VPS 保留至少 2 周
  - 记录 VPS IP (74.48.115.131) 用于紧急回切
```

### Phase 1：Next.js 升级 + 移除 Ant Design（2-3 天）

**这是风险最高的阶段，需要先在分支上完成。**

```
□ 1.1 创建 feature/cloudflare-migration 分支

□ 1.2 升级 Next.js
  npm install next@15 react@19 react-dom@19 eslint-config-next@15 @next/bundle-analyzer@15
  npm uninstall next-images @mdx-js/loader @next/mdx next-bundle-analyzer

□ 1.3 修复 Next.js 升级导致的编译错误
  - next/link: 去掉所有 <Link><a>...</a></Link> 中的 <a>
  - next.config.js: 检查废弃配置项
  - 检查所有 pages/ 文件的兼容性

□ 1.4 移除 antd
  npm uninstall antd @ant-design/icons
  逐个替换组件（见第 4 节详细映射）：

  1.4.1 Spin (pages/[...slug].js)
    → <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>

  1.4.2 Divider (footer.js, PostList.js)
    → <hr className="border-gray-200 dark:border-gray-700 my-4" />

  1.4.3 Tree (FileTree.js) ★ 最复杂
    → 自定义 RecursiveTree 组件，支持展开/折叠、点击导航
    → 用 TailwindCSS 缩进和图标

  1.4.4 Carousel (photo/Banner.js)
    → 简单的 CSS 轮播或引入轻量 embla-carousel-react

  1.4.5 Input (SearchBox.js)
    → 原生 <input>（SearchBar.js 已经是原生实现，可参考）

  1.4.6 Modal (ShareLInk.js)
    → 自定义 modal 组件，dialog 元素 + TailwindCSS backdrop

  1.4.7 Drawer (DrawerView.js)
    → 自定义 slide panel，fixed positioning + transform transition

  1.4.8 所有 @ant-design/icons → 内联 SVG

□ 1.5 删除 _app.js 中的 import 'antd/dist/antd.css'

□ 1.6 全面回归测试
  - npm run build 通过
  - npm run dev 手动验证所有页面
  - 首页、文章页、目录页、摄影页、搜索、暗色模式
```

**验收**：项目在 Next.js 15 + 无 antd 状态下本地 dev/build 正常。

### Phase 2：Cloudflare 基础设施 + 内容索引（1-2 天）

```
□ 2.1 安装 @opennextjs/cloudflare + wrangler
  npm install -D @opennextjs/cloudflare wrangler

□ 2.2 配置 wrangler.toml
  name = "utopia-blog"
  compatibility_date = "2026-03-28"

  [[d1_databases]]
  binding = "DB"
  database_name = "utopia-db"
  database_id = "<创建后填入>"

  [[r2_buckets]]
  binding = "IMAGES"
  bucket_name = "utopia-images"

  [vars]
  NEXT_PUBLIC_IMAGE_URL = "/.pic/"

□ 2.3 创建 D1 + R2
  wrangler d1 create utopia-db
  wrangler r2 bucket create utopia-images

□ 2.4 创建 scripts/build-content-index.mjs
  功能：
  - 扫描 post/ 目录，用 gray-matter 解析每个 .md
  - 提取 title（复用 WaterfallCards.extractTitle 的逻辑）
  - 生成 content_preview（前 1500 字符）
  - 生成 content_plain（去除 markdown 标记）
  - 提取第一张图片 URL
  - 标记 isProtected（路径含 '我的日记'）
  - 替换硬编码路径 /Users/kounarushi/.../public/.pic/ → /.pic/
  - B档：受保护文章 content_full 为空
  - 记录分类、创建时间
  - 扫描 public/photography/content/ 生成 photos 索引
  - 生成路径树数据（等价 readAllFile 返回的 InfoArray）
  - 输出：d1-schema.sql + d1-seed.sql

□ 2.5 本地验证
  node scripts/build-content-index.mjs
  wrangler d1 execute utopia-db --local --file d1-schema.sql
  wrangler d1 execute utopia-db --local --file d1-seed.sql
  # 验证数据正确性
```

**验收**：D1 本地数据库包含所有文章、摄影索引、路径树数据。

### Phase 3：API 迁移（2-3 天）

**关键：在 `@opennextjs/cloudflare` 架构下，API routes 仍在 `pages/api/` 中，但运行时使用 D1/R2 binding。**

```
□ 3.1 配置 API routes 访问 D1/R2 binding
  - @opennextjs/cloudflare 通过 process.env 暴露 binding
  - 或通过 getRequestContext() 获取 env

□ 3.2 改造 /api/posts
  - 移除 fs/readAllFile 依赖
  - 改为 D1 分页查询
  - 保持返回结构不变

□ 3.3 改造 /api/search ★ 前后端同步改
  - 移除 grep/child_process
  - 改为 D1 FTS5 MATCH
  - 返回结构化 JSON（不再是 grep 字符串）
  - 同时改造 SearchBar.js 解析逻辑

□ 3.4 改造 /api/paths
  - 修复现有 bug（infoArray.paths → undefined）
  - 从 D1 path_tree 表查询并重建树结构

□ 3.5 改造 /api/photography/[category]
  - 从 D1 photos 表查询
  - 保持返回结构不变

□ 3.6 改造 /api/pageviews
  - 从 fs 读写改为 D1 UPSERT
  - 保持所有 GET/POST 接口行为不变

□ 3.7 改造 /api/auth/check-diary + /api/auth/verify-diary
  - HMAC-SHA256 签名替代现有不安全的 token 方案
  - 密码存 Worker Secret
  - 保持前端调用方式不变

□ 3.8 改造 /api/images + /api/thumbnails
  - 从 fs 读改为 R2 get()
  - 缩略图改为 302 到 /cdn-cgi/image/...
  - 移除 sharp 依赖

□ 3.9 新增 /api/posts/protected/[slug]
  - B档专用：验证 cookie 后返回受保护文章完整内容
  - 内容从 D1 content_full 或 R2 私有对象获取

□ 3.10 迁移安全中间件逻辑
  - middleware.js 在 @opennextjs/cloudflare 中仍可用
  - 但需验证 Edge Runtime 兼容性
  - 如不兼容，将逻辑移到 API route 的统一中间件

□ 3.11 迁移限流逻辑
  - rateLimit.js 的内存 Map → 改用简单方案：
    * 方案A: 在 D1 中做限流计数（简单但有写入开销）
    * 方案B: 用 KV（最终一致性对限流可接受）
    * 方案C: Cloudflare Rate Limiting Rules（Dashboard 配置，无需代码）
  - 移除 setInterval 清理定时器（Worker 不支持）

□ 3.12 API 回归测试
  - 对照 api-snapshots/ 逐个验证返回结构
```

**验收**：所有 API 在 wrangler dev 本地模式下正常工作。

### Phase 4：页面层改造（1-2 天）

```
□ 4.1 改造 pages/index.js getStaticProps
  - 移除 fs/readAllFile 依赖
  - 构建时从 D1 查询或读取构建脚本生成的静态 JSON
  - 在 @opennextjs/cloudflare 下，getStaticProps 仍可在构建时执行

□ 4.2 改造 pages/[...slug].js getStaticProps + getStaticPaths
  - getStaticPaths: 从 D1 或静态 JSON 获取所有路径
  - getStaticProps: 从 D1 获取文章内容 / 目录结构
  - fallback: true/blocking 在 adapter 下仍可用
  - 移除 config.local.js require（当前未使用 config 变量）

□ 4.3 改造 pages/photographer/index.js
  - getCategoryList 改为从 D1 或构建时 JSON 获取
  - readAllFile 改为从 D1 photos 表获取最新 50 张图

□ 4.4 改造 pages/photographer/[slug].js
  - config.IMAGE_SERVER_URL 替换为环境变量
  - getCategoryList 改为从 D1 获取
  - 客户端 fetch /api/photography/ 不变

□ 4.5 处理 pages/fake/index.js
  - 移除无用的 readAllFile 调用
  - 简化为纯静态页面

□ 4.6 受保护内容 B档改造
  - pages/[...slug].js: 受保护文章 getStaticProps 返回 masked 内容
  - 前端认证后调用 /api/posts/protected/:slug 获取真实内容
  - 动态替换页面内容

□ 4.7 移除 imageUtils.js 硬编码路径
  - normalizeImagePath 使用环境变量或常量 '/.pic/'

□ 4.8 验证所有页面
  - / (首页)
  - /post/Writings/car.md (文章页)
  - /post/Writings (目录页)
  - /photographer (摄影首页)
  - /photographer/city (分类页)
  - /photographer/order (预约页)
  - /auth/diary (密码验证页)
  - /fake (蜜罐页)
```

**验收**：所有页面在 wrangler dev 下可正常访问。

### Phase 5：R2 图片迁移 + 图片链路切换（1-2 天）

```
□ 5.1 创建 scripts/sync-r2.mjs
  - 使用 @aws-sdk/client-s3（R2 兼容 S3 API）
  - 扫描 public/.pic/ → 上传到 R2 .pic/
  - 扫描 public/photography/ → 上传到 R2 photography/
  - 支持增量同步（ETag 对比）
  - 注意中文文件名 URL 编码

□ 5.2 执行初始同步
  node scripts/sync-r2.mjs
  # ~637MB，预计 10-30 分钟

□ 5.3 配置 R2 自定义域名
  images.gaochengzhi.com → R2 bucket

□ 5.4 验证图片链路
  - 首页文章缩略图
  - 摄影页灯箱大图
  - 文章内嵌图片
  - 缩略图质量

□ 5.5 清理
  - 移除 scripts/generateCompressedImages.js
  - 移除 package.json 中 compress-images 脚本
  - npm uninstall sharp（如果还没移除）
```

**验收**：所有图片通过 R2 + cdn-cgi 正常显示。

### Phase 6：CI/CD + 灰度发布（1 天）

```
□ 6.1 创建 .github/workflows/deploy-cloudflare.yml
  - push main → 构建 + 索引生成 + D1 迁移 + wrangler deploy
  - PR → preview 环境

□ 6.2 设置 GitHub Secrets
  - CLOUDFLARE_API_TOKEN
  - CLOUDFLARE_ACCOUNT_ID

□ 6.3 灰度验证
  - 部署到 preview 环境
  - 全面功能测试

□ 6.4 域名切流
  - gaochengzhi.com 指向 Worker
  - 保留 VPS 备用

□ 6.5 监控 24 小时
  - Workers 错误率
  - D1 查询性能
  - 图片加载
```

**验收**：生产切流后 24 小时无 P1 故障。

---

## 10. 风险清单与缓解

| 风险                                    | 概率 | 影响 | 缓解措施                              |
| --------------------------------------- | ---- | ---- | ------------------------------------- |
| Next.js 12→15 升级回归                  | 高   | 高   | 独立分支，逐步升级，全面回归测试      |
| `@opennextjs/cloudflare` pre-1.0 稳定性 | 中   | 高   | 关注 GitHub issues，保留 VPS 回退     |
| antd Tree 组件替换复杂                  | 中   | 中   | FileTree 是核心组件，需仔细实现递归树 |
| FTS5 中文搜索质量下降                   | 中   | 低   | 与 grep 效果不同但可接受，用户已知晓  |
| 中文路径/文件名 R2 编码问题             | 中   | 中   | sync 脚本中统一 URL encode + 映射表   |
| 受保护内容误泄露                        | 低   | 高   | B档严格隔离，构建时不包含受保护正文   |
| Images Transform 超 5000 限额           | 低   | 低   | 当前预估 ~2190，有余量                |
| React 19 breaking changes               | 低   | 中   | 现有代码主要用 hooks，兼容性好        |

---

## 11. 文件处理清单

| 文件                                  | 迁移后状态                                          |
| ------------------------------------- | --------------------------------------------------- |
| `pages/api/posts.js`                  | 改造（fs → D1）                                     |
| `pages/api/search.js`                 | 改造（grep → FTS5）                                 |
| `pages/api/paths.js`                  | 改造（readAllFile → D1） + 修复 bug                 |
| `pages/api/photography/[category].js` | 改造（fs → D1）                                     |
| `pages/api/pageviews.js`              | 改造（fs JSON → D1）                                |
| `pages/api/images/[...path].js`       | 改造（fs → R2）                                     |
| `pages/api/thumbnails/[...path].js`   | 改造（sharp → cdn-cgi 302）                         |
| `pages/api/auth/check-diary.js`       | 改造（不安全 token → HMAC）                         |
| `pages/api/auth/verify-diary.js`      | 改造（明文比较 → HMAC 签发）                        |
| `middleware.js`                       | 保留（验证 adapter 兼容性）                         |
| `lib/auth.js`                         | 改造（token 逻辑改为 HMAC）                         |
| `lib/rateLimit.js`                    | 改造或删除（改用 CF Rate Limiting）                 |
| `lib/imageApiUtils.js`                | 删除（R2 代理不需要）                               |
| `components/util/readAllfile.js`      | 仅构建脚本使用，运行时不再调用                      |
| `components/util/getCategoryList.js`  | 仅构建脚本使用                                      |
| `components/util/imageUtils.js`       | 改造（移除硬编码路径和 config.local.js）            |
| `components/SearchBar.js`             | 改造（适配结构化搜索结果 + 移除 @ant-design/icons） |
| `components/main/FileTree.js`         | 重写（移除 antd Tree，自定义实现）                  |
| `config.local.js`                     | 删除（替换为环境变量）                              |
| `.env.local`                          | 迁移到 Worker Secrets                               |
| `deploy.sh`, `upload.sh` 等           | 归档或删除                                          |
| `scripts/generateCompressedImages.js` | 删除                                                |
| `nginx-security-example.conf`         | 归档                                                |

---

## 12. 新增文件清单

| 文件                                      | 用途                   |
| ----------------------------------------- | ---------------------- |
| `wrangler.toml`                           | Cloudflare Worker 配置 |
| `scripts/build-content-index.mjs`         | 构建时内容索引脚本     |
| `scripts/sync-r2.mjs`                     | R2 图片同步脚本        |
| `scripts/d1-schema.sql`                   | D1 建表语句            |
| `.github/workflows/deploy-cloudflare.yml` | CI/CD 流水线           |
| `api-snapshots/`                          | API 响应基线快照       |
| `pages/api/posts/protected/[slug].js`     | B档受保护内容专用 API  |
