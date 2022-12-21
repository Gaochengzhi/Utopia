import PostList from "/components/main/PostList"
import FileTree from "/components/main/FileTree"
import { Info } from "/components/Info"
import matter from "gray-matter"
import Head from "next/head"
import Navbar from "/components/Navbar"
import fs from "fs"
import { useEffect } from "react"
import { readAllFile } from "/components/util/readAllfile"
import Cookies from "js-cookie"

export default function Home({ paths, posts, rest }) {
  useEffect(() => {
    // localStorage.setItem("paths", JSON.stringify(paths))
    Cookies.set("refreshed", "true", { expires: 1 })
    if (!Cookies.get("refreshed")) {
      localStorage.setItem("refreshed", "true")
      setTimeout(() => window.location.reload(), 3000)
    }
  }, [])

  return (
    <>
      <Head>
        <title>Utopia</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <Navbar paths={paths} state={"index"} />
      <div className="main  lg:pl-16">
        <div className="flex flex-col items-start  lg:flex-row ">
          {/* left down */}
          <div className="flex lg:flex-col flex-wrap mdnav items-center justify-around  w-full lg:w-fit">
            <div className="flex  flex-col items-center">
              <div className="flex flex-col items-center space-y-5  m-6  w-48">
                <Info />
              </div>
            </div>
            <div className="pt-4">
              <div className="w-[94vw] max-h-[430px] border-2 border-dashed border-gray-300  p-3 overflow-scroll lg:max-h-[45vh] bg-white  items-center  sm:w-[22rem] lg:w-[18rem] rounded-sm">
                <FileTree paths={paths} />
              </div>
            </div>
          </div>
          <PostList posts={posts} rest={rest} />
        </div>
      </div>
    </>
  )
}

export const getStaticProps = async () => {
  let infoArray = await readAllFile("post", (i) => i)
  let posts = infoArray.SortedInfoArray.slice(0, 3).map((o) => {
    const fullpath = o.path
    const rawMarkdown = fs
      .readFileSync(fullpath)
      .toString()
      .replace(
        new RegExp(
          "(file://)?/Users/kounarushi/mycode/web-blog/public/.pic/",
          "gm"
        ),
        "http://124.220.179.145:5555/.pic/"
      )
    const markDownWithoutYarm = matter(rawMarkdown)
    o.content =
      markDownWithoutYarm.content.length > 1024
        ? markDownWithoutYarm.content.slice(0, 1023)
        : markDownWithoutYarm.content
    return o
  })

  return {
    props: {
      paths: infoArray.InfoArray,
      posts,
      rest: infoArray.SortedInfoArray,
    },
    revalidate: 1,
  }
}
