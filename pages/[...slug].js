import { SlugToc } from "/components/SlugToc"
import { TocToggleButton } from "/components/TocToggleButton"
import { Footer } from "/components/footer"
import { Toc } from "/components/Toc"
import Navbar from "/components/Navbar"
import MarkdownArticle from "/components/MarkdownArticle"
import FolderView from "/components/FolderView"
import PageView from "/components/PageView"
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import Head from "next/head"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { Spin } from "antd"
import { obseverImg } from "/components/util/handleErrorPic"
import { normalizeImagePath } from "/components/util/imageUtils"
const config = require('../config.local.js')

export default function Post({ contents, filename, status, folderContents, folderPath, isProtected }) {
    const router = useRouter()
    const [showToc, setShowToc] = useState(false)
    const [path, setPath] = useState({})
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        // Check authentication for protected content
        if (isProtected) {
            // Check if user has valid auth cookie
            const checkAuth = async () => {
                try {
                    const response = await fetch('/api/auth/check-diary')
                    const data = await response.json()

                    if (data.authenticated) {
                        setIsAuthenticated(true)
                        setChecking(false)
                    } else {
                        // Redirect to auth page
                        const returnUrl = encodeURIComponent(router.asPath)
                        router.push(`/auth/diary?return=${returnUrl}`)
                    }
                } catch (error) {
                    // If check fails, redirect to auth page
                    const returnUrl = encodeURIComponent(router.asPath)
                    router.push(`/auth/diary?return=${returnUrl}`)
                }
            }

            checkAuth()
        } else {
            setChecking(false)
        }
    }, [isProtected, router])

    useEffect(() => {
        // Skip if page is still being generated
        if (router.isFallback) return

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
    }, [router.isFallback])

    // Show loading spinner when page is being generated or checking auth
    if (router.isFallback || (isProtected && checking)) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
                <Spin size="large" />
            </div>
        )
    }

    // Don't render protected content if not authenticated
    if (isProtected && !isAuthenticated) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
                <Spin size="large" />
            </div>
        )
    }
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
                            <PageView slug={folderPath + '/' + filename} />
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
    // Don't pre-build any pages at build time
    // Pages will be generated on-demand and cached with ISR (revalidate: 1)
    return {
        paths: [],
        fallback: true,
    }
}

export const getStaticProps = async ({ params: { slug } }) => {
    // Early return for missing or invalid slug
    if (!slug || !Array.isArray(slug) || slug.length === 0) {
        return { notFound: true }
    }

    // Security: Block suspicious paths (common scanner targets)
    const suspiciousPatterns = [
        /\.php$/i, /\.asp$/i, /\.aspx$/i, /\.jsp$/i, /\.cgi$/i,
        /wp-/i, /wordpress/i, /xmlrpc/i, /phpmyadmin/i,
        /\.env$/i, /\.git/i, /\.svn/i, /\.htaccess/i,
        /\.sql$/i, /\.bak$/i, /\.backup$/i, /\.old$/i,
        /admin/i, /config\./i, /setup\./i, /install\./i,
    ]
    const fullPath = slug.join("/")
    if (suspiciousPatterns.some(p => p.test(fullPath))) {
        return { notFound: true }
    }

    // Security: Ensure path stays within allowed directories
    if (!fullPath.startsWith('post/') && !fullPath.startsWith('post')) {
        return { notFound: true }
    }

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

        // Check if this is protected content
        const { isProtectedPath } = require('/lib/auth')
        const isProtected = isProtectedPath(filePath)

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
                isProtected: isProtected || false,
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
