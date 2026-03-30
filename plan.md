# R2 CDN 直连方案 — 操作指南

> 目标：让所有图片请求绕过 Worker，直接通过 Cloudflare CDN 边缘节点从 R2 分发。

## 为什么需要这个？

**当前架构（慢）：**

```
浏览器 → CF Edge → Worker (API Route) → R2.get() → arrayBuffer → Buffer → Response
```

每张图片都要消耗 Worker CPU 时间、触发 R2 API 调用，300张图 = 300次 Worker 冷启动。

**目标架构（快）：**

```
浏览器 → CF Edge (CDN Cache HIT) → 直接返回
浏览器 → CF Edge (MISS) → R2 Public Bucket → 缓存到 Edge → 返回
```

图片直接从 CDN 缓存返回，命中后零延迟、零 Worker 消耗、零 R2 API 调用。

---

## Step 1: 为 R2 Bucket 绑定自定义域名

> 参考: https://developers.cloudflare.com/r2/buckets/public-buckets/#connect-a-bucket-to-a-custom-domain

### 1.1 选择子域名

推荐使用: `cdn.gaochengzhi.com`

> [!NOTE]
> 域名必须在你 Cloudflare 账号下的同一 zone 中管理。
> `gaochengzhi.com` 已经在你的账号里了（wrangler.toml 里有配置），可以直接用。

### 1.2 在 Dashboard 操作

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **R2 > Overview**，点击 `utopia-images` bucket
3. 进入 **Settings** 标签页
4. 找到 **Public access > Custom Domains**，点击 **Add**
5. 输入 `cdn.gaochengzhi.com`，点击 **Continue**
6. 检查自动生成的 DNS CNAME 记录，点击 **Connect Domain**
7. 等待状态从 "Initializing" 变为 **"Active"**（通常 2-5 分钟）

### 1.3 验证连通性

```bash
# 测试一张已知存在的图片（使用你 R2 里实际的 key）
curl -I "https://cdn.gaochengzhi.com/photography/thumb/City/some-photo.webp"

# 应该返回 200，Content-Type: image/webp
```

---

## Step 2: 配置 Cache Rules（最重要！）

