import fs from "fs"
import path from "path"
import { tree2list, toTimestamp, deleteTree } from "/components/util/treeSort"
export async function readAllFile(FilePath, callbacky) {
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
      path: callbacky(fullFilename),
      title: path.basename(fullFilename),
      key: Math.floor(Math.random() * 9e9).toString(),
      isLeaf: stats.isDirectory() ? false : true,
      time: toTimestamp(stats.birthtime.toString()) * 1000,
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
  let InfoArray = dirTree(FilePath)
  InfoArray.children = await deleteTree(InfoArray.children)
  let copyArray = JSON.parse(JSON.stringify(InfoArray))
  let SortedInfoArray = tree2list(copyArray)
    .sort((a, b) => {
      return b.time - a.time
    })
    .filter((o) => o.isLeaf === true)
  return { SortedInfoArray, InfoArray }
}
