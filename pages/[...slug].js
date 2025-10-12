import { SlugToc } from "/components/SlugToc"
import { Float } from "/components/float"
import { Footer } from "/components/footer"
import { Toc } from "/components/Toc"
import Breadcrumb from "/components/Breadcrumb"
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import Head from "next/head"
import Link from "next/link"
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
const config = require('../config.local.js')
export default function Post({ contents, filename, status, folderContents, folderPath }) {
    const [showToc, setShowToc] = useState(false)
    const [path, setPath] = useState({})
    const router = useRouter()
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
        if (status !== "md" && status !== "api" && status !== "folder") {
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
                            <ReactMarkdown
                                className="markdown-body lg:max-w-3xl p-4 mylist bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 mx-auto"
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
                                            <code className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1 py-0.5 rounded" {...props}>
                                                {children}
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
                        <div className="flex-1 max-w-7xl mx-auto p-4">
                            <div className="lg:max-w-6xl mx-auto mt-10">
                                <Breadcrumb folderPath={folderPath} isNavbar={false} />
                                <div className="flex flex-wrap gap-3">
                                    {folderContents.map((item) => (
                                        <Link
                                            key={item.path}
                                            href={item.path}
                                        >
                                            <div className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 hover:-translate-y-1 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200">
                                                {item.isFolder ? (
                                                    <span className="text-lg">📁</span>
                                                ) : (
                                                    <span className="text-lg">📄</span>
                                                )}
                                                <span className="text-base font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                    {item.name}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                <div className="pb-10 mt-10">
                                    <Footer />
                                </div>
                            </div>
                        </div>
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

        // Add all paths (files and directories) to pathsList
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
            // If path doesn't exist or error occurs, return folder status
            return {
                props: {
                    status: "folder",
                },
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

    let rawMarkdown = fs
        .readFileSync(path.join(slug.join("/")))
        .toString()
        .replace(
            new RegExp(
                "(file://)?/Users/kounarushi/mycode/web-blog/public/.pic/",
                "gm"
            ),
            config.IMAGE_SERVER_URL
        )

    const markDownWithoutYarm = matter(rawMarkdown)
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
}
