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
import dynamic from "next/dynamic"

// Lazy-load MermaidDiagram — mermaid requires browser APIs so must skip SSR
const MermaidDiagram = dynamic(() => import("./MermaidDiagram"), {
    ssr: false,
    loading: () => (
        <div className="mermaid-container">
            <div className="mermaid-loading">
                <div className="mermaid-loading-spinner" />
                <span>Loading diagram…</span>
            </div>
        </div>
    ),
})

const BARE_IMAGE_FILENAME_PATTERN = /^[^/?#]+\.(?:jpe?g|png|gif|webp|svg|bmp|ico)(?:[?#].*)?$/i

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
                pre: ({ node, children, className, ...props }) => {
                    // If pre contains a mermaid code block, don't wrap it in <pre>
                    // (MermaidDiagram handles its own container)
                    const codeChild = node?.children?.[0]
                    if (
                        codeChild?.tagName === "code" &&
                        /language-mermaid/.test(
                            (codeChild.properties?.className || []).join(" ")
                        )
                    ) {
                        return <>{children}</>
                    }
                    return <pre className={className} {...props}>{children}</pre>
                },
                code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "")
                    const lang = match?.[1]

                    // ── Mermaid diagrams ──
                    if (!inline && lang === "mermaid") {
                        const chart = String(children).replace(/\n$/, "")
                        return <MermaidDiagram chart={chart} />
                    }

                    return !inline && match ? (
                        <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={lang}
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
                        <code
                            style={{
                                background: 'rgba(229, 231, 235, 0.9)',
                                color: '#c7254e',
                                padding: '0.15em 0.4em',
                                borderRadius: '4px',
                                fontSize: '0.9em',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            }}
                            {...props}
                        >
                            {children}
                        </code>
                    )
                },
                img({ src, alt, ...props }) {
                    // Rewrite /.pic/ paths directly to CDN, skipping Worker proxy
                    let resolvedSrc = src
                    if (src && BARE_IMAGE_FILENAME_PATTERN.test(src)) {
                        resolvedSrc = '/.pic/' + src.replace(/^\/+/, '')
                    }
                    if (CDN_BASE && src && src.startsWith('/.pic/')) {
                        resolvedSrc = CDN_BASE + src
                    } else if (CDN_BASE && resolvedSrc && resolvedSrc.startsWith('/.pic/')) {
                        resolvedSrc = CDN_BASE + resolvedSrc
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
