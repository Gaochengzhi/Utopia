import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import "github-markdown-css/github-markdown-light.css"
import "katex/dist/katex.min.css"

export default function MarkdownArticle({ content }) {
    return (
        <ReactMarkdown
            className="markdown-body lg:max-w-3xl p-4 mylist bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mx-auto"
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
                            wrapLines={false}
                            showLineNumbers={false}
                            customStyle={{
                                background: '#1e1e1e',
                                padding: '1rem',
                                margin: 0,
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                                lineHeight: '1.6'
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
            }}
        >
            {content}
        </ReactMarkdown>
    )
}
