# Utopia

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-orange?style=flat-square&logo=cloudflare)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

A personal blog and photography portfolio built with **Next.js 15 + React 19**, running entirely on **Cloudflare's edge network** (Workers + D1 + R2). No traditional servers required. Supports incremental content updates without full rebuilds.

**[中文版本](./README_CN.md)** | **English**

---

<div align="center">

![Theme Showcase](./public/readme-assets/theme-showcase.png)
*Light and Dark theme interface*

![Photography Showcase](./public/readme-assets/photography-showcase.png)
*Photography portfolio*

![Mobile Showcase](./public/readme-assets/mobile-showcase.png)
*Responsive mobile experience*

</div>

## Key Features

- **Incremental Content Updates** — Add new posts without rebuilding the entire site (1-2 seconds vs 5-10 minutes)
- **Serverless Architecture** — Runs entirely on Cloudflare Workers + D1 + R2 + Edge CDN. No VPS needed.
- **Photography Portfolio** — Auto-discovers categories, auto-compresses images, generates WebP thumbnails, CDN-direct delivery
- **Immersive Visuals** — Liquid Gold WebGL effect (`LiquidGoldCanvas`) in the photography banner, parallax scrolling, card micro-animations
- **Full-text Search** — SQLite FTS5 powered real-time search with highlighted results
- **Protected Content** — Diary entries behind HMAC-SHA256 Cookie auth; content masked at SSG stage
- **Dark/Light Mode** — Automatic theme switching
- **Responsive Design** — Desktop, tablet, and mobile

<div align="center">
  <table>
    <tr>
      <td align="center" width="50%">
        <img src="./public/readme-assets/search-feature.gif" height="300" alt="Search Feature"/><br/>
        <sub><b>🔍 Real-time FTS5 Search</b></sub>
      </td>
      <td align="center" width="50%">
        <img src="./public/readme-assets/dark-light-mode.gif" height="300" alt="Dark/Light Mode"/><br/>
        <sub><b>🌗 Dark/Light Mode</b></sub>
      </td>
    </tr>
    <tr>
      <td align="center" width="50%">
        <img src="./public/readme-assets/animated-cards.gif" height="300" alt="Animated Cards"/><br/>
        <sub><b>✨ Animated Waterfall Cards</b></sub>
      </td>
      <td align="center" width="50%">
        <img src="./public/readme-assets/photo-wall.gif" height="300" alt="Photo Wall"/><br/>
        <sub><b>🖼️ Photography Wall</b></sub>
      </td>
    </tr>
  </table>
</div>

## Quick Comparison

| Feature          | Traditional Blogs           | Utopia                          |
| ---------------- | --------------------------- | ------------------------------- |
| Add new post     | Rebuild entire site         | Incremental sync only (R2 + D1) |
| Publishing time  | 5-10 minutes                | 1-2 seconds                     |
| Downtime         | 30-60 seconds               | 0 seconds                       |
| Content workflow | Git commit → CI/CD → Deploy | Local write → `./upload.sh` → Live |
| Server ops       | VPS / PM2                   | None (Cloudflare Serverless)    |

---

## Tech Stack

| Layer          | Technology                                                                    |
| -------------- | ----------------------------------------------------------------------------- |
| **Framework**  | Next.js 15 (Pages Router) + React 19                                          |
| **Styling**    | Tailwind CSS 3 + custom CSS (`styles/globals.css`)                            |
| **Visuals**    | WebGL (`LiquidGoldCanvas`), react-photo-view lightbox, parallax scrolling     |
| **Content**    | react-markdown + remark-gfm + remark-math + rehype-katex + rehype-raw        |
| **Database**   | Cloudflare D1 (SQLite) — metadata, FTS5 index, photo index, page views       |
| **Storage**    | Cloudflare R2 — full Markdown, blog images, photo originals/thumbs/covers    |
| **Compute**    | Cloudflare Workers (via `opennextjs-cloudflare` adapter)                      |
| **CDN**        | Cloudflare Edge + R2 public domain, 1-year edge TTL                          |
| **Build**      | `opennextjs-cloudflare` → Wrangler deploy                                     |
| **Images**     | `sharp` (WebP conversion, compression, 400px thumbnail generation)            |
| **Auth**       | HMAC-SHA256 signed Cookie (Web Crypto API), 7-day TTL                        |

---

## Project Structure

