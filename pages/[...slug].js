import { SlugToc } from "/components/SlugToc"
import { TocToggleButton } from "/components/TocToggleButton"
import { Footer } from "/components/footer"
import { Toc } from "/components/Toc"
import Navbar from "/components/Navbar"
import MarkdownArticle from "/components/MarkdownArticle"
import FolderView from "/components/FolderView"
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import Head from "next/head"
import { useEffect, useState } from "react"
import { obseverImg } from "/components/util/handleErrorPic"
import { normalizeImagePath } from "/components/util/imageUtils"
import { buildDirectoryTree } from "/components/util/readAllfile"
const config = require('../config.local.js')
export default function Post({ contents, filename, status, folderContents, folderPath }) {
    const [showToc, setShowToc] = useState(false)
    const [path, setPath] = useState({})

    useEffect(() => {
        // Try to get paths from localStorage first
        const cachedPaths = localStorage.getItem("paths")
        if (cachedPaths) {
            setPath(JSON.parse(cachedPaths))
        } else {
            // If no cached data, fetch from API
            fetch('/api/paths')
                .then(res => res.json())
                .then(data => {
                    if (data.paths) {
                        setPath(data.paths)
                        localStorage.setItem("paths", JSON.stringify(data.paths))
                    }
                })
                .catch(err => console.error('Failed to fetch paths:', err))
        }

        obseverImg(document.body)
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
                    <Navbar folderPath={folderPath} />
                    <div className="main lg:flex lg:mr-9 w-screen bg-white dark:bg-gray-900">
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
                        <div className="flex-1 max-w-4xl mx-auto">
                            <div className="lg:flex flex-col items-center justify-center text-3xl mt-10"></div>
                            <MarkdownArticle content={contents} />
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
                        <TocToggleButton />
                    </div>
                </>
            ) : status === "folder" ? (
                <>
                    <Head>
                        <title>{folderPath}</title>
                        <meta
                            name="viewport"
                            content="initial-scale=1.0, width=device-width"
                        />
                    </Head>
                    <Navbar folderPath={folderPath} />
                    <div className="main lg:flex lg:mr-9 w-screen bg-white dark:bg-gray-900">
                        <FolderView folderPath={folderPath} folderContents={folderContents} />
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

    // Use the shared buildDirectoryTree function
    const treeNode = buildDirectoryTree("post", (fullFilename) => fullFilename, false)

    // Collect all paths from the tree
    function collectPaths(node) {
        if (node.title !== "x") {
            pathsList.push(node.path)
        }
        if (node.children) {
            node.children.forEach(collectPaths)
        }
    }
    collectPaths(treeNode)

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
    const folderPath = slug.join("/")

    if (reg.exec(slug[slug.length - 1])[1] != "md") {
        // Check if path exists and is a directory
        try {
            const fullPath = path.join(process.cwd(), folderPath)
            const stats = fs.statSync(fullPath)

            if (stats.isDirectory()) {
                // Read directory contents
                const items = fs.readdirSync(fullPath)
                const folderContents = items
                    .filter(item => !item.startsWith('.')) // Filter out hidden files
                    .map(item => {
                        const itemPath = path.join(fullPath, item)
                        const itemStats = fs.statSync(itemPath)
                        const isFolder = itemStats.isDirectory()

                        return {
                            name: item.replace('.md', ''),
                            path: `/${folderPath}/${item}`,
                            isFolder: isFolder
                        }
                    })
                    .sort((a, b) => {
                        // Folders first, then files, alphabetically
                        if (a.isFolder && !b.isFolder) return -1
                        if (!a.isFolder && b.isFolder) return 1
                        return a.name.localeCompare(b.name)
                    })

                return {
                    props: {
                        status: "folder",
                        folderPath: folderPath,
                        folderContents: folderContents
                    },
                    revalidate: 1,
                }
            }
        } catch (err) {
            console.error('Error reading directory:', err)
            // If path doesn't exist or error occurs, return 404
            return {
                notFound: true,
            }
        }
    }

    if (slug.slice(0, 2) == "api") {
        return {
            props: {
                status: "api",
            },
        }
    }

    // Safely read markdown file with error handling
    try {
        const filePath = path.join(slug.join("/"))

        // Check if file exists before reading
        if (!fs.existsSync(filePath)) {
            console.error('File not found:', filePath)
            return {
                notFound: true,
            }
        }

        let rawMarkdown = fs.readFileSync(filePath).toString()
        const normalizedMarkdown = normalizeImagePath(rawMarkdown)

        const markDownWithoutYarm = matter(normalizedMarkdown)
        const filename = slug[slug.length - 1]
        const articleFolderPath = slug.slice(0, -1).join('/')

        return {
            props: {
                filename,
                contents: markDownWithoutYarm.content,
                status: "md",
                folderPath: articleFolderPath,
            },
            revalidate: 1,
        }
    } catch (err) {
        console.error('Error reading markdown file:', err)
        return {
            notFound: true,
        }
    }
}
