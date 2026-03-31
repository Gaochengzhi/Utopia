# Utopia

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-orange?style=flat-square&logo=cloudflare)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

基于 **Next.js 15 + React 19** 构建的个人博客与摄影作品集，全栈运行在 **Cloudflare 边缘网络**（Workers + D1 + R2），无需传统服务器，支持增量内容更新。

**中文** | **[English](./README.md)**

---

<div align="center">

![主题展示](./public/readme-assets/theme-showcase.png)
*深浅主题界面*

![摄影作品集展示](./public/readme-assets/photography-showcase.png)
*摄影作品集*

![移动端展示](./public/readme-assets/mobile-showcase.png)
*响应式移动端体验*

</div>

## 主要特性

- **增量内容更新** — 新增文章无需重构整站（1-2 秒 vs 5-10 分钟）
- **无服务器架构** — 全栈运行于 Cloudflare Workers + D1 + R2 + Edge CDN，无 VPS
- **摄影作品集** — 自动目录发现、WebP 压缩、400px 缩略图生成、CDN 直连
- **沉浸式视效** — 摄影 Banner 的液态金 WebGL 动效、视差滚动、卡片微动画
- **全文搜索** — 基于 SQLite FTS5 的实时搜索，高亮结果
- **受保护内容** — 日记文章通过 HMAC-SHA256 Cookie 鉴权，SSG 阶段已掩码
- **深色/浅色模式** — 自动主题切换
- **响应式设计** — 桌面、平板、移动端全适配

<div align="center">
  <table>
    <tr>
      <td align="center" width="50%">
        <img src="./public/readme-assets/search-feature.gif" height="300" alt="搜索功能"/><br/>
        <sub><b>🔍 实时 FTS5 搜索</b></sub>
      </td>
      <td align="center" width="50%">
        <img src="./public/readme-assets/dark-light-mode.gif" height="300" alt="深浅主题"/><br/>
        <sub><b>🌗 深浅主题切换</b></sub>
      </td>
    </tr>
    <tr>
      <td align="center" width="50%">
        <img src="./public/readme-assets/animated-cards.gif" height="300" alt="动态卡片"/><br/>
        <sub><b>✨ 瀑布流动态卡片</b></sub>
      </td>
      <td align="center" width="50%">
        <img src="./public/readme-assets/photo-wall.gif" height="300" alt="照片墙"/><br/>
        <sub><b>🖼️ 照片墙展示</b></sub>
      </td>
    </tr>
  </table>
</div>

## 与传统博客对比

| 功能         | 传统博客                    | Utopia                          |
| ------------ | --------------------------- | ------------------------------- |
| 添加新文章   | 重构整个站点                | 仅增量同步（R2 + D1）           |
| 发布时间     | 5-10 分钟                   | 1-2 秒                          |
| 停机时间     | 30-60 秒                    | 0 秒                            |
| 内容工作流   | Git 提交 → CI/CD → 部署     | 本地写 → `./upload.sh` → 上线   |
| 服务器运维   | VPS / PM2                   | 无需（Cloudflare Serverless）   |

---

## 技术栈

| 层级         | 技术                                                                      |
| ------------ | ------------------------------------------------------------------------- |
| **框架**     | Next.js 15（Pages Router）+ React 19                                      |
| **样式**     | Tailwind CSS 3 + 自定义 CSS（`styles/globals.css`）                       |
| **视觉效果** | WebGL（`LiquidGoldCanvas`）、react-photo-view 灯箱、视差滚动             |
| **内容渲染** | react-markdown + remark-gfm + remark-math + rehype-katex + rehype-raw    |
| **数据库**   | Cloudflare D1（SQLite）— 文章元数据、FTS5 全文索引、摄影索引、页面浏览量 |
| **对象存储** | Cloudflare R2 — 完整 Markdown、博客图片、摄影原图/缩略图/分类封面        |
| **计算**     | Cloudflare Workers（via `opennextjs-cloudflare` 适配器）                  |
| **CDN**      | Cloudflare Edge + R2 公开域名，1 年边缘 TTL                               |
| **构建**     | `opennextjs-cloudflare` → Wrangler 部署                                   |
| **图片处理** | `sharp`（WebP 转换、压缩、400px 缩略图生成）                              |
| **鉴权**     | HMAC-SHA256 签名 Cookie（Web Crypto API），7 天 TTL                       |

