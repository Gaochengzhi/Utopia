import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import "github-markdown-css/github-markdown-light.css"
import "katex/dist/katex.min.css"
import { useRef } from "react"
import { CDN_BASE, handleCdnError } from "/lib/cdnUrl"

/**
 * Generate a URL-friendly slug from heading text.
 * Must stay in sync with the identical function in Toc.js.
 */
function slugify(text) {
    return text
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/[\s]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
}

/**
 * Creates a heading component factory that assigns deterministic IDs.
 * Uses a shared counter ref so duplicate headings get unique suffixes.
 */
function createHeadingRenderer(slugCounterRef) {
    return function HeadingComponent({ node, children, ...props }) {
        const Tag = node.tagName // h1, h2, etc.
        const text = extractText(children)
        let slug = slugify(text)

        // De-duplicate: keep a running count per slug
        const counter = slugCounterRef.current
        if (counter[slug] != null) {
            counter[slug]++
            slug = `${slug}-${counter[slug]}`
        } else {
            counter[slug] = 0
        }

        return <Tag id={slug} {...props}>{children}</Tag>
    }
}

/** Recursively extract plain text from React children */
function extractText(children) {
    if (typeof children === "string") return children
    if (Array.isArray(children)) return children.map(extractText).join("")
    if (children?.props?.children) return extractText(children.props.children)
    return ""
}

export default function MarkdownArticle({ content }) {
    // Reset slug counter on every render so IDs match the Toc parse order
    const slugCounterRef = useRef({})
    slugCounterRef.current = {}

    const HeadingRenderer = createHeadingRenderer(slugCounterRef)

    return (
        <ReactMarkdown
            className="markdown-body lg:max-w-3xl p-4 mylist bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mx-auto"
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}
            components={{
                h1: HeadingRenderer,
                h2: HeadingRenderer,
                h3: HeadingRenderer,
                h4: HeadingRenderer,
                h5: HeadingRenderer,
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
                            wrapLines={false}
                            showLineNumbers={false}
                            customStyle={{
                                background: '#1e1e1e !important',
                                padding: '1rem',
                                margin: 0,
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                                lineHeight: '1.6'
                            }}
                            codeTagProps={{
                                style: {
                                    background: '#1e1e1e !important'
                                }
                            }}
                            {...props}
                        >
                            {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                    ) : (
                        <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded" {...props}>
                            {children}
                        </code>
                    )
                },
                img({ src, alt, ...props }) {
                    // Rewrite /.pic/ paths directly to CDN, skipping Worker proxy
                    let resolvedSrc = src
                    if (CDN_BASE && src && src.startsWith('/.pic/')) {
                        resolvedSrc = CDN_BASE + src
                    }
                    return (
                        <img
                            src={resolvedSrc}
                            alt={alt || ''}
                            loading="lazy"
                            onError={handleCdnError}
                            {...props}
                        />
                    )
                },
            }}
        >
            {content}
        </ReactMarkdown>
    )
}
