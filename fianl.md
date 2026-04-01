# Web Blog 性能审查与优化清单（Cloudflare Serverless）

审查时间：2026-03-31
代码基线：`/Users/kounarushi/mycode/web-blog`

## 1. 当前性能基线（已实测）

`npm run build` 结果：

1. `/` 首页：`First Load JS 119 kB`
2. `/photographer`：`First Load JS 128 kB`
3. `/[...slug]`：`First Load JS 555 kB`（**最大瓶颈**）
4. Middleware 体积：`34.3 kB`

结论：首屏最大问题不在首页主路由，而在文章/目录共用的 `[...slug]` 路由包体过大，以及首页与摄影页的客户端额外计算与重复请求。

## 2. 关键发现（按优先级）

## P0

### A. `[...slug]` 路由首包过大（555k），文章与目录共用同一重包

证据：

1. `pages/[...slug].js:1-8` 顶层静态引入了 `MarkdownArticle`、`Toc`、`TocToggleButton` 等重组件。
2. `components/MarkdownArticle.js:1-9` 引入 `react-markdown`、`remark/rehype`、`react-syntax-highlighter`、`katex css`，属于大体积依赖。
3. 目录页（`status === "folder"`）理论不需要这些包，但会被同路由 chunk 一并加载。

影响：

1. 首屏下载与解析 JS 明显增加。
2. 低端移动端/弱网下白屏和可交互时间变长。

建议：

1. 将 `[...slug]` 拆成两条路由：文章页与目录页分离。
2. 至少先做动态拆包：`MarkdownArticle`、`Toc`、`TocToggleButton` 改为 `next/dynamic`，只在 `status === "md"` 时加载。
3. 代码高亮改为“按需语言加载”或服务端预渲染高亮，避免整包 Prism 风格进入首屏。

### B. 首页桌面/移动两套布局同时挂载，导致隐藏分支也执行副作用

证据：

1. `pages/index.js:83-101` 同时渲染 `lg:block` 的桌面区和 `lg:hidden` 的移动区（CSS 隐藏，不是条件渲染）。
2. `components/Info.js:42` 与 `components/Info.js:90` 两个 variant 都渲染 `TotalViews`。
3. `components/TotalViews.js:7-18` mount 即请求 `/api/pageviews?type=total`。

影响：

1. 首页会产生重复请求（同一次访问可能调用两次 total views）。
2. 隐藏分支也有渲染和 hydration 成本。

建议：

1. 用 `useMediaQuery` + 条件渲染，仅挂载当前断点需要的分支。
2. `TotalViews` 上移为单实例，避免双挂载。

### C. `WaterfallCards` 存在重复请求和重复计算

证据：

1. `components/main/WaterfallCards.js:110-114` 每次 `posts` 变化都批量拉一次 `pageviews`。
2. `components/main/WaterfallCards.js:133-135` 加载更多后又对新增文章再拉一次，造成重复。
3. `components/main/WaterfallCards.js:285-301` 每次 render 对每篇 post 执行标题提取、纯文本提取、图片解析，`viewCounts` 更新会触发整批重算。

影响：

1. API 请求量偏高，D1/Worker 负载增加。
2. 滚动加载后重渲染 CPU 开销上升。

建议：

1. 只对“未拉取过浏览量的 slug”补拉一次，做去重集合。
2. 对 `extractTitle/extractPlainText/extractFirstImage` 结果做 `useMemo` 预计算。
3. 卡片宽度序列 `generateAlignedWidths` 也做 `useMemo`。

### D. 摄影首页 Banner 动画成本高，且持续运行

证据：

1. `components/photo/Banner.js:137-141` 绑定 window scroll，滚动时触发 `setScrollY` 整组件重渲染。
2. `components/photo/Banner.js:219` 默认加载 `LiquidGoldCanvas`。
3. `components/photo/LiquidGoldCanvas.js:262-275` `requestAnimationFrame` 持续绘制 WebGL。
4. `components/photo/LiquidGoldCanvas.js:305-417` 默认把参数控制面板逻辑也打进生产页面。

影响：

1. 首屏 CPU/GPU 占用偏高。
2. 手机发热、掉帧，滚动流畅度下降。

建议：

1. `LiquidGoldCanvas` 动态导入并延后挂载（首屏完成或空闲时再加载）。
2. 生产环境移除参数控制面板（仅开发环境保留）。
3. `scrollY` 改纯 CSS transform + `requestAnimationFrame` 节流，避免每次 scroll 都触发 React setState。

## P1

### E. 首页数据加载是串行 waterfall，且有二次请求