```
├── components/
│   ├── main/                  # Blog: FileTree, PostList, WaterfallCards
│   ├── photo/                 # Photography: Banner, Wall, LiquidGoldCanvas, cataContainer
│   └── util/                  # Utility functions
├── lib/
│   ├── data/                  # Data Access Layer (DAL)
│   │   ├── paths.js           #   Path tree queries
│   │   ├── posts.js           #   Post queries
│   │   └── photos.js          #   Photography queries
│   ├── cdnUrl.js              # CDN URL generation (single source of truth)
│   ├── cfContext.js           # Cloudflare D1/R2 binding helper
│   ├── imageProxy.js          # Image proxy (R2 read + CDN redirect)
│   ├── photoUtils.js          # Photography utility functions
│   ├── auth.js                # HMAC Cookie auth
│   └── rateLimit.js           # Rate limiting
├── pages/
│   ├── index.js               # Homepage (sidebar + waterfall cards)
│   ├── [...slug].js           # Dynamic blog routing (Markdown render)
│   ├── api/                   # API routes (posts, search, paths, auth, photography, images)
│   ├── photographer/          # Photography pages (index, [slug], order)
│   └── auth/                  # Diary login page
├── scripts/
│   ├── build-content-index.mjs    # Scan post/ → d1-seed.sql
│   ├── optimize-images.mjs        # Compress + WebP + thumbnail + R2 sync
│   ├── sync-r2.mjs                # R2 file sync (S3 API)
│   ├── d1-schema.sql              # D1 table schema
│   ├── d1-seed-remote.sh          # Chunked SQL upload to D1
│   └── purge-cloudflare-cache.mjs # Purge edge cache
├── post/                      # Blog content (Markdown, organized by category)
├── public/
│   ├── .pic/                  # Blog images (synced to R2)
│   └── photography/           # Photos (content/, thumb/, cata/, banner/)
├── styles/globals.css         # Global styles
├── wrangler.toml              # Cloudflare Worker config
├── deploy.sh                  # Full deployment script
└── upload.sh                  # Incremental content sync script
```

---

## From-Scratch Deployment Guide

> The following steps walk you through deploying your own instance from zero.

### Step 1: Prerequisites

| Tool             | Requirement         | Install                         |
| ---------------- | ------------------- | ------------------------------- |
| Node.js          | 18+                 | https://nodejs.org              |
| npm              | (bundled with Node) | —                               |
| Git              | Any version         | https://git-scm.com             |
| Cloudflare account | Free plan works   | https://cloudflare.com          |
| Wrangler CLI     | Latest              | `npm install -g wrangler`       |

---

### Step 2: Clone and Install

```bash
git clone https://github.com/Gaochengzhi/Utopia.git
cd Utopia
npm install
```

---

### Step 3: Create Cloudflare Resources

#### 3.1 Create D1 Database

```bash
npx wrangler login          # First-time browser auth
npx wrangler d1 create utopia-db
```

> Note the `database_id` from the output — you'll need it in the next step.

#### 3.2 Create R2 Bucket

```bash
npx wrangler r2 bucket create utopia-images
```

#### 3.3 Create R2 API Token (for upload scripts)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → **Manage R2 API Tokens**
2. Create a token with **Object Read & Write** permission, scoped to `utopia-images`
3. Save the **Account ID**, **Access Key ID**, and **Secret Access Key**

#### 3.4 Create Cloudflare API Token (for deploy + cache purge)

