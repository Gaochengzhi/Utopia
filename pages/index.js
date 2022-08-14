import PostList from "/components/main/PostList"
import FileTree from "/components/main/FileTree"
import { Info } from "/components/Info"
import matter from "gray-matter"
import Navbar from "/components/Navbar"
import path from "path"
import { tree2list, toTimestamp, deleteTree } from "/components/util/treeSort"
import fs from "fs"
import { useEffect } from "react"
export default function Home({ paths, posts, rest }) {
  useEffect(() => {
    localStorage.setItem("paths", JSON.stringify(paths))
  }, [])
  return (
    <>
      <Navbar paths={paths} state={"index"} />
      <div className="main  max-w-7xl mx-auto lg:pl-16">
        <div className="flex flex-col items-start  lg:flex-row ">
          {/* left down */}
          <div className="flex flex-col mdnav items-center">
            <div className="flex w-screen lg:w-full flex-col items-center">
              <div className="flex flex-col items-center space-y-5  m-6  w-48">
                <Info />
              </div>
            </div>
            <div className="w-[94vw] border-2 border-dashed border-gray-300  p-3 overflow-scroll lg:max-h-[45vh] bg-white  items-center  sm:w-[18rem] rounded-sm">
              <FileTree paths={paths} />
            </div>
          </div>
          <PostList posts={posts} rest={rest} />
        </div>
      </div>
    </>
  )
}

export const getStaticProps = async () => {
  let dirTree = (fullFilename) => {
    let stats = fs.lstatSync(fullFilename)
    let filename = fullFilename.split("/").pop()

    if (filename.toString()[0] == ".")
      return {
        title: "x",
        key: Math.floor(Math.random() * 9e9).toString(),
        isLeaf: stats.isDirectory() ? false : true,
      }

    let info = {
      path: fullFilename,
      title: path.basename(fullFilename),
      key: Math.floor(Math.random() * 9e9).toString(),
      isLeaf: stats.isDirectory() ? false : true,
      time: toTimestamp(stats.birthtime.toString()),
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
  let infoArray = dirTree("post")
  infoArray.children = deleteTree(infoArray.children)
  let copyArray = JSON.parse(JSON.stringify(infoArray))

  let SortedInfoArray = tree2list(copyArray)
    .sort((a, b) => {
      return b.time - a.time
    })
    .filter((o) => o.isLeaf === true)

  let posts = []
  for (let i = 0; i < 5; i++) {
    posts.push(SortedInfoArray.shift())
  }

  const postArry = posts.map((o) => {
    const fullpath = o.path
    const rawMarkdown = fs
      .readFileSync(fullpath)
      .toString()
      .replace("/Users/kounarushi/mycode/web-blog/public/.pic/", "/.pic/")
    const markDownWithoutYarm = matter(rawMarkdown)
    o.content = markDownWithoutYarm.content
    return o
  })

  return {
    props: {
      paths: infoArray,
      posts: postArry,
      rest: SortedInfoArray,
    },
    revalidate: 1,
  }
}
