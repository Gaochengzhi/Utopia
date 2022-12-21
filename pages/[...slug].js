import { SlugToc } from "/components/SlugToc"
import { Float } from "/components/float"
import { Footer } from "/components/footer"
import { Toc } from "/components/Toc"
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import Head from "next/head"
import Navbar from "/components/Navbar"
import ReactMarkdown from "react-markdown"
import "github-markdown-css/github-markdown-light.css"
import { useEffect, useState } from "react"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import "katex/dist/katex.min.css"
import rehypeRaw from "rehype-raw"
import { obseverImg } from "/components/util/handleErrorPic"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism"
import { useRouter } from "next/router"
import Cookies from "js-cookie"
export default function Post({ contents, filename, status }) {
  const [showToc, setShowToc] = useState(false)
  const [path, setPath] = useState({})
  const router = useRouter()
  useEffect(() => {
    setPath(JSON.parse(localStorage.getItem("paths")))
    obseverImg(document.body)
    if (status !== "md" && status !== "api") {
      router.push("/")
    }

    Cookies.set("refreshed_slug", "true", { expires: 1 })
    if (!Cookies.get("refreshed_slug")) {
      localStorage.setItem("refreshed_slug", "true")
      setTimeout(() => window.location.reload(), 3000)
    }

    if (router.isReady) {
      console.log("thishis ")
      window.find(router.query.keyword)
      console.log(router)
    }
  }, [router.isReady, router.query])
  return (
    <>
      {status === "md" ? (
        <>
          <Head>
            <title>{filename}</title>
            <meta
              name="viewport"
              content="initial-scale=1.0, width=device-width"
            />
          </Head>
          <Navbar />
          <div className="main lg:flex lg:mr-9 w-screen">
            {showToc ? (
              <div className="hidetoc">
                <SlugToc paths={path} />
              </div>
            ) : (
              <></>
            )}
            <div className="hidden lg:flex mr-3 navbar ">
              <Toc />
            </div>
            <div>
              <div className="lg:flex flex-col items-center justify-center text-3xl mt-10"></div>
              <ReactMarkdown
                className="markdown-body lg:max-w-[75vw]  p-4 mylist"
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
                      <code className={"text-white"} {...props}>
                        <div className="m-3">{children}</div>
                      </code>
                    )
                  },
                }}
              >
                {contents}
              </ReactMarkdown>
              <div className="pb-10">
                <Footer />
              </div>
            </div>
          </div>

          <div
            onClick={() => {
              setShowToc((e) => !e)
            }}
          >
            <Float />
          </div>
        </>
      ) : (
        <></>
      )}
    </>
  )
}

export async function getStaticPaths() {
  const pathsList = []
  const dirTree = (fullFilename) => {
    const stats = fs.lstatSync(fullFilename)
    const filename = fullFilename.split("/").pop()

    if (filename.toString()[0] == ".")
      return {
        title: "x",
        key: Math.floor(Math.random() * 9e9).toString(),
        isLeaf: stats.isDirectory() ? false : true,
      }

    pathsList.push(fullFilename)
    const info = {
      path: fullFilename,
      title: path.basename(fullFilename),
      key: Math.floor(Math.random() * 9e9).toString(),
      isLeaf: stats.isDirectory() ? false : true,
    }

    if (stats.isDirectory()) {
      info.type = "folder"
      if (info.title === "post") {
        info.title = "content"
        info.key = "myrootkey"
      }
      info.children = fs.readdirSync(fullFilename).map((child) => {
        return dirTree(`${fullFilename}/${child}`)
      })
    } else {
      info.type = "file"
    }
    return info
  }
  dirTree("post")
  const paths = pathsList.map((fullfilename) => ({
    params: {
      slug: fullfilename.split("/"),
    },
  }))
  return {
    paths,
    fallback: true,
  }
}

export const getStaticProps = async ({ params: { slug } }) => {
  let reg = /(?:\.([^.]+))?$/
  if (reg.exec(slug[slug.length - 1])[1] != "md") {
    return {
      props: {
        status: "folder",
      },
    }
  }
  if (slug.slice(0, 2) == "api") {
    return {
      props: {
        status: "api",
      },
    }
  }

  let rawMarkdown = fs
    .readFileSync(path.join(slug.join("/")))
    .toString()
    .replace(
      new RegExp(
        "(file://)?/Users/kounarushi/mycode/web-blog/public/.pic/",
        "gm"
      ),
      "http://124.220.179.145:5555/.pic/"
    )

  const markDownWithoutYarm = matter(rawMarkdown)
  const filename = slug.pop()

  return {
    props: {
      filename,
      contents: markDownWithoutYarm.content,
      status: "md",
    },
    revalidate: 1,
  }
}
