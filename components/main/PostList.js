import { FileTextOutlined } from "@ant-design/icons"
import { Divider } from "antd"
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
export default function PostList({ posts, rest }) {
  return (
    <div className="w-screen md:px-5 mt-7 lg:mx-10">
      <div className="">
        {posts.map((post) => (
          <div key={post.key}>
            <Link href={post.path} className="clickable">
              <div className="cursor-pointer">
                <div className=" flex flex-col items-center text-3xl m-3 ">
                  <Divider plain>
                    <div className="text-gray-400  ">
                      {formateTime(post.time)}
                    </div>
                  </Divider>
                </div>
                <div className="flex flex-col  bg-white   mb-14  ">
                  <div className=" max-h-[40rem] overflow-y-hidden lg:max-w-[70vw]  ">
                    <ReactMarkdown
                      className="markdown-body  p-4 mylist"
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeRaw]}
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
                            <code
                              className={className + "text-white p-2"}
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
                    <a>
                      <div className="flex text-lg items-center space-x-2">
                        <FileTextOutlined />
                        <div>{post.title.replace(".md", "")} </div>
                      </div>
                    </a>
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
              <a>
                <div className="flex text-lg items-center space-x-2 max-w-[51rem] overflow-hidden">
                  <FileTextOutlined />
                  <div>{slide.title.replace(".md", "")}</div>
                </div>
              </a>
            </Link>
            <div className="hidden md:block">{formateTime(slide.time)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
