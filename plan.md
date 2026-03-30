# optimize-images.mjs 开发计划

> 域名连接 Cloudflare ✅ 已完成。下面是图片压缩脚本的详细开发规格。
> 日期：2026-03-30

---

## 1. 目标

编写 `scripts/optimize-images.mjs`，实现：

- 基于 manifest（hash 表）的**增量**图片优化
- **原地替换**为 WebP 格式（不生成中间文件）
- **智能决策**：根据图片实际尺寸和格式动态决定操作
- 处理后与 R2 **双向同步**（新增上传、删除传播）

---

## 2. Manifest 设计（精简）

### 文件位置

```
scripts/.image-manifest.json   ← 入 Git，单人维护
```

### 结构

每个条目只保留**决策必需**的字段：

```jsonc
{
  "version": 1,
  "files": {
    // key = 相对于 public/ 的当前路径（处理后路径）
    ".pic/IMG_7586.webp": {
      "hash": "a1b2c3d4",     // 当前文件的 SHA256 前 16 位（足够防碰撞）
      "status": "ok"          // "ok" | "skip" | "error"
    },
    ".pic/animation.gif": {
      "hash": "e5f6a7b8",
      "status": "skip",       // skip = 已评估过，不需要处理（GIF/SVG/已达标的WebP）
      "reason": "gif"         // 跳过原因：便于调试
    },
    ".pic/corrupt-file.png": {
      "hash": "c9d0e1f2",
      "status": "error",      // error = sharp 处理出错，下次跳过
      "reason": "Input buffer contains unsupported image format"
    }
  }
}
```

**为什么这么精简？**  
- `hash` → 判断文件是否变化，这是唯一的增量检测依据
- `status` → 区分"已成功处理"、"评估后跳过"、"处理报错"三种状态
- `reason` → 仅 skip/error 时存在，用于调试。ok 状态不需要 reason
- 不存原始大小、尺寸、操作类型等 — 这些是处理时的临时信息，用日志输出即可，不需要持久化

**874 个文件时 manifest 大小估算：** ~50KB（每条约 60 字节）

---

## 3. 增量检测流程

```
脚本启动
  │
  ├─ 加载 manifest
  ├─ 扫描 public/.pic/ 全部文件
  │
  ├─ 对比差异：
  │   ├─ 本地存在 + manifest 无记录      → 新文件 → 加入处理队列
  │   ├─ 本地存在 + hash 与 manifest 不同 → 文件被用户替换了 → 重新处理
  │   ├─ 本地存在 + hash 一致 + status=ok/skip → 跳过
  │   ├─ 本地存在 + hash 一致 + status=error  → 跳过（不反复重试已知错误）
  │   └─ manifest 有记录但本地不存在     → 从 manifest 删除 + 从 R2 删除
  │
  ├─ 处理队列中的文件（详见决策逻辑）
  ├─ 保存 manifest
  └─ 同步到 R2
```

**关键点：hash 是处理后文件的 hash。**  
首次处理时：读原文件 → sharp 处理 → 写 WebP → 计算新文件 hash → 写入 manifest。  
后续检测时：读当前文件 → 计算 hash → 与 manifest 比对。如果用户用新图片替换了（hash 变化），则重新处理。

---

## 4. 处理决策逻辑（智能版）

**核心原则：不做无意义的二次压缩。**

### 4.1 前置判断（格式级别，立即决定）

```
if 文件是 GIF → status="skip", reason="gif"   （动图不处理）
if 文件是 SVG → status="skip", reason="svg"   （矢量图不处理）
if 文件已是 WebP 且 ≤ 500KB → status="skip", reason="webp_small_enough"
```

### 4.2 主处理流程（需要读取图片元数据）