---

## 项目结构

```
├── components/
│   ├── main/                  # 博客：FileTree, PostList, WaterfallCards
│   ├── photo/                 # 摄影：Banner, Wall, LiquidGoldCanvas, cataContainer
│   └── util/                  # 工具函数
├── lib/
│   ├── data/                  # 数据访问层（DAL）
│   │   ├── paths.js           #   路径树查询
│   │   ├── posts.js           #   文章查询
│   │   └── photos.js          #   摄影查询
│   ├── cdnUrl.js              # CDN URL 生成（单一来源）
│   ├── cfContext.js           # Cloudflare D1/R2 绑定助手
│   ├── imageProxy.js          # 图片代理（R2 读取 + CDN 重定向）
│   ├── photoUtils.js          # 摄影工具函数
│   ├── auth.js                # HMAC Cookie 鉴权
│   └── rateLimit.js           # 速率限制
├── pages/
│   ├── index.js               # 首页（侧边栏 + 瀑布流卡片）
│   ├── [...slug].js           # 动态博客路由（Markdown 渲染）
│   ├── api/                   # API 路由（posts, search, paths, auth, photography, images）
│   ├── photographer/          # 摄影页（首页、分类页、预约页）
│   └── auth/                  # 日记登录页
├── scripts/
│   ├── build-content-index.mjs    # 扫描 post/ → d1-seed.sql
│   ├── optimize-images.mjs        # 图片压缩 + WebP + 缩略图 + R2 同步
│   ├── sync-r2.mjs                # R2 文件同步（S3 API）
│   ├── d1-schema.sql              # D1 表结构定义
│   ├── d1-seed-remote.sh          # 分块上传 SQL 至 D1
│   └── purge-cloudflare-cache.mjs # 清除边缘缓存
├── post/                      # 博客内容（Markdown，按分类目录组织）
├── public/
│   ├── .pic/                  # 博客图片（同步至 R2）
│   └── photography/           # 摄影（content/, thumb/, cata/, banner/）
├── styles/globals.css         # 全局样式
├── wrangler.toml              # Cloudflare Worker 配置
├── deploy.sh                  # 完整部署脚本
└── upload.sh                  # 内容增量同步脚本
```

---

## 从零部署教程

> 以下步骤针对**第一次部署**。适用于想用此项目搭建自己博客的用户。

### 第一步：前置准备

| 工具           | 要求                   | 安装方式                        |
| -------------- | ---------------------- | ------------------------------- |
| Node.js        | 18+                    | https://nodejs.org              |
| npm            | 随 Node.js             | —                               |
| Git            | 任意版本               | https://git-scm.com             |
| Cloudflare 账号 | 免费账号即可           | https://cloudflare.com          |
| Wrangler CLI   | 最新版                 | `npm install -g wrangler`       |

---

### 第二步：Clone 并安装依赖

```bash
git clone https://github.com/Gaochengzhi/Utopia.git
cd Utopia
npm install
```

---

### 第三步：Cloudflare 资源创建

#### 3.1 创建 D1 数据库

```bash
npx wrangler login          # 首次登录，浏览器授权
npx wrangler d1 create utopia-db
```

> 记录输出中的 `database_id`，填入下一步。

#### 3.2 创建 R2 存储桶

```bash
npx wrangler r2 bucket create utopia-images
```

#### 3.3 创建 R2 API Token（用于脚本上传）

