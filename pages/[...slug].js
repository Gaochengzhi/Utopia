import { SlugToc } from "/components/SlugToc"
import { Float } from "/components/float"
import { Footer } from "/components/footer"
import { Toc } from "/components/Toc"
import React from "react"
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import Head from "next/head"
import Navbar from "/components/Navbar"
import ReactMarkdown from "react-markdown"
import "github-markdown-css/github-markdown-light.css"
import { useEffect, useState } from "react"

export default function Post({ contents, filename, status }) {
  const [showToc, setShowToc] = useState(false)
  const [path, setPath] = useState({})
  useEffect(() => {
    setPath(JSON.parse(localStorage.getItem("paths")))
  }, [])
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
          <div
            className="main lg:flex lg:justify-center md:space-x-8"
            onClick={() => {
              setShowToc(false)
            }}
          >
            {showToc ? (
              <div className="hidetoc">
                <SlugToc paths={path} />
              </div>
            ) : (
              <></>
            )}

            <div>
              <div className="lg:flex flex-col items-center justify-center text-3xl mt-10   max-w-[50rem] ">
                {/* <div className="w-1/3 mx-auto lg:mb-4 svg">
                  <img src="/header.svg" alt="" />
                </div> */}
              </div>
              <ReactMarkdown className="markdown-body   lg:min-w-[50rem] max-w-[50rem] p-4">
                {contents}
              </ReactMarkdown>

              <div className="pb-10">
                <Footer />
              </div>
            </div>

            <div className="hidden lg:inline-block w-[16rem] min-w-[14rem]  navbar ">
              <Toc />
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
    fallback: false,
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

  let rawMarkdown = fs
    .readFileSync(path.join(slug.join("/")))
    .toString()
    .replace("/Users/kounarushi/mycode/web-blog/public/.pic/", "/.pic/")

  const markDownWithoutYarm = matter(rawMarkdown)
  const filename = slug.pop()

  return {
    props: {
      filename,
      contents: markDownWithoutYarm.content,
      status: "md",
      //   metaData: JSON.stringify(markDownWithoutYarm.data),
    },
  }
}
