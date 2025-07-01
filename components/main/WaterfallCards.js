import { FileTextOutlined, ClockCircleOutlined } from "@ant-design/icons"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { formateTime } from "../util/treeSort"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import "katex/dist/katex.min.css"
import rehypeRaw from "rehype-raw"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { useEffect, useRef, useState, useCallback } from "react"

export default function WaterfallCards({ initialPosts, totalPosts }) {
    const [posts, setPosts] = useState(initialPosts || [])
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(initialPosts?.length < totalPosts)
    const [page, setPage] = useState(1)
    const [error, setError] = useState(null)
    const containerRef = useRef(null)
    const [columnCount, setColumnCount] = useState(3)

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

    useEffect(() => {
        const updateColumnCount = () => {
            if (window.innerWidth <= 600) {
                setColumnCount(1)
            } else if (window.innerWidth <= 900) {
                setColumnCount(2)
            } else if (window.innerWidth <= 1200) {
                setColumnCount(3)
            } else if (window.innerWidth <= 1600) {
                setColumnCount(4)
            } else {
                setColumnCount(5)
            }
        }

        updateColumnCount()
        window.addEventListener('resize', updateColumnCount)

        return () => window.removeEventListener('resize', updateColumnCount)
    }, [])

    // 根据屏幕大小计算合适的padding
    const getPadding = () => {
        if (typeof window === 'undefined') return '0 1.5rem'

        const width = window.innerWidth
        if (width <= 768) {
            return '0 1rem'  // 移动端：16px边距
        } else if (width <= 1024) {
            return '0 2rem'  // 平板：32px边距
        } else {
            return '0 1.5rem'  // 桌面端：24px边距
        }
    }

    // 将帖子分配到不同的列中，保持时间顺序
    const arrangeInColumns = () => {
        const columns = Array(columnCount).fill().map(() => [])

        posts.forEach((post, index) => {
            const columnIndex = index % columnCount
            columns[columnIndex].push(post)
        })

        return columns
    }

    const columns = arrangeInColumns()

    return (
        <div className="waterfall-container w-full py-8">
            {/* JavaScript实现的瀑布流 */}
            <div
                ref={containerRef}
                className="waterfall-grid-js"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                    gap: columnCount === 1 ? '1rem' : '1.5rem',
                    maxWidth: columnCount * 600 + (columnCount - 1) * 24 + 'px', // 每列300px，间距24px
                    margin: '0 auto',
                    padding: getPadding(),
                    width: '100%'
                }}
            >
                {columns.map((column, columnIndex) => (
                    <div key={columnIndex} className="waterfall-column">
                        {column.map((post, index) => (
                            <Link key={post.key} href={post.path}>
                                <div className="waterfall-card group shadow-md" style={{
                                    marginBottom: '1.5rem',
                                    maxHeight: '50rem',
                                    overflow: 'hidden'
                                }}>
                                    {/* 卡片内容 */}
                                    <div className="card-content">
                                        {/* 卡片头部 */}
                                        <div className="card-header">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                                <ClockCircleOutlined className="text-xs" />
                                                <span>{formateTime(post.time)}</span>
                                            </div>
                                            <h3 className="card-title">
                                                {post.title.replace(".md", "")}
                                            </h3>
                                        </div>

                                        {/* 文章预览内容 */}
                                        <div className="card-body">
                                            <ReactMarkdown
                                                className="markdown-preview"
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}
                                                components={{
                                                    pre: ({ node, inline, className, ...props }) => (
                                                        <pre className={className} {...props} />
                                                    ),
                                                    code({ node, inline, className, children, ...props }) {
                                                        const match = /language-(\w+)/.exec(className || "")
                                                        return !inline && match ? (
                                                            <SyntaxHighlighter
                                                                style={vscDarkPlus}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                {...props}
                                                            >
                                                                {String(children).replace(/\n$/, "")}
                                                            </SyntaxHighlighter>
                                                        ) : (
                                                            <code className="inline-code" {...props}>
                                                                {children}
                                                            </code>
                                                        )
                                                    },
                                                    // 限制图片大小
                                                    img: ({ node, ...props }) => (
                                                        <img {...props} className="card-image" />
                                                    ),
                                                    // 限制标题层级
                                                    h1: ({ children }) => <h4 className="card-h1">{children}</h4>,
                                                    h2: ({ children }) => <h5 className="card-h2">{children}</h5>,
                                                    h3: ({ children }) => <h6 className="card-h3">{children}</h6>,
                                                }}
                                            >
                                                {post.content}
                                            </ReactMarkdown>
                                        </div>

                                        {/* 卡片底部 */}
                                        <div className="card-footer">
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <FileTextOutlined />
                                                <span>阅读更多</span>
                                            </div>
                                            <div className="read-more-arrow">→</div>
                                        </div>
                                    </div>

                                    {/* 悬停效果遮罩 */}
                                    <div className="card-overlay"></div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ))}
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