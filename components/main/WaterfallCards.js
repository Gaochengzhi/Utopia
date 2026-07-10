import Link from "next/link"
import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/router"
import { normalizeImageUrl } from "/components/util/imageUtils"
import { CDN_BASE, handleCdnError } from "/lib/cdnUrl"

export default function WaterfallCards({ initialPosts, totalPosts, isAuthenticated }) {
    const router = useRouter()
    // Initialize with props only (no sessionStorage) to avoid hydration mismatch
    const [posts, setPosts] = useState(initialPosts || [])
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(initialPosts?.length < totalPosts)
    const [page, setPage] = useState(1)
    const [error, setError] = useState(null)
    const [viewCounts, setViewCounts] = useState({})
    const [brokenImagePosts, setBrokenImagePosts] = useState(new Set())
    // 网格列数：>=1280 三列，>=768 两列，否则单列
    const [columns, setColumns] = useState(3)
    const lastInitialFingerprintRef = useRef("")
    const loadMoreTriggerRef = useRef(null)

    // Restore cached state from sessionStorage AFTER mount (avoids hydration error)
    useEffect(() => {
        const cachedPosts = sessionStorage.getItem('waterfallPosts')
        const cachedPage = sessionStorage.getItem('waterfallPage')
        const cachedHasMore = sessionStorage.getItem('waterfallHasMore')

        if (cachedPosts) {
            try {
                const parsed = JSON.parse(cachedPosts)
                if (parsed.length > 0) {
                    setPosts(parsed)
                    if (cachedPage) setPage(parseInt(cachedPage) || 1)
                    if (cachedHasMore !== null) setHasMore(cachedHasMore === 'true')
                }
            } catch (e) {}
        }
    }, [])

    // Update posts when initialPosts changes (e.g., after authentication or API fetch)
    useEffect(() => {
        if (!initialPosts || initialPosts.length === 0) return

        // Generate a fingerprint of the incoming posts to detect real changes
        // (e.g., masked '****' content replaced with real content after auth)
        const incomingFingerprint = initialPosts.map(p => p.path + ':' + (p.content || '').slice(0, 50)).join('|')

        if (incomingFingerprint !== lastInitialFingerprintRef.current) {
            setPosts(initialPosts)
            lastInitialFingerprintRef.current = incomingFingerprint
            // Clear stale cache so it gets rebuilt
            sessionStorage.removeItem('waterfallPosts')
            sessionStorage.removeItem('waterfallPage')
            sessionStorage.removeItem('waterfallHasMore')
        }
    }, [initialPosts])

    // Cache posts state whenever it changes
    useEffect(() => {
        if (posts.length > 0) {
            sessionStorage.setItem('waterfallPosts', JSON.stringify(posts))
            sessionStorage.setItem('waterfallPage', String(page))
            sessionStorage.setItem('waterfallHasMore', String(hasMore))
        }
    }, [posts, page, hasMore])

    // Handle protected post click
    const handlePostClick = async (e, post) => {
        if (post.isProtected) {
            e.preventDefault()

            // Check authentication before navigating
            try {
                const response = await fetch('/api/auth/check-diary')
                const data = await response.json()

                if (data.authenticated) {
                    // User is authenticated, navigate normally
                    router.push(post.path)
                } else {
                    // Redirect to auth page
                    const returnUrl = encodeURIComponent(post.path)
                    router.push(`/auth/diary?return=${returnUrl}`)
                }
            } catch (error) {
                // If check fails, redirect to auth page
                const returnUrl = encodeURIComponent(post.path)
                router.push(`/auth/diary?return=${returnUrl}`)
            }
        }
    }

    // Fetch view counts for posts
    const fetchViewCounts = useCallback(async (postsToFetch) => {
        if (!postsToFetch || postsToFetch.length === 0) return

        const slugs = postsToFetch.map(p => p.path.replace(/^\//, '')).join(',')

        try {
            const response = await fetch(`/api/pageviews?type=batch&slugs=${encodeURIComponent(slugs)}`)
            const data = await response.json()

            setViewCounts(prev => ({ ...prev, ...data }))
        } catch (err) {
            console.error('Error fetching view counts:', err)
        }
    }, [])

    // Fetch initial view counts
    useEffect(() => {
        if (posts.length > 0) {
            fetchViewCounts(posts)
        }
    }, [posts, fetchViewCounts])

    // 加载更多文章
    const loadMorePosts = useCallback(async () => {
        if (loading || !hasMore) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/posts?page=${page + 1}&limit=10`)
            const data = await response.json()

            if (response.ok) {
                if (data.posts.length > 0) {
                    setPosts(prev => [...prev, ...data.posts])
                    setPage(prev => prev + 1)
                    setHasMore(data.pagination.hasNextPage)

                    // Fetch view counts for new posts
                    fetchViewCounts(data.posts)
                } else {
                    setHasMore(false)
                }
            } else {
                setError(data.message || 'Failed to load more posts')
            }
        } catch (err) {
            setError('Network error. Please try again.')
            console.error('Error loading more posts:', err)
        } finally {
            setLoading(false)
        }
    }, [loading, hasMore, page, fetchViewCounts])

    // 观察列表底部：首屏在桌面端不足以滚动时，哨兵仍会立即可见并加载下一页。
    // 相比只监听 scroll，这也能覆盖用户不产生滚动事件的情况。
    useEffect(() => {
        const trigger = loadMoreTriggerRef.current
        if (!trigger || !hasMore) return

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) loadMorePosts()
                },
                { rootMargin: '0px 0px 400px' }
            )
            observer.observe(trigger)
            return () => observer.disconnect()
        }

        // 旧浏览器回退：注册后主动检查一次，避免首屏不够高时无法触发。
        const handleScroll = () => {
            const { scrollHeight, scrollTop, clientHeight } = document.documentElement
            if (scrollHeight - scrollTop - clientHeight < 400) loadMorePosts()
        }
        window.addEventListener('scroll', handleScroll)
        handleScroll()
        return () => window.removeEventListener('scroll', handleScroll)
    }, [hasMore, loadMorePosts])

    // 监听窗口大小决定列数
    useEffect(() => {
        const checkWidth = () => {
            const w = window.innerWidth
            setColumns(w >= 1280 ? 3 : w >= 768 ? 2 : 1)
        }
        checkWidth()
        window.addEventListener('resize', checkWidth)
        return () => window.removeEventListener('resize', checkWidth)
    }, [])

    // 提取标题（优先级：H1 > 前5行H2 > 第一行非空非图片文本）
    const extractTitle = (content, fallbackTitle) => {
        if (!content || typeof content !== 'string') {
            return fallbackTitle || '无标题'
        }

        const h1Match = content.match(/^#\s+(.+)$/m)
        if (h1Match) return h1Match[1]

        const lines = content.split('\n').slice(0, 5)
        for (const line of lines) {
            const h2Match = line.match(/^##\s+(.+)$/)
            if (h2Match) return h2Match[1]
        }

        for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed && !trimmed.startsWith('!')) {
                const parsed = trimmed.replace(/[#*_~`\[\]]/g, '').trim()
                if (parsed) return parsed
            }
        }

        return fallbackTitle || '无标题'
    }

    // 提取第一张图片URL
    const extractFirstImage = (content) => {
        const imgMatch = content.match(/!\[[^\]]*\]\(([^\)]+)\)/)
        return imgMatch ? imgMatch[1] : null
    }

    // 提取纯文本内容（去除markdown标记和标题）
    const extractPlainText = (content) => {
        if (!content || typeof content !== 'string') return ''

        // 移除标题
        let text = content.replace(/^#+\s+.+$/gm, '')
        // 移除代码块
        text = text.replace(/```[\s\S]*?```/g, '')
        // 移除行内代码
        text = text.replace(/`[^`]+`/g, '')
        // 移除链接
        text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        // 移除图片
        text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
        // 移除其他markdown符号
        text = text.replace(/[*_~`]/g, '')
        // 清理多余空白
        text = text.replace(/\n\s*\n/g, '\n').trim()
        return text
    }

    // 票据编号：最新一篇取最大号，往下递减
    const ticketNo = (index) => {
        const total = totalPosts > index ? totalPosts : posts.length
        return 'NO.' + String(Math.max(1, total - index)).padStart(3, '0')
    }

    // 分类：slug 的第二段（post/分类/文件.md）
    const categoryOf = (post) => {
        const segs = (post.path || '').split('/').filter(Boolean)
        return segs.length > 2 ? segs[1] : '未分类'
    }

    // 用 UTC 取日期：Worker（UTC）与浏览器（本地时区）跨午夜时
    // 本地化会渲染出不同的字符串，触发 hydration mismatch
    const formatDate = (time) => {
        const t = Number(time)
        if (!t) return ''
        const d = new Date(t)
        if (isNaN(d.getTime())) return ''
        const pad = (n) => String(n).padStart(2, '0')
        return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
    }

    // 生成整数跨度序列：所有卡片落在等宽网格上，只跨 1/2 列，
    // 每一行 pattern 之和恰好等于列数，保证行行对齐。
    const buildSpans = () => {
        if (columns === 1) return posts.map(() => 1)

        const patterns = columns === 3
            ? [[1, 1, 1], [2, 1], [1, 2]]
            : [[1, 1], [1, 1], [2]]

        const spans = []
        let i = 0
        while (i < posts.length) {
            const seed = (posts[i].path || '')
                .split('')
                .reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
            let pattern = patterns[(seed + i) % patterns.length]
            if (pattern.length > posts.length - i) {
                pattern = pattern.slice(0, posts.length - i)
            }
            spans.push(...pattern)
            i += pattern.length
        }
        return spans
    }

    const spans = buildSpans()

    // ── 卡片渲染 ─────────────────────────────────────────

    const MetaRow = ({ post, index }) => (
        <div className="tk-meta">
            <span>{ticketNo(index)}</span>
            <span className="mx-1">·</span>
            <span>阅读 {viewCounts[post.path.replace(/^\//, '')] ?? '—'} 次</span>
            <span className="tk-leader" />
            {post.isProtected && (
                <>
                    <span>私密</span>
                    <span className="mx-1">·</span>
                </>
            )}
            <span>{categoryOf(post)}</span>
            {formatDate(post.time) && (
                <>
                    <span className="mx-1">·</span>
                    <span>{formatDate(post.time)}</span>
                </>
            )}
        </div>
    )

    // Tailwind JIT 只认字面量类名，不能用模板串拼 line-clamp-${n}
    const CLAMP = { 2: 'line-clamp-2', 3: 'line-clamp-3', 4: 'line-clamp-4' }

    const Excerpt = ({ post, plainText, lines }) => {
        if (post.isProtected) {
            return (
                <p className="tk-masked mb-4">
                    ████ ██████ ████████ ███ ██████ ████ ███████ ██ ██████
                </p>
            )
        }
        return (
            <p className={`text-[0.92rem] leading-relaxed text-ink2 mb-4 ${CLAMP[lines] || CLAMP[3]}`}>
                {plainText}
            </p>
        )
    }

    return (
        <div className="w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <div
                    className="grid gap-5"
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                    {posts.map((post, index) => {
                        const fallbackTitle = (post.title || '').replace(/\.md$/i, '')
                        const title = extractTitle(post.content, fallbackTitle)
                        const plainText = extractPlainText(post.content)
                        // Prefer pre-extracted firstImage from D1, fallback to extracting from content
                        const firstImage = normalizeImageUrl(post.firstImage || extractFirstImage(post.content))
                        const imageBlocked = brokenImagePosts.has(post.path)
                        //   R2 (/.pic/...)  → prepend CDN_BASE for direct edge delivery
                        //   External URLs   → use as-is, <img> has no CORS restriction
                        //   null / blocked  → fall back to text-only card
                        const previewImage = !imageBlocked && firstImage
                            ? (CDN_BASE && firstImage.startsWith('/.pic/') ? CDN_BASE + firstImage : firstImage)
                            : null

                        const span = Math.min(spans[index] || 1, 2)
                        const onImgError = (e) => {
                            handleCdnError(e)
                            setBrokenImagePosts((prev) => {
                                if (prev.has(post.path)) return prev
                                const next = new Set(prev)
                                next.add(post.path)
                                return next
                            })
                        }

                        return (
                            <div key={post.key} style={{ gridColumn: `span ${span} / span ${span}` }}>
                                <Link href={post.path} prefetch={false} className="block h-full" onClick={(e) => handlePostClick(e, post)}>
                                    {previewImage && span >= 2 ? (
                                        /* ── 宽卡：通栏图 + 文字 ── */
                                        <article className="tk-card h-full">
                                            <div className="border-b border-rule overflow-hidden">
                                                <img
                                                    src={previewImage}
                                                    alt={title}
                                                    loading="lazy"
                                                    className="w-full object-cover block"
                                                    style={{ height: '150px' }}
                                                    onError={onImgError}
                                                />
                                            </div>
                                            <div className="flex flex-col flex-1 p-4 pb-3.5">
                                                <MetaRow post={post} index={index} />
                                                <h2 className="text-lg font-bold leading-snug my-2.5 line-clamp-2 text-ink">
                                                    {title}
                                                </h2>
                                                <Excerpt post={post} plainText={plainText} lines={2} />
                                            </div>
                                        </article>
                                    ) : (
                                        /* ── 标准卡：纯文字，或邮票式小图 ── */
                                        <article className="tk-card h-full p-4 pb-3.5">
                                            <MetaRow post={post} index={index} />
                                            <div className="flex-1 min-w-0">
                                                {previewImage && (
                                                    <figure className="tk-stampimg">
                                                        <img
                                                            src={previewImage}
                                                            alt={title}
                                                            loading="lazy"
                                                            onError={onImgError}
                                                        />
                                                    </figure>
                                                )}
                                                <h2 className="text-lg font-bold leading-snug my-2.5 line-clamp-2 text-ink">
                                                    {title}
                                                </h2>
                                                <Excerpt post={post} plainText={plainText} lines={3} />
                                            </div>
                                        </article>
                                    )}
                                </Link>
                            </div>
                        )
                    })}
                </div>
            </div>

            {hasMore && <div ref={loadMoreTriggerRef} className="h-px" aria-hidden="true" />}

            {/* 加载状态和错误处理 */}
            <div className="w-full flex justify-center mt-10">
                {loading && (
                    <div className="tk-meta !text-[0.75rem]">
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-accent mr-3" />
                        <span>LOADING…</span>
                    </div>
                )}

                {error && (
                    <div className="border border-accent bg-chip p-4 max-w-md">
                        <div className="text-accent text-sm text-center font-mono">
                            {error}
                        </div>
                        <button
                            onClick={loadMorePosts}
                            className="mt-3 w-full text-sm font-mono tracking-widest border border-accent text-accent px-3 py-1 hover:bg-accent hover:text-paper transition-colors"
                        >
                            RETRY
                        </button>
                    </div>
                )}

                {!hasMore && !loading && posts.length > 0 && (
                    <div className="tk-meta !text-[0.72rem] tracking-[0.4em]">
                        · FIN · 全 {posts.length} 篇
                    </div>
                )}
            </div>
        </div>
    )
}