```javascript
const meta = await sharp(file).metadata()  // 获取 width, height, format
const fileSize = fs.statSync(file).size
const MAX_WIDTH = 2560  // 博客配图上限（4K Retina 安全值）

// 第一步：确定是否需要缩放
let needResize = false
let targetWidth = meta.width  // 默认保持原宽度

if (meta.width > MAX_WIDTH) {
  needResize = true
  targetWidth = MAX_WIDTH
  // 高度按原始宽高比自动计算，不需要手动设置
}

// 第二步：确定 WebP quality
// 小文件用高 quality 保证画质，大文件用较低 quality 压缩体积
let quality
if (fileSize <= 200 * 1024) {
  quality = 90      // ≤200KB 的小图：高画质转换
} else if (fileSize <= 500 * 1024) {
  quality = 85      // 200-500KB：中等画质
} else {
  quality = 80      // >500KB：积极压缩
}

// 第三步：执行 sharp 处理
let pipeline = sharp(file)
if (needResize) {
  pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: true })
}
const result = await pipeline.webp({ quality }).toBuffer()

// 第四步：防止二次压缩导致文件变大
// 如果输出比输入还大（例如已经很优化的 JPEG），保留原文件格式
if (result.length >= fileSize && !needResize) {
  // 压缩无效或反而变大 → 标记 skip，下次不再处理
  manifest[key] = { hash: hashOf(originalFile), status: "skip", reason: "no_gain" }
  return  // 不替换文件
}

// 第五步：原地替换
writeFile(newPath, result)
if (originalExt !== '.webp') deleteFile(originalPath)  // 删除旧格式文件
manifest[newKey] = { hash: hashOf(result), status: "ok" }
```

### 4.3 决策流程图

```
文件进入
  │
  ├─ GIF/SVG? ────────────────────────→ skip (reason: gif/svg)
  ├─ 已是 WebP 且 ≤ 500KB? ──────────→ skip (reason: webp_small_enough)
  │
  ├─ 读取 metadata (width, height)
  ├─ width > 2560? ──→ 需要 resize
  │
  ├─ 根据 fileSize 选 quality (90/85/80)
  ├─ sharp 处理 (resize? + webp)
  │
  ├─ 输出 ≥ 原始大小 且 没 resize?
  │   ├─ 是 → skip (reason: no_gain)   ← 防止质量下降
  │   └─ 否 → 原地替换 → status: ok
  │
  └─ sharp 报错? → error (reason: 错误信息)
```

### 4.4 摄影作品额外处理

摄影作品（`photography/content/` 下的文件）走同样的主流程，但：

1. **全尺寸版本**：与配图一致，宽度上限 2560px，原地替换
2. **缩略图**：额外生成 `thumb/{Category}/{filename}.webp`
   - 宽度 400px，quality 70
   - 每次 **重新生成**（不做增量跳过，因为跟随源图状态）
   - 缩略图**不记录在 manifest 中**

---

## 5. 性能评估（基于实测数据）

### 实测基准

| 操作 | 耗时 |
|------|------|
| SHA256 哈希 872 个文件 (155MB) | **341ms** |
| sharp 处理大图 (3.7MB, 4000×3000) | **566ms** |
| sharp 处理中图 (86KB, 1196×1236) | **68ms** |
| sharp 处理小图 (1KB, 65×65) | **2ms** |
| sharp 20 张图顺序处理 | **1393ms**（平均 70ms/张） |

### 首次全量处理预估

```
扫描 + hash：                ~400ms
sharp 处理 ~850 张图（排除 GIF/skip）：
  顺序执行: 850 × 70ms   ≈ 60s
  8 路并行: 850 × 70ms / 8 ≈ 8s
manifest 写入：             ~10ms
─────────────────────────────────
顺序总计 ≈ 61s
并行总计 ≈ 9s
```

### 结论：需要并行

首次运行 60s vs 9s 差异明显。使用 `p-limit` 或手写 Promise 池，并发度 = `os.cpus().length`（通常 8-16）。

### 后续增量运行

```
扫描 + hash：   ~400ms
处理 0-5 张新图：~500ms
──────────────────────
总计 < 1s
```

---

## 6. 当前图片现状（实测数据）

### 文件分布

| 指标 | 数值 |
|------|------|
| 总数 | 874 个 |
| 总大小 | 157 MB |
| 格式 | JPG 688, JPEG 95, PNG 76, GIF 8, WebP 5 |

