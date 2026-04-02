import "github-markdown-css/github-markdown-light.css"
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

const FileTextIcon = ({ className }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

export default function PostList({ posts, rest }) {
  return (
    <div className="w-screen md:px-5 mt-7 lg:mx-10">
      <div className="">
        {posts.map((post) => (
          <div key={post.key}>
            <Link href={post.path} className="clickable">
              <div className="cursor-pointer">
                <div className=" flex flex-col items-center text-3xl m-3 ">
                  {/* Custom divider replacing antd Divider */}
                  <div className="relative flex items-center w-full my-4">
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-600"></div>
                    <div className="flex-shrink-0 mx-4">
                      <div className="text-gray-400">
                        {formateTime(post.time)}
                      </div>
                    </div>
                    <div className="flex-grow border-t border-gray-200 dark:border-gray-600"></div>
                  </div>
                </div>
                <div className="flex flex-col  bg-white   mb-14  ">
                  <div className=" max-h-[40rem] overflow-y-hidden lg:max-w-[70vw]  ">
                    <ReactMarkdown
                      className="markdown-body  p-4 mylist"
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
                      }}
                    >
                      {post.content}
                    </ReactMarkdown>
                  </div>
                  <div className="flex px-4 mt-3 items-center">
                    <div className="flex text-lg items-center space-x-2">
                      <FileTextIcon />
                      <div>{post.title.replace(".md", "")} </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div>
        {rest.map((slide) => (
          <div
            key={slide.key}
            className="m-4 flex justify-between  items-center  border-b-2 border-dashed hover:shadow-md hover:border-double  transition-all ease-in"
          >
            <Link href={slide.path} className="clickable">
              <div className="flex text-lg items-center space-x-2 max-w-[51rem] overflow-hidden">
                <FileTextIcon />
                <div>{slide.title.replace(".md", "")}</div>
              </div>
            </Link>
            <div className="hidden md:block">{formateTime(slide.time)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