1. 进入 [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → **Manage R2 API Tokens**
2. 创建 Token，权限选 **Object Read & Write**，选择 `utopia-images` 桶
3. 记录 **Account ID**、**Access Key ID**、**Secret Access Key**

#### 3.4 创建 Cloudflare API Token（用于部署和缓存清除）

1. 进入 [API Tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**
2. 使用 **Edit Cloudflare Workers** 模板，记录生成的 Token
3. 如需自动清除 CDN 缓存，追加一个 **Zone Cache Purge** 权限的 Token

---

### 第四步：配置 `wrangler.toml`

将 `database_id` 更新为第三步中获取的 ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "utopia-db"
database_id = "<your-d1-database-id>"   # ← 替换此处

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "utopia-images"

[vars]
NEXT_PUBLIC_R2_CDN_URL = "https://your-cdn-domain.com"  # ← 替换为你的 CDN 域名
```

如果暂时没有自定义 CDN 域名，`NEXT_PUBLIC_R2_CDN_URL` 可先留空，图片将通过 Worker 代理访问（性能较低但功能正常）。

---

### 第五步：配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
# Cloudflare D1
D1_DATABASE_NAME=utopia-db
D1_DATABASE_ID=<your-d1-database-id>

# Cloudflare R2（S3 兼容 API）
R2_ACCOUNT_ID=<your-cloudflare-account-id>
R2_ACCESS_KEY_ID=<your-r2-access-key-id>
R2_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
R2_BUCKET_NAME=utopia-images

# CDN 公开域名（如暂无可留空）
NEXT_PUBLIC_R2_CDN_URL=https://cdn.yourdomain.com

# 开发环境本地图片降级（可选）
NEXT_PUBLIC_ENABLE_LOCAL_ORIGIN_FALLBACK=false

# 日记密码（保护私密文章）
DIARY_PASSWORD=<your-password>
HMAC_SECRET=<random-secret-string>
```

> **安全提示**：`.env` 已在 `.gitignore` 中，不会被提交到 Git。

---

### 第六步：初始化 D1 数据库结构

```bash
# 创建表结构（posts, photos, path_tree, pageviews, FTS 虚拟表）
npx wrangler d1 execute utopia-db --remote --file scripts/d1-schema.sql
```

---

### 第七步：添加你的内容

#### 博客文章

在 `post/{分类名}/` 目录下创建 `.md` 文件，例如 `post/技术/hello-world.md`：

```markdown
---
title: "第一篇文章"
date: "2024-01-01"
description: "欢迎来到我的博客"
tags: ["生活", "技术"]
---

# 正文从这里开始

内容支持 GFM、数学公式（LaTeX）、代码高亮等。
```

#### 摄影作品

将图片放入对应目录：

```
public/photography/content/{分类名}/{图片文件}
public/photography/cata/{分类名}.webp    # 分类封面（可选）
public/photography/banner/1.jpg          # Banner 轮播图（1.jpg ~ 5.jpg）
```

---

### 第八步：首次内容同步到 Cloudflare

```bash
./upload.sh
```

这一步会并行执行：
- **图片优化**：压缩图片、生成 WebP 格式、生成 400px 缩略图，上传至 R2
- **文章同步**：Markdown 文件上传至 R2 的 `post/` 前缀
- **索引构建**：扫描所有文章生成 SQLite 元数据，上传至 D1

---

### 第九步：本地开发验证

```bash
npm run dev    # 启动开发服务器（localhost:3000）
```

> 开发服务器会通过 `initOpenNextCloudflareForDev()` 自动连接 Wrangler 本地绑定的 D1/R2，**不需要单独启动 Workers 服务**。

---

### 第十步：构建并部署到 Cloudflare Workers

```bash
./deploy.sh --code-only    # 仅部署代码（内容已在第八步同步）
# 或者
./deploy.sh                # 完整部署（内容 + 构建 + 部署 + 清缓存）
```

部署完成后，你的站点会运行在：
- `https://<your-worker>.workers.dev`（Wrangler 默认域名）
- 配置自定义域名后：`https://yourdomain.com`

---

### 第十一步：配置自定义域名（可选）

1. 在 Cloudflare Dashboard → **Workers & Pages** → 你的 Worker → **Triggers** → **Custom Domains** 添加域名
2. 或在 `wrangler.toml` 中配置 `routes`：

```toml
routes = [
  { pattern = "yourdomain.com/*", zone_name = "yourdomain.com" },
  { pattern = "www.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

---

### 第十二步：配置 R2 公开 CDN（推荐）

为摄影图片和博客图片启用 CDN 直连可大幅减少 Worker 调用成本：

1. 进入 Cloudflare Dashboard → **R2** → `utopia-images` → **Settings** → **Public Access**
2. 添加自定义域名（如 `cdn.yourdomain.com`）
3. 推荐配置：
   - **Cache Rule**：Cache Everything，边缘 TTL 1 年，浏览器 TTL 1 个月
   - **Smart Tiered Cache**：开启，减少 Cache MISS 成本
4. 将 `.env` 和 `wrangler.toml` 中的 `NEXT_PUBLIC_R2_CDN_URL` 更新为该域名，重新部署

---

## 日常内容更新工作流

### 发布新文章

```bash
# 1. 在 post/ 目录写好 Markdown
# 2. 增量同步（约 1-2 秒上线）
./upload.sh                    # 同步所有内容
./upload.sh --articles-only    # 仅同步文章（跳过图片处理）
./upload.sh --skip-d1          # 仅同步文件，不更新 D1
./upload.sh --dry-run          # 预览将要发生的变更
```

### 完整部署命令参考

```bash
./deploy.sh                    # 完整部署（内容 + 代码构建 + 部署 + 清缓存）
./deploy.sh --code-only        # 仅重新构建部署 Worker（内容不变时使用）
./deploy.sh --content-only     # 仅同步内容（等同于 upload.sh）
./deploy.sh --dry-run          # 预览所有变更，不执行
```

### 图片处理工具

```bash
node scripts/optimize-images.mjs               # 压缩 + 同步至 R2（默认增量）
node scripts/optimize-images.mjs --dry-run     # 预览变更
node scripts/optimize-images.mjs --force       # 强制全量重处理
node scripts/optimize-images.mjs --scope blog         # 仅博客图片
node scripts/optimize-images.mjs --scope photography  # 仅摄影图片
node scripts/optimize-images.mjs --no-sync     # 仅本地压缩，不上传 R2
```

---

## 架构说明

### 基础设施总览

```
┌──────── 本地机器 ────────┐     ┌──────── Cloudflare 边缘 ──────────┐
│                          │     │                                    │
│ post/        Markdown    │ ──→ │  D1 (SQLite)  元数据 + FTS 索引   │
│ public/.pic/ 博客图片    │ ──→ │  R2 (S3)      完整内容 + 图片     │
│ public/photography/ 照片 │ ──→ │  Worker       Next.js SSR/API     │
│                          │     │  CDN Edge     cdn.yourdomain.com  │
└──────────────────────────┘     └────────────────────────────────────┘
```

### 存储分布

| 存储            | 内容                                                                     | 访问方式                              |
| --------------- | ------------------------------------------------------------------------ | ------------------------------------- |
| **D1**          | `posts`（元数据 + 1500 字预览 + FTS）、`photos`、`path_tree`、`pageviews` | Worker API 查询                       |
| **R2**          | 完整 Markdown、博客图片、摄影原图/缩略图/分类封面                        | CDN 直连（生产）或 Worker 代理（开发）|
| **Worker Assets** | HTML/JS/CSS（不含大图）                                                | Cloudflare Edge                       |
| **Edge CDN**    | CDN 自定义域名 → R2 公开桶                                               | 边缘缓存，1 年 TTL                    |

### CI/CD（GitHub Actions）

```yaml
# .github/workflows/deploy-cloudflare.yml
CI（push/PR）：checkout → npm ci → build-content-index → cf:build（仅验证）
手动部署：     checkout → npm ci → build-content-index → cf:build → wrangler deploy → 清缓存
```

> **重要**：GitHub Actions **只部署代码**，不负责更新 D1 数据/摄影索引。内容发布必须通过本地 `./upload.sh` 完成。

### 安全机制

- **中间件** (`middleware.js`)：拦截扫描探针、恶意 UA，添加安全响应头
- **路径遍历防护**：API 路由校验 `..` 和 `//` 攻击
- **HMAC Token**：通过 Web Crypto API 签发，防伪造
- **速率限制**：`lib/rateLimit.js`

---

## 配置参考

### 核心配置文件

| 文件                  | 用途                                              |
| --------------------- | ------------------------------------------------- |
| `wrangler.toml`       | Cloudflare Worker 绑定（D1, R2, 路由, 环境变量） |
| `.env`                | 本地脚本使用的凭证（不提交 Git）                  |
| `next.config.js`      | Next.js 配置、图片 rewrite、Cloudflare 本地绑定  |
| `open-next.config.ts` | OpenNext Cloudflare Workers 适配器配置            |
| `tailwind.config.js`  | Tailwind CSS 自定义                               |
| `config.local.js`     | 站点信息（社交链接、域名等）                      |

---

## 贡献

1. Fork 仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 进行修改
4. 本地测试：`npm run dev`
5. 提交 Pull Request

---

## 许可证

MIT License — 详见 [LICENSE](LICENSE) 文件。

---

使用 Next.js、Cloudflare 与 ❤️ 制作
