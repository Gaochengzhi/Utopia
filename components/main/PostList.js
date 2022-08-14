import { FileTextOutlined } from "@ant-design/icons"
import { Divider } from "antd"
import "github-markdown-css/github-markdown-light.css"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { formateTime } from "../util/treeSort"
export default function PostList({ posts, rest }) {
  return (
    <div className="w-screen md:ml-10 mt-7">
      {posts.map((post) => (
        <div key={post.key}>
          <div className=" flex flex-col items-center text-3xl m-3 max-w-[50rem] ">
            {/* <div className="w-1/3 mx-auto svg">
              <img src="/header.svg" alt="" />
            </div> */}
            <Divider plain>
              <div className="text-gray-400  ">
                {formateTime(post.time * 1000)}
              </div>
            </Divider>
          </div>
          <div className="flex flex-col max-w-[50rem] bg-white   mb-14  ">
            <div className=" max-w-[50rem] max-h-[40rem] overflow-y-hidden  ">
              <ReactMarkdown className="markdown-body max-w-[50rem] p-4">
                {post.content}
              </ReactMarkdown>
            </div>
            <div className="flex px-4 mt-3 items-center">
              <Link href={post.path} className="clickable">
                <a>
                  <div className="flex text-lg items-center space-x-2">
                    <FileTextOutlined />
                    <div>{post.title.replace(".md", "")} </div>
                  </div>
                </a>
              </Link>
            </div>
          </div>
        </div>
      ))}
      <div>
        {rest.map((slide) => (
          <div
            key={slide.key}
            className="m-4 flex justify-between  items-center max-w-[50rem] border-b-2 border-dashed hover:shadow-md hover:border-double  transition-all ease-in"
          >
            <Link href={slide.path} className="clickable">
              <a>
                <div className="flex text-lg items-center space-x-2  overflow-hidden">
                  <FileTextOutlined />
                  <div>{slide.title.replace(".md", "")}</div>
                </div>
              </a>
            </Link>
            <div className="hidden md:block">
              {formateTime(slide.time * 1000)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
