# Utopia 迁移到 Cloudflare 的详细改造计划（v2 — 代码审计增强版）

更新时间：2026-03-28

> **v2 变更说明**：在 v1 基础上，对项目全部源码进行了逐文件审计，补充了遗漏的页面/接口/组件、修正了事实性错误、标注了隐藏的技术风险，并增加了可直接执行的操作级步骤。新增内容以 `🆕` 标记，修正内容以 `🔧` 标记。

---

## 1. 目标与结论

目标是把当前站点改造成"静态前端 + 按需请求后端"的 Cloudflare 架构，保留你现在最看重的体验：

- 首页和列表依然按页懒加载，不把全部内容塞进前端包。
- 搜索依然走后端请求，不在浏览器加载全量索引。
- 图片由 Cloudflare 负责自动压缩/变体/缓存。
- 部署从"rsync 到 VPS + 重启进程"迁移到 Cloudflare 的标准化流水线。

推荐主方案：

- 前端：Next.js 站点改为静态导出（SSG），部署到 **Workers Static Assets**（也可落到 Pages，但本计划以 Workers 为主，便于统一 API）。
- 后端：`/api/*` 全部迁移到 **Cloudflare Worker**。
- 数据：
  - **D1**：文章元数据、搜索索引（FTS5）、路径树、摄影分类索引、浏览量。
  - **R2**：摄影原图（可选存放私密内容原文）。
- 图片：使用 `/cdn-cgi/image/...` 变换链路，保留旧 `/.pic/*` 兼容路由。
- 部署：GitHub Actions + Wrangler，支持预览环境与生产一键发布。

---

## 2. 现状审计（基于当前代码）

### 2.1 当前运行模式

- 技术栈：**Next.js 12.2.4** + pages router + ISR(`revalidate: 1`)。
- 🔧 React 版本：**18.2.0**（v1 未提及，迁移时需注意兼容性）。
- 数据源：直接读本地文件系统（`post/`, `public/photography/`）。
- 动态接口：`pages/api/*` 在 Node 环境运行。
- 部署：`upload.sh/deploy.sh/simple-deploy.sh/quick-deploy.sh` 通过 rsync 上传到 VPS（`74.48.115.131:22`），再重启 `next start`（端口 `8888`）。
- 🆕 UI 框架依赖：**Ant Design 4.22.4**（`antd/dist/antd.css` 全量引入）、**TailwindCSS 3.1.8**。
- 🆕 上下文系统：`contexts/DarkModeContext` 提供暗色模式切换。
- 🆕 配置系统：`config.local.js`（gitignored）提供 `API_DOMAIN`、`IMAGE_SERVER_URL`、`SERVER_IP`、`SOCIAL_LINKS` 等运行时配置。
- 🆕 环境变量：`.env.local` 存放 `DIARY_PASSWORD`。

### 2.2 与迁移强相关的现有实现（完整清单）

**API 路由（完整列表，v1 遗漏了 3 个）：**

| 接口                          | 文件                                  | 核心依赖                                   | v1 是否覆盖 |
| ----------------------------- | ------------------------------------- | ------------------------------------------ | ----------- |
| `/api/posts`                  | `pages/api/posts.js`                  | `fs`, `gray-matter`, `readAllFile`, `auth` | ✅          |
| `/api/search`                 | `pages/api/search.js`                 | `child_process.exec`, `grep`, `rateLimit`  | ✅          |
| `/api/paths`                  | `pages/api/paths.js`                  | `readAllFile`                              | ✅          |
| `/api/photography/[category]` | `pages/api/photography/[category].js` | `fs.readdirSync`, `readAllFile`            | ✅          |
| `/api/pageviews`              | `pages/api/pageviews.js`              | `fs` 读写 `public/pageviews.json`          | ✅          |
| `/api/images/[...path]`       | `pages/api/images/[...path].js`       | `fs`, `imageApiUtils`                      | ✅          |
| `/api/thumbnails/[...path]`   | `pages/api/thumbnails/[...path].js`   | `fs`, `sharp`                              | ✅          |
| 🆕 `/api/auth/check-diary`    | `pages/api/auth/check-diary.js`       | `verifyAuthCookie`                         | ❌ 遗漏     |
| 🆕 `/api/auth/verify-diary`   | `pages/api/auth/verify-diary.js`      | `verifyDiaryPassword`, `createAuthCookie`  | ❌ 遗漏     |

**页面路由（完整列表，v1 遗漏了 4 个页面）：**

| 页面                      | 文件                           | 数据获取方式                                         | v1 是否覆盖 |
| ------------------------- | ------------------------------ | ---------------------------------------------------- | ----------- |
| `/` 首页                  | `pages/index.js`               | `getStaticProps` + fs                                | ✅          |
| `/[...slug]` 文章/目录    | `pages/[...slug].js`           | `getStaticProps` + fs，`fallback: true`              | ✅          |
| 🆕 `/photographer`        | `pages/photographer/index.js`  | `getStaticProps` + `readAllFile` + `getCategoryList` | ❌ 遗漏     |
| 🆕 `/photographer/[slug]` | `pages/photographer/[slug].js` | `getStaticProps` + 客户端 fetch `/api/photography/`  | ❌ 遗漏     |
| 🆕 `/photographer/order`  | `pages/photographer/order.js`  | 纯静态                                               | ❌ 遗漏     |
| 🆕 `/auth/diary`          | `pages/auth/diary.js`          | 纯客户端，调用 `/api/auth/verify-diary`              | ❌ 遗漏     |
| 🆕 `/fake`                | `pages/fake/index.js`          | `getStaticProps` + `readAllFile`                     | ❌ 遗漏     |

**🆕 关键组件依赖链（v1 完全未覆盖）：**

- `components/main/WaterfallCards.js` → 依赖 `/api/posts`, `/api/pageviews`, `/api/auth/check-diary`
- `components/SearchBar.js` → 依赖 `/api/search`，前端解析 grep 格式的字符串输出
- `components/PageView.js` → POST `/api/pageviews` 自增浏览量
- `components/TotalViews.js` → GET `/api/pageviews?type=total`
- `components/ViewBadge.js` → 展示浏览量 badge
- `components/util/readAllfile.js` → **核心文件扫描函数**，被 5 个 API/页面引用，完全依赖 `fs`
- `components/util/getCategoryList.js` → 摄影分类，依赖 `fs.readdirSync`
- `components/util/imageUtils.js` → 硬编码了本地路径 `/Users/kounarushi/mycode/web-blog/public/.pic/`
- `components/photo/Wall.js`, `Banner.js`, `cataContainer.js`, `Pnav.js` → 摄影页核心组件
- `lib/auth.js` → 鉴权核心（`PROTECTED_FOLDERS = ['我的日记']`），cookie 验证
- `lib/rateLimit.js` → 内存 Map 限流 + IP 获取
- `lib/imageApiUtils.js` → 图片路径解析/验证/缓存头