1. Go to [API Tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**
2. Use the **Edit Cloudflare Workers** template; save the token
3. Optionally create a second token with **Zone Cache Purge** permission for automated cache clearing

---

### Step 4: Configure `wrangler.toml`

Replace the `database_id` with yours:

```toml
name = "utopia-blog"
compatibility_date = "2026-03-28"
compatibility_flags = ["nodejs_compat"]
main = ".open-next/worker.js"

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[[d1_databases]]
binding = "DB"
database_name = "utopia-db"
database_id = "<your-d1-database-id>"   # ← replace this

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "utopia-images"

[vars]
NEXT_PUBLIC_IMAGE_URL = "/.pic/"
NEXT_PUBLIC_R2_CDN_URL = "https://cdn.yourdomain.com"  # ← your CDN domain

routes = [
  { pattern = "yourdomain.com/*", zone_name = "yourdomain.com" },
  { pattern = "www.yourdomain.com/*", zone_name = "yourdomain.com" }
]
workers_dev = true
```

If you don't have a CDN domain yet, you can leave `NEXT_PUBLIC_R2_CDN_URL` empty — images will be proxied through the Worker (functional but slower).

---

### Step 5: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Cloudflare D1
D1_DATABASE_NAME=utopia-db
D1_DATABASE_ID=<your-d1-database-id>

# Cloudflare R2 (S3-compatible API)
R2_ACCOUNT_ID=<your-cloudflare-account-id>
R2_ACCESS_KEY_ID=<your-r2-access-key-id>
R2_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
R2_BUCKET_NAME=utopia-images

# CDN public domain (leave empty if you don't have one yet)
NEXT_PUBLIC_R2_CDN_URL=https://cdn.yourdomain.com

# Optional: fallback to local origin if CDN image fails
NEXT_PUBLIC_ENABLE_LOCAL_ORIGIN_FALLBACK=false

# Diary password (protects private posts)
DIARY_PASSWORD=<your-password>
HMAC_SECRET=<random-secret-string>
```

> **Security note**: `.env` is already in `.gitignore` and will never be committed.

---

### Step 6: Initialize D1 Database Schema

```bash
npx wrangler d1 execute utopia-db --remote --file scripts/d1-schema.sql
```

This creates the `posts`, `photos`, `path_tree`, `pageviews` tables and the FTS5 virtual table with auto-sync triggers.

---

### Step 7: Add Your Content

#### Blog Posts

Create `.md` files in `post/{Category}/`, e.g. `post/Tech/hello-world.md`:

```markdown
---
title: "My First Post"
date: "2024-01-01"
description: "Welcome to my blog"
tags: ["life", "tech"]
---

# Start writing here

Supports GFM, LaTeX math, syntax highlighting, and raw HTML.
```

#### Photography

Place images in the appropriate directories:

```
public/photography/content/{Category}/{image file}
public/photography/cata/{Category}.webp    # Category cover (optional)
public/photography/banner/1.jpg            # Banner carousel (1.jpg – 5.jpg)
```

---

### Step 8: First Content Sync to Cloudflare

```bash
./upload.sh
```

This runs three tasks in parallel:
- **Image optimization**: Compress, convert to WebP, generate 400px thumbnails → upload to R2
- **Article sync**: Upload Markdown files to R2 (`post/` prefix)
- **Index build**: Scan all posts, generate SQLite metadata → upload to D1 (chunked)

---

### Step 9: Local Development Verification

```bash
npm run dev    # Start dev server at localhost:3000
```

The dev server automatically connects to your Wrangler local D1/R2 bindings via `initOpenNextCloudflareForDev()`. No separate Worker service needed.

---

### Step 10: Build and Deploy to Cloudflare Workers

```bash
./deploy.sh --code-only    # Deploy code only (content already synced in Step 8)
# or
./deploy.sh                # Full deploy: content sync + build + deploy + cache purge
```

After deployment, your site is live at:
- `https://<your-worker>.workers.dev` (Wrangler default domain)
- Your custom domain (once configured)

---

### Step 11: Configure Custom Domain (Optional)

**Option A** — Cloudflare Dashboard:
1. Go to **Workers & Pages** → your Worker → **Triggers** → **Custom Domains** → Add domain

**Option B** — `wrangler.toml` routes (already shown in Step 4):
```toml
routes = [
  { pattern = "yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

---

### Step 12: Set Up R2 CDN Public Access (Recommended)

Enabling CDN direct access for images drastically reduces Worker invocation costs:

1. Go to Cloudflare Dashboard → **R2** → `utopia-images` → **Settings** → **Public Access**
2. Add a custom domain (e.g. `cdn.yourdomain.com`)
3. Recommended cache rules:
   - **Cache Everything**, Edge TTL: 1 year, Browser TTL: 1 month
   - **Smart Tiered Cache**: Enabled (reduces R2 egress on cache miss)
4. Update `NEXT_PUBLIC_R2_CDN_URL` in `.env` and `wrangler.toml`, then redeploy

---

## Day-to-Day Content Workflow

### Publishing a New Post

```bash
# 1. Write your Markdown in post/
# 2. Sync (live in ~1-2 seconds)
./upload.sh                    # Sync all content
./upload.sh --articles-only    # Articles only (skips image processing)
./upload.sh --skip-d1          # Sync files only, skip D1 update
./upload.sh --dry-run          # Preview changes without executing
```

### Full Deploy Command Reference

```bash
./deploy.sh                    # Full deploy (content + build + deploy + purge cache)
./deploy.sh --code-only        # Rebuild and deploy Worker only (no content changes)
./deploy.sh --content-only     # Content sync only (same as upload.sh)
./deploy.sh --dry-run          # Preview everything, no changes made
```

### Image Tools

```bash
node scripts/optimize-images.mjs               # Compress + sync to R2 (incremental)
node scripts/optimize-images.mjs --dry-run     # Preview changes
node scripts/optimize-images.mjs --force       # Force full reprocessing
node scripts/optimize-images.mjs --scope blog         # Blog images only
node scripts/optimize-images.mjs --scope photography  # Photography only
node scripts/optimize-images.mjs --no-sync     # Local compress only, skip R2 upload
```

---

## Architecture & Data Flow

### Infrastructure Overview

```
┌────────── Local Machine ──────────┐     ┌───────── Cloudflare Edge ─────────┐
│                                   │     │                                   │
│  post/             Markdown       │ ──→ │  D1 (SQLite)  Metadata + FTS     │
│  public/.pic/      Blog images    │ ──→ │  R2 (S3)      Full content+images│
│  public/photography/ Photos       │ ──→ │  Worker       Next.js SSR/API    │
│                                   │     │  CDN Edge     cdn.yourdomain.com │
└───────────────────────────────────┘     └───────────────────────────────────┘
```

### Storage Distribution

| Storage          | Contents                                                                    | Access                                 |
| ---------------- | --------------------------------------------------------------------------- | -------------------------------------- |
| **D1**           | `posts` (metadata + 1500-char preview + FTS), `photos`, `path_tree`, `pageviews` | Worker API queries                |
| **R2**           | Full Markdown, blog images, photo originals/thumbnails/covers               | CDN direct (prod) or Worker proxy (dev)|
| **Worker Assets** | HTML/JS/CSS (no large images)                                              | Cloudflare Edge                        |
| **Edge CDN**     | Custom CDN domain → R2 public bucket                                        | Edge cache, 1-year TTL                 |

### Build & Deploy Pipeline

```
deploy.sh
├── Phase 1: upload.sh (content sync, parallel)
│   ├── Task A: optimize-images.mjs → compress + sync images to R2
│   ├── Task B: sync-r2.mjs --dir post → sync Markdown to R2
│   ├── Task C: build-content-index.mjs → generate d1-seed.sql
│   └── Serial: d1-seed-remote.sh → upload SQL to D1 (~800KB chunks)
│
├── Phase 2: cf:build (opennextjs-cloudflare → .open-next/)
├── Phase 3: wrangler deploy (Worker + Assets to Cloudflare)
└── Phase 4: purge-cloudflare-cache.mjs (purge edge cache)
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy-cloudflare.yml
CI (push/PR):    checkout → npm ci → build-content-index → cf:build  (validate only)
Deploy (manual): checkout → npm ci → build-content-index → cf:build → wrangler deploy → purge cache
```

> **Important**: GitHub Actions **only deploys code**. D1 content (post metadata, FTS index, photo index) is always updated locally via `./deploy.sh` or `./upload.sh`. This is intentional — the content index build relies on local file timestamps and full content.

### Data Access Layer (DAL)

All D1 query logic is centralized in `lib/data/`, shared between SSG and API routes:

```
lib/data/
├── paths.js   # getPathTree(), getTopLevelFolders(), getFolderContents()
├── posts.js   # getPaginatedPosts(), maskContent(), transformPostRows()
└── photos.js  # getLatestPhotos(), getPhotoCategories(), getPhotosByCategory()
```

### Image Serving Architecture

```
[Primary — CDN direct, no Worker cost]
  <img src="https://cdn.yourdomain.com/photography/thumb/...">
       ↓
  Cloudflare Edge → Cache HIT → instant response
                  → Cache MISS → R2 Public Bucket → cache → response

[Fallback — Worker proxy, dev/degraded mode only]
  <img src="/.pic/post/image.webp">
       ↓ (next.config.js rewrite, only when NEXT_PUBLIC_R2_CDN_URL is unset)
  /api/images/[...path] → lib/imageProxy.serveImage()
       → CDN_URL set? → 301 redirect to CDN
       → No CDN → R2.get() → WebP fallback → arrayBuffer → response
       → No R2  → local filesystem fallback (dev only)
```

Frontend uses `lib/cdnUrl.js` to generate CDN URLs:
- `getCdnUrl()` — general CDN URL
- `getCdnThumbUrl()` — photography thumbnail
- `getCdnFullUrl()` — photography full-size
- `getCdnCataThumbUrl()` — category cover image
- `handleCdnError()` — `<img>` onError fallback handler

### Page Data Flow

#### Homepage (`pages/index.js`)
```
SSG → getPathTree(db)           → directory tree (sidebar FileTree)
    → getPaginatedPosts(db, 10) → first 10 posts (WaterfallCards)
    → getTopLevelFolders(db)    → top-level folders (FolderList)

Client → /api/auth/check-diary → auth state
       → (if authenticated) re-fetch posts to unmask protected content
```

#### Blog Article (`pages/[...slug].js`)
```
SSG → D1.posts(slug) → metadata
    → R2.get(slug)   → full Markdown → strip frontmatter → normalizeImagePath

Protected posts: content masked with '*' at SSG stage
              → Client auth → /api/posts/protected/[slug] → R2 → real content
```

#### Photography Index (`pages/photographer/index.js`)
```
SSG → getLatestPhotos(db, 50)  → latest photos (Wall)
    → getPhotoCategories(db)   → category list + covers (cataContainer)
```

#### Photography Category (`pages/photographer/[slug].js`)
```
SSG → getPhotosByCategory(db, slug) → all images in category
    → getPhotoCategories(db)        → category nav
```

### Search System

```
Client → /api/search?query=xxx → D1.posts_fts (FTS5 MATCH) → highlighted results
                               → fallback: D1.posts (LIKE)  → plain results
```

- SQLite FTS5 virtual table for full-text indexing
- Auto-sync triggers keep FTS index up to date
- Results formatted as `filepath:lineNumber:content` for SearchBar compatibility
- Protected content masked for unauthenticated users

### Authentication

Protected content (posts in the `我的日记/` folder):

```
Login:  /auth/diary → /api/auth/verify-diary → HMAC-SHA256 Cookie (7-day TTL)
Check:  /api/auth/check-diary → verify cookie → { authenticated: true/false }
Access: /api/posts/protected/[slug] → verify cookie → R2.get() → full content
```

### Security

- **Middleware** (`middleware.js`): Blocks scanner probes (`.php`, `wp-admin`, etc.), malicious UAs, adds security headers
- **Path traversal protection**: All API routes validate against `..` and `//`
- **Auth tokens**: HMAC-SHA256 via Web Crypto API
- **Rate limiting**: Available via `lib/rateLimit.js`

---

## Configuration Reference

### Environment Variables (`.env`)

```bash
# Cloudflare D1
D1_DATABASE_NAME=utopia-db
D1_DATABASE_ID=<your-database-id>

# Cloudflare R2
R2_ACCOUNT_ID=<your-account-id>
R2_ACCESS_KEY_ID=<your-access-key>
R2_SECRET_ACCESS_KEY=<your-secret>
R2_BUCKET_NAME=utopia-images

# CDN public domain
NEXT_PUBLIC_R2_CDN_URL=https://cdn.yourdomain.com

# Optional
NEXT_PUBLIC_ENABLE_LOCAL_ORIGIN_FALLBACK=false

# App auth
DIARY_PASSWORD=<your-password>
HMAC_SECRET=<random-secret-string>
```

### Core Config Files

| File                  | Purpose                                             |
| --------------------- | --------------------------------------------------- |
| `wrangler.toml`       | Cloudflare Worker bindings (D1, R2, routes, vars)   |
| `next.config.js`      | Next.js config, image rewrites, CF dev bindings     |
| `open-next.config.ts` | OpenNext Cloudflare Workers adapter config          |
| `tailwind.config.js`  | Tailwind CSS customization                          |
| `config.local.js`     | Site info (social links, domain, etc.)              |

### R2 CDN Configuration

The R2 bucket (`utopia-images`) is publicly accessible via your CDN domain:

- **Cache Rule**: Cache Everything, 1-year Edge TTL, 1-month Browser TTL
- **CORS**: Allow `yourdomain.com`, `www.yourdomain.com`, `localhost:3000`
- **Smart Tiered Cache**: Reduces Cache MISS rate

| R2 Key                                       | CDN URL                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `photography/thumb/City/photo.webp`          | `https://cdn.yourdomain.com/photography/thumb/City/photo.webp`    |
| `photography/content/City/photo.webp`        | `https://cdn.yourdomain.com/photography/content/City/photo.webp`  |
| `.pic/post/image.webp`                       | `https://cdn.yourdomain.com/.pic/post/image.webp`                  |
| `photography/cata/City.webp`                 | `https://cdn.yourdomain.com/photography/cata/City.webp`            |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test locally with `npm run dev`
5. Submit a pull request

---

## License

MIT License — see [LICENSE](LICENSE) file for details.

---

Made with Next.js, Cloudflare, and ❤️