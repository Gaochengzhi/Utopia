import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/router"
import ViewBadge from "/components/ViewBadge"

export default function WaterfallCards({ initialPosts, totalPosts }) {
    const router = useRouter()
    const [posts, setPosts] = useState(initialPosts || [])
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(initialPosts?.length < totalPosts)
    const [page, setPage] = useState(1)
    const [error, setError] = useState(null)
    const [viewCounts, setViewCounts] = useState({})
    // 小于等于平板宽度（此处按 1024px）时，卡片单列显示
    const [isTabletOrBelow, setIsTabletOrBelow] = useState(false)

    // Update posts when initialPosts changes (e.g., after authentication)
    useEffect(() => {
        setPosts(initialPosts || [])
    }, [initialPosts])

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
    }, [posts.length])

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
    }, [loading, hasMore, page])

    // 检测滚动到底部
    useEffect(() => {
        const handleScroll = () => {
            if (loading || !hasMore) return

            const scrollHeight = document.documentElement.scrollHeight
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
            const clientHeight = document.documentElement.clientHeight

            // 当距离底部还有300px时开始加载
            if (scrollHeight - scrollTop - clientHeight < 300) {
                loadMorePosts()
            }
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [loadMorePosts])

    // 监听窗口大小，平板及以下（<= 1024px）改为单列
    useEffect(() => {
        const checkWidth = () => setIsTabletOrBelow(window.innerWidth <= 1024)
        checkWidth()
        window.addEventListener('resize', checkWidth)
        return () => window.removeEventListener('resize', checkWidth)
    }, [])

    // 提取标题（优先级：H1 > 前5行H2 > 第一行非空非图片文本）
    const extractTitle = (content) => {
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
                return trimmed.replace(/[#*_~`\[\]]/g, '').trim()
            }
        }

        return '无标题'
    }

    // 提取第一张图片URL
    const extractFirstImage = (content) => {
        const imgMatch = content.match(/!\[[^\]]*\]\(([^\)]+)\)/)
        return imgMatch ? imgMatch[1] : null
    }

    // 提取纯文本内容（去除markdown标记和标题）
    const extractPlainText = (content) => {
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

    // 生成保证右对齐的卡片宽度序列
    const generateAlignedWidths = () => {
        const widths = []
        const patterns = [
            [1 / 3, 1 / 3, 1 / 3],  // 三个1/3
            [1 / 2, 1 / 2],       // 两个1/2
            [2 / 3, 1 / 3],       // 一个2/3和一个1/3
            [1 / 3, 2 / 3],       // 一个1/3和一个2/3
            [1],              // 一个全宽
        ]

        let remainingPosts = posts.length
        let postIndex = 0
        let lastPatternIndex = -1

        while (remainingPosts > 0) {
            // 使用post的key和位置生成伪随机数选择pattern
            const seed = posts[postIndex]?.key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0
            let patternIndex = (seed + postIndex * 7) % patterns.length

            // 避免连续使用相同的pattern
            let attempts = 0
            while (patternIndex === lastPatternIndex && attempts < patterns.length) {
                patternIndex = (patternIndex + 1) % patterns.length
                attempts++
            }

            let pattern = patterns[patternIndex]

            // 如果剩余的文章数量小于pattern长度，选择更小的pattern
            let selectedPattern = pattern
            if (pattern.length > remainingPosts) {
                // 选择一个能容纳剩余文章的pattern
                if (remainingPosts === 1) {
                    selectedPattern = [1]
                } else if (remainingPosts === 2) {
                    selectedPattern = [1 / 2, 1 / 2]
                } else {
                    selectedPattern = [1 / 3, 1 / 3, 1 / 3].slice(0, remainingPosts)
                }
            }

            widths.push(...selectedPattern)
            lastPatternIndex = patternIndex
            remainingPosts -= selectedPattern.length
            postIndex += selectedPattern.length
        }

        return widths
    }

    const cardWidths = generateAlignedWidths()

    return (
        <div className="w-full">
            {/* 简洁的卡片列表 - flex布局 */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <div className="flex flex-wrap gap-6">
                    {posts.map((post, index) => {
                        const title = extractTitle(post.content)
                        const plainText = extractPlainText(post.content)
                        const firstImage = extractFirstImage(post.content)
                        // Convert /.pic/xxx to thumbnail URL: /.pic/thumb/.pic/xxx
                        // so rewrite rule strips /.pic/thumb/ prefix and API receives .pic/xxx
                        const thumbUrl = firstImage && firstImage.startsWith('/.pic/')
                            ? firstImage.replace('/.pic/', '/.pic/thumb/.pic/')
                            : null

                        // 使用预先计算好的宽度
                        const widthRatio = cardWidths[index]
                        // For image cards, cap width at 50% (1.5x of min 33.3%) to avoid overly wide images
                        const effectiveRatio = thumbUrl && !isTabletOrBelow && widthRatio > 1 / 2
                            ? 1 / 2
                            : widthRatio
                        let flexBasis
                        if (isTabletOrBelow) {
                            // 平板及以下强制单列
                            flexBasis = '100%'
                        } else if (effectiveRatio === 1 / 3) {
                            flexBasis = 'calc(33.333% - 1rem)'
                        } else if (effectiveRatio === 1 / 2) {
                            flexBasis = 'calc(50% - 0.75rem)'
                        } else if (effectiveRatio === 2 / 3) {
                            flexBasis = 'calc(66.666% - 0.5rem)'
                        } else {
                            flexBasis = '100%'
                        }

                        return (
                            <div key={post.key} style={{ flexBasis, width: flexBasis, flexShrink: 0 }}>
                                <Link href={post.path}>
                                    <a className="block" onClick={(e) => handlePostClick(e, post)}>
                                        <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg pb-4 hover:shadow-xl hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-300 cursor-pointer">
                                            <ViewBadge views={viewCounts[post.path.replace(/^\//, '')]} />
                                            {thumbUrl ? (
                                                <>
                                                    {/* Image card */}
                                                    <div className="overflow-hidden rounded-t-lg" style={{ height: '140px' }}>
                                                        <img
                                                            src={thumbUrl}
                                                            alt={title}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                    <div className="px-6 pt-3 overflow-hidden" style={{ height: '60px' }}>
                                                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 line-clamp-2 flex items-center gap-2">
                                                            {title}
                                                            {post.isProtected && (
                                                                <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                                </svg>
                                                            )}
                                                        </h2>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="p-6 overflow-hidden" style={{ height: '200px' }}>
                                                    {/* 标题 */}
                                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2 flex items-center gap-2">
                                                        {title}
                                                        {post.isProtected && (
                                                            <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                            </svg>
                                                        )}
                                                    </h2>

                                                    {/* 文本内容 - 固定显示行数 */}
                                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-4">
                                                        {plainText}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </a>
                                </Link>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 加载状态和错误处理 */}
            <div className="w-full flex justify-center mt-8">
                {loading && (
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        <span>正在加载更多文章...</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md">
                        <div className="text-red-600 dark:text-red-400 text-sm text-center">
                            {error}
                        </div>
                        <button
                            onClick={loadMorePosts}
                            className="mt-2 w-full text-sm bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 px-3 py-1 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
                        >
                            重试
                        </button>
                    </div>
                )}

                {!hasMore && !loading && posts.length > 0 && (
                    <div className="text-gray-500 dark:text-gray-400 text-sm">
                        ✨ 已加载全部 {posts.length} 篇文章
                    </div>
                )}
            </div>
        </div>
    )
}