### 2.3 当前数据规模（实际统计 — 已核实）

- 🔧 文章文件：`366` 篇 md（确认正确）
- 🔧 摄影文件：实际为 `653` 张（v1 写 691，**数据有误**）
- 体积：`post/` 约 `10MB`，`public/photography/` 约 `472MB`，`public/.pic/` 约 `165MB`（确认正确）
- 🆕 摄影分类目录：`City, Emotion, Ghibli, HK, Lover, Nature, Phone, Portrait, Travel, Wedding` 共 10 个
- 🆕 文章分类目录：`我的日记, C&C++, carla, CICD, Collection, LeedCodeExperience, PaperReading, readings, Statistics, Writings` 共 10 个
- 🆕 受保护内容：`我的日记/` 下含 7 个年份子目录（2020-2026年）
- 🆕 浏览量数据：`public/pageviews.json`（321 bytes，8 条记录）
- 🆕 `.pic/` 目录：扁平结构，884 个文件直接放在根目录下（无子目录组织），是文章内嵌图片

### 2.4 迁移阻塞点

- Worker 环境不能直接使用 Node `fs` 做线上动态读写。
- Worker 不支持你当前这套 `grep + child_process` 搜索模式。
- Worker 不适合沿用本地 `sharp + 写磁盘缓存` 模式。
- 静态托管后，`ISR + fallback true + 文件系统实时扫描` 不再成立。
- 当前"日记鉴权"只是前端跳转+普通 cookie 校验，严格隐私场景存在内容泄露风险（受保护文章在静态 HTML/JSON 中可能可见）。

**🆕 v1 遗漏的阻塞点：**

1. **`readAllFile` 是单点瓶颈**：被 `posts.js`, `paths.js`, `photography/[category].js`, `photographer/index.js`, `fake/index.js` 以及 `index.js` 和 `[...slug].js` 的 `getStaticProps` 共 7 处调用。该函数递归扫描整个目录树，返回 `{SortedInfoArray, InfoArray}`，迁移时需要一个等价的 D1 查询层完全替代它。
2. **`imageUtils.js` 硬编码绝对路径**：`/Users/kounarushi/mycode/web-blog/public/.pic/` 硬编码在 `normalizeImagePath` 和 `posts.js` 中，构建时必须替换。
3. **`config.local.js` 被 gitignore**：该文件不在仓库中，但被 `pages/api/posts.js`, `pages/[...slug].js`, `pages/photographer/[slug].js`, `components/util/imageUtils.js`, `components/SearchBar.js` 共 5 处 `require`。迁移到 CF 后需替换为环境变量。
4. **Ant Design 全量 CSS 引入**：`_app.js` 中 `import 'antd/dist/antd.css'` 约 60KB+，静态导出时会被打入 bundle，建议按需引入或替换。
5. **`[...slug].js` 的 `getStaticPaths` 使用 `fallback: true`**：静态导出不支持 `fallback: true`，必须改为 `fallback: false` 并预生成所有路径，或者把动态页面改为客户端渲染。
6. **Next.js 12 的 `next export` 限制**：不支持 API Routes、`getServerSideProps`、ISR、Image Optimization、middleware。当前项目虽然没有 `getServerSideProps`，但大量使用了 `revalidate`（ISR）和 middleware，这些都不兼容 `next export`。
7. **`middleware.js` 安全过滤**：当前 middleware 在 Edge Runtime 运行，做了恶意路径/UA 拦截和安全头注入。静态导出后 middleware 不再执行，这些安全措施需要迁移到 Worker 层。
8. **浏览量文件存在两份**：`public/pageviews.json`（活跃数据）和 `data/pageviews.json`（旧数据），API 只读写 `public/pageviews.json`，迁移时需合并。
9. **`.pic/` 目录图片是扁平结构（884个文件无子目录）**：同步到 R2 时路径映射简单，但需注意中文文件名（如 `大声道撒旦撒撒.png`）的 URL 编码兼容性。

---

## 3. Cloudflare 侧关键约束（用于方案边界）

以下用于容量/成本边界判断（文档信息已核对）：

- Workers Free：`100,000 requests/day`，CPU 默认 `10ms/request`。
- Workers Static Assets：
  - 静态资源请求免费且不限量。
  - 每个 Worker 版本文件数：Free `20,000`、Paid `100,000`。
  - 单文件上限 `25 MiB`。
- Workers Builds：Free `3,000 build minutes/月`。
- Images Transform（Free）：每月 `5,000` 个唯一变换免费，超出后新变换会报 `9422`（不自动计费）。
- Polish：Free 不可用，Pro/Business/Enterprise 可用。
- D1（Free）：读 `5M rows/day`、写 `100k rows/day`、存储 `5GB`；支持 SQLite `FTS5`。
- KV：最终一致性，跨区域写传播一般可能有 ~60s 级延迟，不适合强一致计数。

🆕 **补充约束：**

- R2 Free：存储 `10GB/月`，A 类操作 `1M/月`，B 类操作 `10M/月`。你的 `472MB + 165MB ≈ 637MB` 摄影+文章图片完全在 Free 额度内。
- Workers Static Assets Free 的 `20,000` 文件数上限：你当前静态构建产物（`out/` 或 `.next/static/`）加上所有页面通常在几千个，无压力。但注意 `.pic/` 的 884 个文件 + `photography/` 的 653 张图不要放进 Static Assets（应放 R2）。
- D1 单数据库 `10GB` 上限：你 366 篇文章元数据 + FTS 索引估计在 `50-100MB`，充裕。

结合你月访问量约 1000：本项目完全可先跑 Free 组合（必要时仅给图片开 Paid）。

---

## 4. 目标架构

```text
Browser
  ├─ 静态页面/JS/CSS -> Workers Static Assets（免费静态流量）
  ├─ /api/* -> Worker（业务逻辑）
  │            ├─ D1（文章元数据、FTS搜索、浏览量）
  │            └─ R2（摄影原图/文章图片/可选私密内容）
  └─ /cdn-cgi/image/... -> Cloudflare Images Transform（缩放/压缩/格式自动）
```

