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
import { useEffect, useRef, useState } from "react"

export default function WaterfallCards({ posts }) {
  // 确保按时间排序，最新的在前
  const sortedPosts = [...posts].sort((a, b) => new Date(b.time) - new Date(a.time))
  const containerRef = useRef(null)
  const [columnCount, setColumnCount] = useState(3)
  
  useEffect(() => {
    const updateColumnCount = () => {
      if (window.innerWidth <= 768) {
        setColumnCount(1)
      } else if (window.innerWidth <= 1024) {
        setColumnCount(2)
      } else {
        setColumnCount(3)
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
    
    sortedPosts.forEach((post, index) => {
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
          maxWidth: columnCount === 1 ? '600px' : '1400px',
          margin: '0 auto',
          padding: getPadding(),
          width: '100%'
        }}
      >
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="waterfall-column">
            {column.map((post, index) => (
              <Link key={post.key} href={post.path}>
                <div className="waterfall-card group" style={{ marginBottom: '1.5rem' }}>
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
    </div>
  )
}