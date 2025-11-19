import fs from "fs"
import path from "path"
import { tree2list, toTimestamp, deleteTree } from "/components/util/treeSort"

/**
 * Build a directory tree structure recursively
 * @param {string} fullFilename - Full path to the file/directory
 * @param {function} pathCallback - Optional callback to transform the path
 * @param {boolean} includeTime - Whether to include file creation time
 * @returns {object} Tree node with title, path, children, etc.
 */
export function buildDirectoryTree(fullFilename, pathCallback = (i) => i, includeTime = true) {
  let stats = fs.lstatSync(fullFilename)
  let filename = fullFilename.split("/").pop()

  // Skip hidden files
  if (filename.toString()[0] == ".") {
    return {
      title: "x",
      key: Math.floor(Math.random() * 9e9).toString(),
      isLeaf: stats.isDirectory() ? false : true,
    }
  }

  let info = {
    path: pathCallback(fullFilename),
    title: path.basename(fullFilename),
    key: Math.floor(Math.random() * 9e9).toString(),
    isLeaf: stats.isDirectory() ? false : true,
  }

  // Add creation time if requested
  if (includeTime) {
    info.time = toTimestamp(stats.birthtime.toString()) * 1000
  }

  if (stats.isDirectory()) {
    info.type = "folder"
    // Special case: rename "post" to "content"
    if (info.title === "post") {
      info.title = "content"
      info.key = "myrootkey"
    }
    info.children = fs.readdirSync(fullFilename).map((child) => {
      return buildDirectoryTree(`${fullFilename}/${child}`, pathCallback, includeTime)
    })
  } else {
    info.type = "file"
  }

  return info
}

/**
 * Read all files in a directory and return both tree and sorted list
 * @param {string} FilePath - Root directory to scan
 * @param {function} callbacky - Callback to transform paths
 * @returns {object} { SortedInfoArray, InfoArray }
 */
export async function readAllFile(FilePath, callbacky) {
  let InfoArray = buildDirectoryTree(FilePath, callbacky, true)
  InfoArray.children = await deleteTree(InfoArray.children)

  let copyArray = JSON.parse(JSON.stringify(InfoArray))
  let SortedInfoArray = tree2list(copyArray)
    .sort((a, b) => {
      return b.time - a.time
    })
    .filter((o) => o.isLeaf === true)

  return { SortedInfoArray, InfoArray }
}