关键路由策略：

- `run_worker_first = ["/api/*", "!/_next/*", "!/assets/*"]`。
- 静态资源默认直出，API 才进入 Worker。
- 兼容层：保留 `/.pic/thumb/*`, `/.pic/full/*`, `/.pic/*`，由 Worker/规则改写到新图片链路。

🆕 **补充架构细节：**

```text
Worker 路由分发：
  /api/posts           -> D1 分页查询
  /api/search          -> D1 FTS5 MATCH
  /api/paths           -> D1 路径树查询 / 静态 JSON
  /api/photography/:cat -> D1 分类索引查询
  /api/pageviews       -> D1 UPSERT 计数
  /api/auth/check-diary -> Worker cookie 验证（HMAC）     ← v1 遗漏
  /api/auth/verify-diary -> Worker 密码验证 + 签名 cookie ← v1 遗漏
  /api/images/*        -> R2 代理 / 302 重定向
  /api/thumbnails/*    -> /cdn-cgi/image 重定向

安全层（替代当前 middleware.js）：
  Worker 入口统一做：
  - 恶意路径拦截（blockedPatterns）
  - 可疑 UA 拦截（blockedUserAgents）
  - 安全响应头注入
```

---

## 5. API 迁移映射（现有 -> 目标）— 完整版

| 现有接口                     | 现状问题                                                                         | 目标实现                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `/api/posts`                 | 依赖 `readAllFile`（fs 递归扫描）+ `fs.readFileSync` 读内容 + `gray-matter` 解析 | Worker + D1 `posts` 表分页查询，`content_preview` 字段存构建时预生成的截断内容 |
| `/api/search`                | `grep` + 子进程，不可迁移                                                        | Worker + D1 FTS5（`MATCH` 查询）                                               |
| `/api/paths`                 | `readAllFile` 运行时扫描                                                         | 构建时生成路径树写入 D1 `paths` 表或静态 JSON                                  |
| `/api/photography/:category` | `fs.readdirSync` 运行时扫描 `public/photography/content/`                        | 构建时索引进 D1 `photos` 表，Worker 按分类返回                                 |
| `/api/pageviews`             | `fs.readFileSync/writeFileSync` 读写 `public/pageviews.json`                     | Worker + D1 原子 `UPSERT` 计数，支持 GET（单条/批量/合计）和 POST（自增）      |
| `/api/images/[...path]`      | `fs.readFileSync` 读本地文件                                                     | R2 公网域直接访问，或 Worker 从 R2 `get()` 后 stream 返回                      |
| `/api/thumbnails/[...path]`  | `sharp` 动态压缩+`fs.writeFileSync` 磁盘缓存                                     | 改为 Worker 302 到 `/cdn-cgi/image/width=400,quality=60,format=auto/<R2_URL>`  |
| 🆕 `/api/auth/check-diary`   | 读 cookie，`verifyAuthCookie` 验证 JSON 格式 token                               | Worker 验证 HMAC 签名 cookie，无需 D1                                          |
| 🆕 `/api/auth/verify-diary`  | 明文比较 `DIARY_PASSWORD` 环境变量                                               | Worker 验证密码 + 用 HMAC 签发 cookie。密码存 Worker Secret                    |

🆕 **v1 遗漏的前端 API 调用点（必须确保迁移后兼容）：**

| 前端位置                   | 调用的 API                             | 调用方式              |
| -------------------------- | -------------------------------------- | --------------------- |
| `WaterfallCards.js`        | `/api/posts?page=N&limit=10`           | 滚动触底 fetch        |
| `WaterfallCards.js`        | `/api/pageviews?type=batch&slugs=...`  | 批量获取浏览量        |
| `WaterfallCards.js`        | `/api/auth/check-diary`                | 点击受保护文章前检查  |
| `SearchBar.js`             | `/api/search?query=...`                | Enter 触发搜索        |
| `PageView.js`              | `POST /api/pageviews?slug=...`         | 页面加载时自增        |
| `TotalViews.js`            | `/api/pageviews?type=total`            | 获取总浏览量          |
| `index.js` (useEffect)     | `/api/auth/check-diary` + `/api/posts` | 鉴权后刷新列表        |
| `[...slug].js` (useEffect) | `/api/auth/check-diary` + `/api/paths` | 鉴权检查 + 获取路径树 |
| `photographer/[slug].js`   | `/api/photography/{category}`          | 客户端动态加载图片    |

---

## 6. 懒加载与"不要把所有数据塞前端"方案

### 6.1 首页与文章列表

- 保持当前交互：首屏只拿第一页，滚动继续请求下一页。
- `WaterfallCards` 继续调用 `/api/posts?page=N&limit=10`。
- 后端分页在 D1 做，不把全量文章写入客户端 bundle。

🆕 **注意**：当前 `index.js` 的 `getStaticProps` 会在构建时调用 `readAllFile` 并把前 10 篇文章内容注入 props。静态导出后这部分数据会成为 JSON 文件嵌入 HTML。需要决定：

- **方案 A**（推荐）：构建时仍注入首屏 10 篇的预览数据（从 D1 导出的 JSON），后续分页走 API。
- **方案 B**：首屏也改为客户端 fetch，首屏会有短暂空白。

### 6.2 路径树与分类

- 目录树不再运行时扫盘。
- 在构建阶段生成标准化索引，写入 D1（或静态 JSON 由 Worker 透传）。
- 🆕 注意：`[...slug].js` 中有从 `localStorage` 读取 `paths` 的逻辑，如果缓存不存在则 fallback 到 `/api/paths`。迁移后 `/api/paths` 必须可用。

### 6.3 受保护内容（重点）

按安全等级给两档：

- A档（弱保护，迁移快）：保持现有遮罩逻辑，仅避免明显泄露。
- B档（推荐）：受保护文章正文不参与静态导出，放在 R2 私有对象或 D1 加密字段；前端拿到授权后再请求正文。

建议直接上 B 档，避免"静态产物被抓取即泄露"。

🆕 **当前鉴权安全审计：**