证据：

1. `pages/index.js:31-63` 先 posts，再 paths，再 auth，再可能再拉一次 posts。

建议：

1. 把可并行请求改 `Promise.all`。
2. 认证后重拉 posts 仅在确实存在受保护内容时触发。
3. 能在 SSG 注入的数据尽量一次给足，减少首屏客户端补拉。

### F. 文章页默认加载目录树数据，即使用户没打开侧边目录

证据：

1. `pages/[...slug].js:73-92` mount 即读取 localStorage 或请求 `/api/paths`。
2. 但 `SlugToc` 仅在 `showToc === true` 时展示（`pages/[...slug].js:115-121`）。

建议：

1. 把路径树加载延迟到用户首次点击目录按钮时再做。

### G. 多处使用 `Math.random` 生成 key，导致 key 不稳定

证据：

1. `pages/index.js:147,190`
2. `pages/api/posts.js:65`
3. `pages/api/paths.js:18`
4. `pages/photographer/[slug].js:179`
5. `lib/data/photos.js:28`

影响：

1. 客户端 diff 命中率变差，缓存与复用效果下降。
2. 可能引入额外重渲染。

建议：

1. 统一改为稳定 key（`slug/path/node_key`）。

### H. `pageviews` 总量接口未缓存，且会被多个组件频繁打

证据：

1. `pages/api/pageviews.js:14-19` 未设置 `Cache-Control`。
2. `components/TotalViews.js:7-18` mount 必请求。

建议：

1. `type=total` 返回加 `s-maxage` + `stale-while-revalidate`。
2. 客户端加 sessionStorage 短缓存。

### I. `photoUtils` 混入 `fs` 逻辑导致构建警告与打包噪音

证据：

1. 构建日志：`Module not found: Can't resolve 'fs' in lib/photoUtils.js`。
2. `lib/photoUtils.js:63-76` 在通用模块中 `require('fs')`。
3. `pages/photographer/[slug].js:8` 还引入了未使用的 `findManualCoverPath`。

建议：

1. 将 `findManualCoverPath` 拆到 server-only 文件（如 `lib/server/photoCover.js`）。
2. 删除客户端页面中未使用的 server helper import。

## P2

### J. 可清理的冗余/死代码

未发现被引用（建议删除或归档）：

1. `components/DrawerView.js`
2. `components/main/PostList.js`
3. `components/photo/EnhancedWaterfall.js`
4. `components/SearchBar.js`
5. `components/SearchBox.js`

其他冗余：

1. `lib/cfContext.js` 的 `getCloudflareEnv`（sync 版本）未被使用。
2. `pages/fake/index.js` 若非线上必要建议移除，减少维护面和静态路由噪声。

## 3. 懒加载与流畅度优化（可执行）

### 首页（博客）

1. 首屏只渲染首屏可见模块：`Navbar + 第一屏卡片`，侧栏目录延后。
2. `FileTree` 改为点击展开后再 mount。
3. `TotalViews` 改 `requestIdleCallback` 后请求。
4. `WaterfallCards` 卡片内容预处理 `useMemo`，滚动监听改 `IntersectionObserver` 触底加载。

### 文章页

1. `MarkdownArticle/Toc` 动态拆包。
2. 目录树数据按需加载（首次打开目录时）。
3. 对无代码块文章禁用 `react-syntax-highlighter`（按需加载高亮器）。

### 摄影站

1. `LiquidGoldCanvas` 空闲时加载或首屏静态占位图，交互后再切换 WebGL。
2. `CataContainer` 与 `Walls` 分区懒挂载（进入 viewport 再 mount）。
3. 视差滚动改为单一全局 scroll 管理器，避免每卡片一个监听器。
4. 对 `prefers-reduced-motion` 用户关闭复杂动画。

## 4. 建议执行顺序（收益/风险比最高）

1. 先拆 `[...slug]` 重包（动态 import + 目录/文章分离）。
2. 首页改“单分支挂载”（修复隐藏分支重复副作用）。
3. 修 `WaterfallCards` 浏览量请求去重 + 文本预处理缓存。
4. 摄影 Banner 的 WebGL 和滚动状态降载。
5. 清理死代码与不稳定 key。

## 5. 预期收益（保守估计）

1. `[...slug]` 首屏 JS 可明显下降（目录页降幅最大）。
2. 首页请求数可减少 1-3 个（视设备断点与登录态）。
3. `WaterfallCards` 渲染与接口请求开销可下降约 20%-40%（随文章数量增长更明显）。
4. 摄影页滚动掉帧与移动端发热会显著改善。