### 尺寸分布

| 宽度范围 | 数量 | 处理方式 |
|----------|------|----------|
| ≤ 400px | 23 | 仅转 WebP，不缩放 |
| 401-1080px | 534 | 仅转 WebP，不缩放 |
| 1081-2560px | 291 | 仅转 WebP，不缩放 |
| 2561-4000px | 14 | resize 到 2560px + 转 WebP |
| > 4000px | 2 | resize 到 2560px + 转 WebP |

### 大小分布

| 范围 | 数量 | 预估操作 |
|------|------|----------|
| < 100KB | 514 | quality 90 转 WebP（高画质保留） |
| 100-500KB | 318 | quality 85-90 转 WebP |
| > 500KB | 42 | quality 80 转 WebP + 可能需要 resize |

> **结论**：只有 16 张图需要 resize，绝大多数仅需格式转换。首次运行后 manifest 建立，后续几乎为零开销。

---

## 7. CLI 接口设计

```bash
# 默认：增量压缩 + 同步 R2
node scripts/optimize-images.mjs

# 预览模式
node scripts/optimize-images.mjs --dry-run

# 仅压缩，不同步
node scripts/optimize-images.mjs --no-sync

# 仅同步（手动改图后用）
node scripts/optimize-images.mjs --sync-only

# 强制全量重处理（忽略 manifest）
node scripts/optimize-images.mjs --force

# 仅博客配图 / 仅摄影
node scripts/optimize-images.mjs --scope blog
node scripts/optimize-images.mjs --scope photography
```

---

## 8. 文件结构

```
scripts/
├── optimize-images.mjs          ← 新脚本（本次开发）
├── .image-manifest.json         ← manifest（入 Git）
├── sync-r2.mjs                  ← 现有同步脚本（复用其 S3 API 逻辑）
└── ...
```

---

## 9. 前端路径兼容

原地替换 `.jpg/.png` → `.webp` 后，历史 Markdown 中的图片引用会 404。

**方案：API 层 fallback**

在 `pages/api/thumbnails/[...path].js` 中，当 R2 请求原路径 404 时，自动尝试 `.webp` 后缀：

```
请求 /.pic/IMG_7586.jpg → R2 404 → 重试 /.pic/IMG_7586.webp → 200
```

不修改历史 Markdown 文件，对已有内容零侵入。

---

## 10. 开发步骤与工时

| # | 任务 | 耗时 |
|---|------|------|
| 1 | 脚本骨架：CLI 解析、manifest 读写、目录扫描 | 30min |
| 2 | 增量检测：hash 计算 + diff 逻辑 | 30min |
| 3 | 处理决策：格式判断、尺寸判断、quality 选择 | 30min |
| 4 | sharp 处理 + 原地替换 + 错误处理 | 30min |
| 5 | 并行处理：Promise 池 (concurrency = CPU cores) | 15min |
| 6 | R2 同步集成（复用 sync-r2.mjs 的 S3 逻辑）| 20min |
| 7 | `--dry-run` 预览测试 | 10min |
| 8 | 首次全量运行 + 验证 manifest | 15min |
| 9 | 前端 API fallback (.webp 后缀) | 20min |
| 10 | 端到端验证 | 20min |
| **合计** | | **~3.5h** |

---

## 11. 依赖

```bash
npm install -D sharp p-limit   # p-limit 用于控制并行度
# @aws-sdk/client-s3 已有
```

---

## 12. 已决定事项

| 问题 | 决定 |
|------|------|
| Markdown 路径兼容 | API 层 fallback，不改历史文件 |
| manifest 入 Git？ | 入 Git（单人维护） |
| 摄影全尺寸宽度上限 | 2560px |
| 已是 WebP 且 ≤ 500KB | 跳过不处理 |
| 压缩后反而变大的文件 | 标记 skip，保留原文件不替换 |
| 特殊格式 sharp 报错 | 标记 error + reason，下次跳过 |