1. **密码明文存储**：`.env.local` 中 `DIARY_PASSWORD=990213`，迁移后应使用 Worker Secrets（`wrangler secret put DIARY_PASSWORD`）。
2. **Token 无签名验证**：`verifyAuthCookie` 只检查 token 长度（64 位 hex）和过期时间，**不验证 token 是否真正由服务端签发**。任何人构造一个 64 位 hex + 未来时间的 JSON cookie 即可绕过。迁移时 **必须** 改为 HMAC 签名验证。
3. **Cookie 在 `verify-diary.js` 中设置了 `HttpOnly; SameSite=Strict`**，这是正确的，迁移时保留。
4. **静态导出风险**：当前 `getStaticProps` 中对受保护内容调用了 `maskContent`（字符替换为 `*`），但 `maskContent` 是在构建时执行的——如果构建时没有认证，受保护文章标题仍然可见（只有正文被遮罩）。B 档方案下受保护文章**不应出现在任何静态产物中**。

---

## 7. 搜索方案（推荐 D1 FTS5）

### 7.1 数据结构

- `posts`：`slug, title, excerpt, content_plain, updated_at, is_protected, category, ...`
- `posts_fts`：FTS5 虚拟表，索引 `title + content_plain`。

### 7.2 查询策略

- 输入清洗后执行 `MATCH`。
- 返回结构改为对象数组（建议）：
  - `slug`
  - `title`
  - `snippet`
  - `score`
  - `line_hint`（可选）
- 兼容过渡期可暂时保留旧字符串格式，前端稳定后再升级。

🆕 **前端搜索结果解析的兼容性风险：**

当前 `SearchBar.js` 直接解析 grep 输出格式：`filepath:lineNumber:content`，用冒号 split（`item.split(":")`）提取路径、行号、内容。这意味着：

- 如果 API 响应格式改变，`SearchBar.js` 必须同步修改。
- **建议**：迁移 API 后返回结构化 JSON，同时改造 `SearchBar.js` 的解析逻辑。以下是兼容方案：

```javascript
// 新 API 返回格式
{
  results: [
    { file: "post/Writings/car.md", line: 42, content: "...", snippet: "..." },
    ...
  ],
  total: 15,
  hasMore: false
}

// SearchBar.js 适配（简单映射回旧格式或直接改用新字段）
```

### 7.3 速率控制

- 在 Worker 保留每 IP 限流逻辑。
- 🔧 将限流存储从内存 Map 改为 **Worker KV**（低流量场景够用，~60s 最终一致性对限流可接受）或 Rate Limiting API。Durable Objects 对此场景过重。
- 🆕 当前 `rateLimit.js` 还有一个 `setInterval` 每 5 分钟清理过期条目——Worker 环境不支持长驻定时器，需移除。

---

## 8. 图片方案（兼顾兼容与成本）

### 8.1 目标

- 不再在应用层用 `sharp` 动态压缩。
- 保留现有前端 URL 使用习惯，减少改动。

### 8.2 路由兼容设计

- `/.pic/thumb/<path>` -> `/cdn-cgi/image/width=400,quality=60,format=auto/<source>`
- `/.pic/full/<path>` -> `/cdn-cgi/image/quality=85,format=auto/<source>`
- `/.pic/<path>` -> 原图地址（R2 custom domain）

🆕 **补充路由细节（基于实际 `next.config.js` rewrite 规则）：**

当前 rewrite 规则：

```javascript
{ source: '/.pic/thumb/:path*', destination: '/api/thumbnails/:path*?type=thumbnail' }
{ source: '/.pic/full/:path*',  destination: '/api/thumbnails/:path*?type=fullsize' }
{ source: '/.pic/:path*',       destination: '/api/images/:path*' }
```

`WaterfallCards.js` 中的缩略图 URL 生成逻辑：

```javascript
// 原始: /.pic/xxx.jpg -> 缩略图: /.pic/thumb/.pic/xxx.jpg
const thumbUrl = firstImage.replace("/.pic/", "/.pic/thumb/.pic/");
```

注意这里的路径变换：thumb URL 是 `/.pic/thumb/.pic/xxx.jpg`，经 rewrite 后变成 `/api/thumbnails/.pic/xxx.jpg?type=thumbnail`。Worker 层的路由解析需要覆盖这个嵌套 `.pic` 路径。

### 8.3 存储方案

- 推荐：摄影原图放 R2（自定义域名），静态图片走 Cloudflare CDN 缓存。
- 旧图迁移脚本：一次性从 `public/photography`、`public/.pic` 同步到 R2。

🆕 **R2 bucket 路径规划建议：**

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
└── assets/                     ← 其他静态资源（如 fake.jpg）
```

### 8.4 成本控制

- 你当前规模下，固定 two-variant（thumb/full）通常可把"唯一变换数"控制在可预估区间。
- 🆕 估算：653 张摄影 × 2 变体 + 884 张文章图 × 1 变体（缩略图）≈ 2190 唯一变换。**在 Free 的 5000 限额内**，但增长后需注意。
- 若后续需要更多尺寸，建议统一尺寸档位，避免"按屏宽无限组合"导致唯一变换激增。

## 9. 部署与发布流水线重构

### 9.1 从现有模式迁移

现有：本地脚本 rsync 到 VPS。
目标：GitHub Actions / Cloudflare Builds + Wrangler。

🆕 **当前部署脚本清单**（迁移后可归档或删除）：

- `upload.sh` — rsync 上传到 VPS
- `deploy.sh` — upload + 远程重启 next start
- `quick-deploy.sh` — 快速部署
- `simple-deploy.sh` — 简化版部署
- `imgUpload.sh` — 图片上传
- `help.sh` — 帮助脚本

### 9.2 新流水线步骤（建议）

1. `npm ci`
2. `npm run lint`
3. `npm run build`（静态构建）
4. `npm run build:content-index`（扫描 markdown/图片，生成 D1 导入 SQL/JSON）
5. `wrangler d1 migrations apply`
6. `wrangler d1 execute --file generated.sql`
7. `wrangler deploy`（Worker + Static Assets）
8. 发布后健康检查（核心接口 + 首页 + 图片 + 搜索）

🆕 **构建步骤细化：**

第 3 步需要注意：当前 `next build` 是 SSR 构建。改为静态导出有两种路径：

- **路径 A（推荐）**：保留 Next.js，在 `next.config.js` 中加 `output: 'export'`（Next 13+）或使用 `next export`（Next 12）。但 Next 12 的 `next export` 不支持 ISR/fallback/API routes，**需要升级到 Next 13+ 或抽离前端框架**。
- **路径 B**：不做 `next export`，而是让 Worker 自身作为 Next.js 的 mini-server（使用 `@cloudflare/next-on-pages`），保留 SSR 能力。这样可以保留 `getStaticProps + revalidate`，但增加了 Worker CPU 消耗和复杂度。

**建议选择路径 A**，但需要先完成 Next.js 升级（12 → 14/15）。升级路线：

```
Next 12.2.4 → 13.x（引入 app router，但可以保持 pages router）
           → 14.x（稳定的 output: 'export'）