> [!IMPORTANT]
> R2 自定义域名默认只缓存 [特定扩展名](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/#default-cached-file-extensions)。
> 对于图片静态资源，你需要设置 **Cache Everything + 长 Edge TTL** 才能发挥最大性能。

### 2.1 在 Dashboard 操作

1. 进入 Cloudflare Dashboard，选择 `gaochengzhi.com` zone
2. 左侧菜单 → **Caching > Cache Rules**
3. 点击 **Create rule**

### 2.2 规则配置

| 字段                    | 值                                            |
| ----------------------- | --------------------------------------------- |
| **Rule name**           | `R2 Images - Cache Everything`                |
| **Matching expression** | `Hostname equals cdn.gaochengzhi.com`         |
| **Cache eligibility**   | ✅ Eligible for cache                         |
| **Edge TTL**            | Override origin → `1 year` (31536000 seconds) |
| **Browser TTL**         | Override origin → `1 month` (2592000 seconds) |

4. 点击 **Deploy**

### 2.3 开启 Smart Tiered Cache

> 参考: https://developers.cloudflare.com/cache/how-to/tiered-cache/#smart-tiered-cache

1. 同样在 `gaochengzhi.com` zone 下
2. 左侧菜单 → **Caching > Tiered Cache**
3. 开启 **Smart Tiered Cache**（免费版可用）

这会在 R2 bucket 附近选择一个 "上层" 数据中心作为缓存层，进一步减少 Cache MISS。

---

## Step 3: 配置 CORS（如果图片跨域加载）

如果你的博客通过 `gaochengzhi.com` 加载 `cdn.gaochengzhi.com` 的图片，需要配置 CORS。

### 3.1 在 R2 Bucket 配置 CORS

1. 进入 R2 > `utopia-images` > **Settings** > **CORS policy**
2. 添加规则:

```json
[
  {
    "AllowedOrigins": [
      "https://gaochengzhi.com",
      "https://www.gaochengzhi.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }
]
```

---

## Step 4: 代码端对接（已经自动完成）

> [!TIP]
> 代码修改已经在本次优化中完成了。前端现在使用环境变量 `NEXT_PUBLIC_R2_CDN_URL` 来生成图片 URL。
>
> 你只需要在 `.env` 和 `wrangler.toml` 中设置这个值为你的 R2 CDN 域名。

### 4.1 环境变量设置

在 `.env` 中添加:

```
NEXT_PUBLIC_R2_CDN_URL=https://cdn.gaochengzhi.com
```

在 `wrangler.toml` 的 `[vars]` 中添加:

```toml
NEXT_PUBLIC_R2_CDN_URL = "https://cdn.gaochengzhi.com"
```

### 4.2 URL 映射关系

| R2 Key                              | CDN URL                                                         |
| ----------------------------------- | --------------------------------------------------------------- |
| `photography/thumb/City/xxx.webp`   | `https://cdn.gaochengzhi.com/photography/thumb/City/xxx.webp`   |
| `photography/content/City/xxx.webp` | `https://cdn.gaochengzhi.com/photography/content/City/xxx.webp` |
| `.pic/post/xxx.webp`                | `https://cdn.gaochengzhi.com/.pic/post/xxx.webp`                |
| `photography/cata/City.webp`        | `https://cdn.gaochengzhi.com/photography/cata/City.webp`        |

---

## Step 5: 验证缓存状态

部署完成后，用浏览器 DevTools 或 curl 检查响应头:

```bash
curl -I "https://cdn.gaochengzhi.com/photography/thumb/City/some-photo.webp"
```

检查这些响应头:

| Header            | 期望值            | 含义                          |
| ----------------- | ----------------- | ----------------------------- |
| `cf-cache-status` | `HIT`             | ✅ 从 CDN 缓存返回            |
| `cf-cache-status` | `MISS`            | ⚠️ 第一次访问，已缓存到 Edge  |
| `cf-cache-status` | `DYNAMIC`         | ❌ 未被缓存，检查 Cache Rules |
| `cache-control`   | `max-age=2592000` | Browser 缓存 1 个月           |

---

## Step 6: 安全加固（可选）

### 6.1 禁用 r2.dev 公开 URL

> [!WARNING]
> 如果你之前启用了 r2.dev 公开 URL，现在有了自定义域名后建议禁用它。
> r2.dev 不支持 WAF/Cache，且可能被滥用。

在 R2 > `utopia-images` > Settings > Public Development URL > **Disable**

### 6.2 设置 Hotlink Protection（防盗链）

你可以通过 WAF 规则限制只允许你的网站引用图片:

1. Cloudflare Dashboard → `gaochengzhi.com` → **Security > WAF**
2. 创建自定义规则:
   - 条件: `(http.host eq "cdn.gaochengzhi.com" and not http.referer contains "gaochengzhi.com" and not http.referer eq "")`
   - 动作: Block

---

## 最终架构图

```
┌──────────────────────────────────────────────────────────────┐
│  gaochengzhi.com (Workers + Pages)                          │
│  ├── HTML/JS/CSS → Cloudflare Pages                        │
│  ├── /api/* → Worker (D1 查询等)                            │
│  └── 图片 URL 指向 ↓                                        │
│                                                              │
│  cdn.gaochengzhi.com (R2 Public Bucket + CDN)               │
│  ├── Cache HIT → 直接返回（0ms R2 调用）                     │
│  └── Cache MISS → R2 读取 → 缓存到 Edge → 返回              │
│      ├── photography/thumb/* (缩略图, ~30-80KB)              │
│      ├── photography/content/* (全尺寸, ~200KB-2MB)          │
│      ├── photography/cata/* (分类封面)                        │
│      └── .pic/* (博客文章图片)                                │
└──────────────────────────────────────────────────────────────┘
```

## Checklist

- [x] Step 1: 在 R2 bucket 绑定 `cdn.gaochengzhi.com` ✅ 已 Active
- [x] Step 2: 创建 Cache Rule（Cache Everything + 1年 Edge TTL）✅ API 创建完成
- [x] Step 2.3: 开启 Smart Tiered Cache ⚠️ **需要手动操作**（API token 权限不够）
- [x] Step 3: 配置 R2 CORS ✅ API 设置完成
- [x] Step 4.1: 设置 `NEXT_PUBLIC_R2_CDN_URL` 环境变量 ✅ 已在 .env + wrangler.toml 启用
- [x] Step 5: 验证 `cf-cache-status: HIT` ✅ 已验证缩略图和分类图都 HIT
- [ ] Step 6.1: 禁用 r2.dev 公开 URL（可选）
- [ ] Step 6.2: 设置防盗链 WAF 规则（可选）