```

🆕 **升级风险点：**

- `antd` 4.x 与 Next 14 可能有 CSS 引入方式冲突（需改为 `antd/es` 按需加载或升级到 antd 5）
- `react-markdown` 8.x 和 `rehype-*`/`remark-*` 插件版本需匹配
- `next-images` 包在 Next 13+ 中已不需要（内置 Image 组件）

### 9.3 环境分层

- `preview`：PR 环境自动部署。
- `production`：main 分支受保护发布。
- secrets：`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `D1_DB_ID`, `R2_*`。
- 🆕 额外 secrets：`DIARY_PASSWORD`（从 `.env.local` 迁移）、`HMAC_SECRET`（新增，用于 cookie 签名）。

---

## 10. 分阶段实施计划（可直接分工）— 增强版

### Phase 0：冻结与基线（0.5 天）

**执行步骤：**

```
□ 0.1 冻结现网接口契约
  - 运行以下命令记录所有 API 响应示例：
    curl https://gaochengzhi.com/api/posts?page=1&limit=2 > api-snapshots/posts.json
    curl https://gaochengzhi.com/api/search?query=test > api-snapshots/search.json
    curl https://gaochengzhi.com/api/paths > api-snapshots/paths.json
    curl https://gaochengzhi.com/api/pageviews?type=total > api-snapshots/pageviews-total.json
    curl https://gaochengzhi.com/api/photography/city > api-snapshots/photography-city.json
    curl https://gaochengzhi.com/api/auth/check-diary > api-snapshots/auth-check.json
  - 将响应保存到 api-snapshots/ 目录，作为迁移后的对比基线

□ 0.2 明确受保护内容安全等级
  - 决策：A档（弱保护）还是 B档（推荐强保护）
  - 如选 B 档：确认 `post/我的日记/` 下所有 .md 文件不参与 next export

□ 0.3 确认 Cloudflare 账号与域名
  - Cloudflare 账号是否已有？
  - gaochengzhi.com 的 DNS 是否已托管到 Cloudflare？（如果没有，需要先迁移 DNS）
  - 子域规划：
    - 主站：gaochengzhi.com → Worker
    - 图片：images.gaochengzhi.com → R2 自定义域名
    - 灰度：preview.gaochengzhi.com → Preview Worker

□ 0.4 合并浏览量数据
  - 合并 `public/pageviews.json`（主数据）和 `data/pageviews.json`（旧数据）
  - 生成统一的 pageviews-seed.json 用于 D1 初始化

□ 0.5 确认回滚策略
  - VPS 保留至少 2 周不关机
  - DNS TTL 调低到 60s（方便快速切回）
```

验收：迁移范围、边界和回滚策略书面确认。

---

### Phase 1：基础设施落地（1-2 天）

🆕 比 v1 增加了框架升级评估。

**执行步骤：**

```
□ 1.1 评估 Next.js 升级
  - 在分支上尝试 npm install next@14
  - 修复编译错误，特别关注：
    - antd CSS 引入方式
    - next/image 变化
    - next-images 包是否还需要
  - 如果升级成本过高，考虑 @cloudflare/next-on-pages 方案

□ 1.2 初始化 Worker 项目
  mkdir -p worker/src/routes
  cd worker
  npm init -y
  npm install wrangler --save-dev

□ 1.3 创建 wrangler.toml
  name = "utopia-blog"
  main = "src/index.ts"
  compatibility_date = "2026-03-28"

  [site]
  bucket = "../out"  # Next.js 静态导出目录

  [[d1_databases]]
  binding = "DB"
  database_name = "utopia-db"
  database_id = "<创建后填入>"

  [[r2_buckets]]
  binding = "IMAGES"
  bucket_name = "utopia-images"

  [vars]
  ENVIRONMENT = "production"

□ 1.4 创建 D1 数据库
  wrangler d1 create utopia-db
  # 记录返回的 database_id，填入 wrangler.toml

□ 1.5 创建 R2 bucket
  wrangler r2 bucket create utopia-images

□ 1.6 配置 R2 自定义域名
  # 在 Cloudflare Dashboard → R2 → utopia-images → Settings → Custom Domains
  # 添加 images.gaochengzhi.com

□ 1.7 最小验证
  # worker/src/index.ts 写一个 Hello World Worker
  # 包含 /api/ping 路由和静态文件直出
  wrangler dev  # 本地验证
  wrangler deploy  # 部署到 Cloudflare
```

验收：`/` 能静态访问，`/api/ping` 能返回。

---

### Phase 2：内容索引构建脚本（1-2 天）

**执行步骤：**

```
□ 2.1 创建 scripts/build-content-index.mjs
  功能：
  - 扫描 post/ 目录，对每个 .md 文件：
    * 用 gray-matter 解析 frontmatter
    * 提取标题（同 WaterfallCards.extractTitle 的逻辑）
    * 生成 content_preview（前 1500 字符，同 posts.js 的截断逻辑）
    * 提取 content_plain（去除 markdown 标记，用于 FTS 索引）
    * 提取第一张图片 URL
    * 判断 isProtected（路径包含 '我的日记'）
    * 记录分类（第一级子目录名）
    * 记录创建时间（文件 birthtime）
  - 扫描 public/photography/content/ 目录，对每个分类：
    * 列出所有图片文件名和路径
    * 记录分类名和图片数量
  - 生成路径树 JSON（等价于 readAllFile 返回的 InfoArray）
  - 输出：
    * d1-schema.sql — 建表语句
    * d1-seed.sql — 数据插入语句
    * paths-tree.json — 路径树（可选直接写 D1）

□ 2.2 D1 Schema 设计

  -- 文章表
  CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,         -- e.g., 'post/Writings/car.md'
    title TEXT NOT NULL,
    category TEXT,                      -- e.g., 'Writings'
    content_preview TEXT,               -- 前 1500 字符
    content_plain TEXT,                 -- 纯文本，用于 FTS
    content_full TEXT,                  -- 完整 markdown（B 档受保护文章此字段为空）
    first_image TEXT,                   -- 第一张图片 URL
    is_protected BOOLEAN DEFAULT 0,
    created_at INTEGER,                 -- 文件创建时间戳
    updated_at INTEGER,
    path TEXT NOT NULL                  -- 前端路由路径
  );

  -- FTS 虚拟表
  CREATE VIRTUAL TABLE posts_fts USING fts5(
    title, content_plain,
    content='posts',
    content_rowid='id'
  );

  -- 浏览量表
  CREATE TABLE pageviews (
    slug TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0
  );

  -- 摄影索引表
  CREATE TABLE photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,                 -- 例如 /photography/content/City/xxx.jpg
    created_at INTEGER
  );

  -- 路径树表（可选，也可以用静态 JSON）
  CREATE TABLE path_tree (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    path TEXT NOT NULL,
    parent_path TEXT,
    is_leaf BOOLEAN,
    type TEXT,                          -- 'folder' or 'file'
    created_at INTEGER
  );

□ 2.3 处理旧 markdown 图片路径
  - 替换 `file:///Users/kounarushi/mycode/web-blog/public/.pic/` → `/.pic/`
  - 替换其他绝对路径引用
  - 这步在 build-content-index.mjs 中统一处理

□ 2.4 本地验证
  node scripts/build-content-index.mjs
  wrangler d1 execute utopia-db --local --file d1-schema.sql
  wrangler d1 execute utopia-db --local --file d1-seed.sql
  # 验证数据条数
  wrangler d1 execute utopia-db --local --command "SELECT COUNT(*) FROM posts"
  wrangler d1 execute utopia-db --local --command "SELECT COUNT(*) FROM photos"
```

验收：本地可一键生成索引并导入 D1。

---

### Phase 3：核心 API 迁移（2-3 天）

**执行步骤：**

```
□ 3.1 Worker 路由框架搭建
  worker/src/index.ts — 主入口，路由分发
  worker/src/routes/posts.ts
  worker/src/routes/search.ts
  worker/src/routes/paths.ts
  worker/src/routes/photography.ts
  worker/src/routes/pageviews.ts
  worker/src/routes/auth.ts          ← v1 遗漏
  worker/src/routes/images.ts
  worker/src/middleware/security.ts   ← 迁移 middleware.js 的安全逻辑
  worker/src/middleware/rateLimit.ts

□ 3.2 安全中间件（替代 middleware.js）
  - 将 middleware.js 中的 blockedPatterns（52 条规则）和 blockedUserAgents（14 条）搬到 Worker
  - 在 Worker 入口统一执行安全检查
  - 注入安全响应头（X-Content-Type-Options, X-Frame-Options 等）

□ 3.3 逐个实现 API
  /api/posts：
    - SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?
    - 受保护文章：如果未认证，content_preview 用 maskContent 处理
    - 返回结构与现有 posts.js 一致：{ posts: [...], pagination: {...} }

  /api/search：
    - 输入清洗（同 search.js 的 dangerousChars 过滤）
    - SELECT * FROM posts_fts WHERE posts_fts MATCH ? ORDER BY rank LIMIT 30
    - ⚠️ 前端 SearchBar.js 期望的是 grep 格式字符串数组
    - 过渡方案：Worker 把 FTS 结果映射为 "filepath:line:content" 格式
    - 长期方案：改返回结构化 JSON，同时改 SearchBar.js

  /api/paths：
    - 从 D1 查询路径树，或直接返回构建时生成的静态 JSON
    - 返回结构：{ paths: <tree object> }

  /api/photography/:category：
    - SELECT * FROM photos WHERE category = ? ORDER BY filename
    - 返回结构：{ success: true, category: "...", images: [...] }

  /api/pageviews：
    GET ?slug=xxx       → SELECT count FROM pageviews WHERE slug = ?
    GET ?type=total     → SELECT SUM(count) as total FROM pageviews
    GET ?type=batch&slugs=a,b,c → SELECT slug, count FROM pageviews WHERE slug IN (?,?,?)
    POST ?slug=xxx      → INSERT INTO pageviews (slug, count) VALUES (?, 1)
                           ON CONFLICT(slug) DO UPDATE SET count = count + 1

  /api/auth/check-diary：（v1 遗漏）
    - 从 request cookies 中读取 diary_auth
    - 用 HMAC-SHA256 验证 token 签名
    - 返回 { authenticated: true/false }

  /api/auth/verify-diary：（v1 遗漏）
    - 验证 password === env.DIARY_PASSWORD
    - 如果正确，用 HMAC-SHA256 签名生成 token
    - 设置 Set-Cookie 头
    - 返回 { success: true }

□ 3.4 响应结构兼容性测试
  - 对照 Phase 0 保存的 api-snapshots/ 逐个比对
  - 确认前端合约不变
```

验收：前端仅切换 API Host 后可运行核心流程。

---

### Phase 4：前端静态化改造（2-3 天）

🆕 比 v1 增加了 1 天预算，因为有框架升级和更多页面需要处理。

**执行步骤：**

```
□ 4.1 Next.js 升级（如果 Phase 1 确认走路径 A）
  - 升级 next, react, react-dom
  - 修复所有编译错误
  - antd CSS 引入方式调整

□ 4.2 移除/替换 fs 依赖
  所有 getStaticProps 中的 fs/readAllFile 调用需要改为：
  - 读取构建时生成的静态 JSON 文件
  - 或者在构建脚本中直接生成 props JSON

  需要修改的文件：
  - pages/index.js                    → getStaticProps 读静态 JSON
  - pages/[...slug].js                → getStaticPaths 生成所有路径，getStaticProps 读静态 JSON
  - pages/photographer/index.js       → getStaticProps 读静态 JSON      ← v1 遗漏
  - pages/photographer/[slug].js      → getStaticPaths + getStaticProps  ← v1 遗漏
  - pages/fake/index.js               → getStaticProps 读静态 JSON      ← v1 遗漏

□ 4.3 处理 fallback: true
  - [..slug].js 当前使用 fallback: true（按需生成页面）
  - 静态导出不支持 fallback: true
  - 方案：在 getStaticPaths 中返回所有文章路径 + 所有目录路径
  - 构建脚本需要生成完整的路径列表

□ 4.4 处理 revalidate
  - 所有 getStaticProps 中的 revalidate: 1 需要移除
  - 静态导出后内容更新需要重新构建部署

□ 4.5 替换 config.local.js
  - 将所有 require('../../config.local.js') 改为环境变量或构建时注入
  - 受影响文件：pages/api/posts.js, pages/[...slug].js,
    pages/photographer/[slug].js, components/util/imageUtils.js,
    components/SearchBar.js

□ 4.6 处理 imageUtils.js 硬编码路径
  - 替换 /Users/kounarushi/mycode/web-blog/public/.pic/ → /.pic/
  - 在 normalizeImagePath 中使用环境变量或构建时替换

□ 4.7 受保护内容改造（B 档）
  - getStaticPaths 排除 post/我的日记/ 下的所有路径
  - 受保护文章页面改为纯客户端渲染：
    * 先检查 /api/auth/check-diary
    * 认证通过后从 /api/posts/protected/:slug 获取完整内容
  - 构建时 posts 索引中受保护文章的 content_full 字段为空

□ 4.8 处理 middleware.js
  - 静态导出不支持 middleware
  - 删除或注释 middleware.js
  - 安全逻辑已在 Phase 3 迁移到 Worker

□ 4.9 验证所有页面
  - / （首页）
  - /post/Writings/car.md （文章页）
  - /post/Writings （目录页）
  - /photographer （摄影首页）        ← v1 遗漏
  - /photographer/city （分类页）      ← v1 遗漏
  - /photographer/order （预约页）     ← v1 遗漏
  - /auth/diary （密码验证页）         ← v1 遗漏
  - /fake （蜜罐页）                   ← v1 遗漏
```

验收：首页、文章页、目录页、摄影页、鉴权页在纯静态托管可访问。

---

### Phase 5：图片链路切换（1-2 天）

**执行步骤：**

```
□ 5.1 创建 scripts/sync-r2.mjs
  - 扫描 public/.pic/ → 上传到 R2 utopia-images/.pic/
  - 扫描 public/photography/ → 上传到 R2 utopia-images/photography/
  - 使用 @aws-sdk/client-s3（R2 兼容 S3 API）
  - 支持增量同步（检查 ETag / 文件大小）
  - ⚠️ 注意中文文件名的 URL 编码（如"大声道撒旦撒撒.png"）

□ 5.2 执行初始同步
  node scripts/sync-r2.mjs
  # 预计上传 637MB，取决于网速需要 10-30 分钟

□ 5.3 配置 R2 自定义域名
  images.gaochengzhi.com → R2 bucket

□ 5.4 在 Worker 中实现图片路由兼容
  /.pic/thumb/<path> → 302 到 /cdn-cgi/image/width=400,quality=60,format=auto/https://images.gaochengzhi.com/.pic/<path>
  /.pic/full/<path>  → 302 到 /cdn-cgi/image/quality=85,format=auto/https://images.gaochengzhi.com/.pic/<path>
  /.pic/<path>       → 302 到 https://images.gaochengzhi.com/.pic/<path>

  ⚠️ 注意处理 WaterfallCards.js 的嵌套路径：
  /.pic/thumb/.pic/xxx → 提取出 .pic/xxx，然后做 cdn-cgi 变换

□ 5.5 摄影页图片路径处理
  photographer/[slug].js 中有：
  item.path.replace(/^\/photography\//, config.IMAGE_SERVER_URL)
  迁移后需要指向 R2 域名或保持 /.pic/ 前缀

□ 5.6 压测验证
  - 首页文章缩略图加载
  - 摄影页灯箱大图加载
  - 移动端缩略图质量

□ 5.7 清理旧压缩脚本
  - scripts/generateCompressedImages.js 不再需要（cdn-cgi 自动处理）
  - package.json 中 "compress-images" 脚本可移除
  - sharp 依赖可移除（减少构建体积）
```

验收：缩略图和大图显示正确，原图不直接暴露，缓存命中率可观测。

---

### Phase 6：CI/CD 与灰度切流（1 天）

**执行步骤：**

```
□ 6.1 创建 .github/workflows/deploy-cloudflare.yml

  name: Deploy to Cloudflare
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]

  jobs:
    deploy:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'npm'
        - run: npm ci
        - run: npm run lint
        - run: npm run build
        - run: node scripts/build-content-index.mjs
        - run: npx wrangler d1 migrations apply utopia-db
          env:
            CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        - run: npx wrangler d1 execute utopia-db --file d1-seed.sql
          env:
            CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        - run: npx wrangler deploy
          env:
            CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        # PR 部署到 preview，main 部署到 production

□ 6.2 设置 GitHub Secrets
  CLOUDFLARE_API_TOKEN
  CLOUDFLARE_ACCOUNT_ID

□ 6.3 灰度验证
  - 先部署到 preview.gaochengzhi.com
  - 完整测试所有页面和 API
  - 检查图片加载
  - 检查搜索功能
  - 检查受保护内容访问
  - 检查浏览量计数

□ 6.4 域名切流
  - 确认 DNS 已经在 Cloudflare（如果没有，先迁移 DNS）
  - 将 gaochengzhi.com 的 A/CNAME 指向 Worker
  - 保留旧 VPS 的 IP 作为备用

□ 6.5 监控
  - Cloudflare Dashboard → Analytics 观察流量
  - 检查 Workers 错误率
  - 检查 D1 查询性能
```

验收：生产切流后 24 小时无 P1 故障。

---

## 11. 风险与回滚

### 11.1 主要风险

- 搜索结果与旧版本不一致（分词/高亮差异）。
- 受保护内容误暴露（静态导出阶段配置失误）。
- 图片路径兼容不完整导致历史文章断图。
- D1 索引脚本与线上 schema 不一致。

🆕 **补充风险项：**

- **Next.js 升级引入回归**：12 → 14 跨两个大版本，antd、markdown 渲染等可能出问题。建议单独分支做升级，完整回归测试后再合并。
- **中文路径/文件名编码**：`post/我的日记/`, `public/.pic/大声道撒旦撒撒.png` 等中文路径在 R2、CDN 变换链路中可能遇到编码问题。建议迁移脚本中统一 URL encode 并做映射表。
- **FTS5 中文分词**：SQLite FTS5 默认使用 unicode61 tokenizer，对中文的分词效果是**按字拆分**（每个字都是一个 token），可能导致搜索结果与 grep 不一致。可以接受，但需要告知用户搜索行为可能变化。
- **浏览量丢失**：当前 `public/pageviews.json` 只有 8 条记录（28 次总浏览），数据量很小。迁移时直接 seed 到 D1 即可，但要注意 POST 接口的并发安全（D1 的原子写可以保证）。
- **`/.pic/` 扁平目录 884 个文件**：R2 没有真正的目录层级（是 key-value 存储），扁平上传无问题。但如果通过 CDN 域名列出目录会暴露所有文件名，建议 R2 不开启公开列表功能。

### 11.2 回滚策略

- 域名层保留旧 VPS 回源规则（至少 2 周）。
- Worker 版本保留上一个稳定版本，一键 rollback（`wrangler rollback`）。
- 数据层导入采用"新表+切换视图"方式，避免直接覆盖。
- 🆕 DNS 切回：将 A 记录指回 `74.48.115.131`，TTL 已在 Phase 0 调低，生效时间 < 5 分钟。

---

## 12. 推荐分工（3 人并行）

- A（后端）：Worker API + D1 schema + 搜索 + **鉴权迁移（v1 遗漏）**。
- B（前端）：静态化改造 + API 兼容 + 受保护页面改造 + **摄影页面适配（v1 遗漏）**+ **Next.js 升级**。
- C（平台）：R2 图片迁移 + CI/CD + 域名与缓存规则 + **安全中间件迁移（v1 遗漏）**。

🆕 **并行依赖图：**

```
Phase 0 ─────────────────────┐
                              │
Phase 1 (C 主导) ────────────┤
                              │
Phase 2 (A 主导) ──────┐     │
                        │     │
Phase 3 (A 主导) ◄─────┘     │
                              │
Phase 4 (B 主导) ◄────────────┘ （需要 Phase 1 的 wrangler 配置 + Phase 2/3 的 API 就绪）
                              │
Phase 5 (C 主导) ◄────────────┘ （可与 Phase 4 并行）
                              │
Phase 6 (C 主导, 全员验收) ◄──┘
```

---

## 13. 首批交付清单（MVP）

- 静态首页/文章/摄影页可在 Cloudflare 访问。
- `/api/posts` 懒加载与当前体验一致。
- `/api/search` 可用且有速率限制。
- 图片 `thumb/full` 兼容 URL 可用。
- 发布流程可在 main 分支自动部署。
- 🆕 `/api/auth/*` 日记鉴权功能正常（v1 遗漏）。
- 🆕 `/photographer` 摄影页面正常运作（v1 遗漏）。
- 🆕 浏览量计数正常（GET/POST 均可用）。

---

## 附录 A：建议新增文件/目录（规划，不是本次改代码）

- `worker/src/index.ts`：Worker 路由入口
- `worker/src/routes/*.ts`：API 子路由
- `worker/src/routes/auth.ts`：🆕 鉴权路由（v1 遗漏）
- `worker/src/middleware/security.ts`：🆕 安全中间件（迁移自 middleware.js）
- `worker/src/middleware/rateLimit.ts`：🆕 限流中间件
- `worker/src/db/schema.sql`：D1 schema
- `scripts/build-content-index.mjs`：构建期索引脚本
- `scripts/sync-r2.mjs`：图片同步脚本
- `wrangler.toml`：Cloudflare 配置
- `.github/workflows/deploy-cloudflare.yml`：发布流水线
- 🆕 `api-snapshots/`：API 响应基线快照（Phase 0 生成）

## 附录 B：关键决策待确认

1. 受保护内容是否按 B 档（强保护）执行。是
2. 图片是否直接上 R2（推荐）还是先保留仓库静态资源。R2
3. 搜索返回结构是否立即从字符串升级为对象。是
4. 是否购买 Images Paid（若预计超过 5000 unique transforms/月）。否
5. 🆕 是否先升级 Next.js 12 → 14，还是直接用 `@cloudflare/next-on-pages` 保持 12。直接用 `@cloudflare/next-on-pages`
6. 🆕 是否保留 Ant Design（升级到 v5 或替换为 headless 方案）。否,用tailwindcss headless
7. 🆕 中文分词方案：是否接受 FTS5 默认的逐字拆分，还是引入 jieba 等分词器（需要 WASM 编译，复杂度高）。否

## 附录 C：🆕 现有代码文件迁移后处理清单

| 文件                                  | 迁移后状态                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `pages/api/posts.js`                  | 删除，逻辑迁移到 `worker/src/routes/posts.ts`                               |
| `pages/api/search.js`                 | 删除，逻辑迁移到 `worker/src/routes/search.ts`                              |
| `pages/api/paths.js`                  | 删除，逻辑迁移到 `worker/src/routes/paths.ts`                               |
| `pages/api/photography/[category].js` | 删除，迁移到 `worker/src/routes/photography.ts`                             |
| `pages/api/pageviews.js`              | 删除，迁移到 `worker/src/routes/pageviews.ts`                               |
| `pages/api/images/[...path].js`       | 删除，迁移到 `worker/src/routes/images.ts`                                  |
| `pages/api/thumbnails/[...path].js`   | 删除，迁移到 `worker/src/routes/images.ts`                                  |
| `pages/api/auth/check-diary.js`       | 删除，迁移到 `worker/src/routes/auth.ts`                                    |
| `pages/api/auth/verify-diary.js`      | 删除，迁移到 `worker/src/routes/auth.ts`                                    |
| `middleware.js`                       | 删除，迁移到 `worker/src/middleware/security.ts`                            |
| `lib/auth.js`                         | 保留前端部分（`isProtectedPath`, `maskContent`），鉴权验证逻辑迁移到 Worker |
| `lib/rateLimit.js`                    | 删除，迁移到 `worker/src/middleware/rateLimit.ts`                           |
| `lib/imageApiUtils.js`                | 删除，R2 代理不需要这些                                                     |
| `components/util/readAllfile.js`      | 仅保留构建脚本中的使用，运行时不再调用                                      |
| `components/util/getCategoryList.js`  | 仅保留构建脚本，运行时不再调用                                              |
| `components/util/imageUtils.js`       | 修改为纯前端使用，移除 `config.local.js` 依赖                               |
| `config.local.js`                     | 删除，替换为环境变量                                                        |
| `.env.local`                          | 迁移到 Worker Secrets                                                       |
| `deploy.sh / upload.sh / ...`         | 归档或删除                                                                  |
| `scripts/generateCompressedImages.js` | 删除（cdn-cgi 替代）                                                        |
| `nginx-security-example.conf`         | 归档（不再用 nginx）                                                        |
