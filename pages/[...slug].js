import { SlugToc } from "/components/SlugToc"
import { TocToggleButton } from "/components/TocToggleButton"
import { Footer } from "/components/footer"
import { Toc, MobileToc } from "/components/Toc"
import Navbar from "/components/Navbar"
import MarkdownArticle from "/components/MarkdownArticle"
import FolderView from "/components/FolderView"
import PageView from "/components/PageView"
import Head from "next/head"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"

import { getCfEnv } from "/lib/cfContext"
import { normalizeImagePath } from "/components/util/imageUtils"
import { getFolderContents } from "/lib/data/paths"

// Custom loading spinner to replace antd Spin
const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-screen bg-paper">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
    </div>
)

// 用 UTC 取日期：Worker（UTC）与浏览器（本地时区）跨午夜时
// 本地化会渲染出不同的字符串，触发 hydration mismatch
const formatStampDate = (time) => {
    const t = Number(time)
    if (!t) return ''
    const d = new Date(t)
    if (isNaN(d.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export default function Post({ contents, filename, status, folderContents, folderPath, isProtected, updatedAt }) {
    const router = useRouter()
    const [showToc, setShowToc] = useState(false)
    const [path, setPath] = useState({})
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [checking, setChecking] = useState(true)
    const [dynamicContent, setDynamicContent] = useState(null)

    useEffect(() => {
        // Check authentication for protected content
        if (isProtected) {
            const checkAuth = async () => {
                try {
                    const response = await fetch('/api/auth/check-diary')
                    const data = await response.json()

                    if (data.authenticated) {
                        setIsAuthenticated(true)
                        setChecking(false)

                        // B-plan: fetch the real content for protected articles
                        try {
                            const contentRes = await fetch(
                                `/api/posts/protected/${encodeURIComponent(folderPath + '/' + filename)}`
                            )
                            if (contentRes.ok) {
                                const contentData = await contentRes.json()
                                if (contentData.content) {
                                    setDynamicContent(contentData.content)
                                }
                            }
                        } catch (e) {
                            console.error('Failed to fetch protected content:', e)
                        }
                    } else {
                        const returnUrl = encodeURIComponent(router.asPath)
                        router.push(`/auth/diary?return=${returnUrl}`)
                    }
                } catch (error) {
                    const returnUrl = encodeURIComponent(router.asPath)
                    router.push(`/auth/diary?return=${returnUrl}`)
                }
            }

            checkAuth()
        } else {
            setChecking(false)
        }
    }, [isProtected, router, filename, folderPath])

    useEffect(() => {
        if (router.isFallback) return

        const cachedPaths = localStorage.getItem("paths")
        if (cachedPaths) {
            setPath(JSON.parse(cachedPaths))
        } else {
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


    }, [router.isFallback])

    if (router.isFallback || (isProtected && checking)) {
        return <LoadingSpinner />
    }

    if (isProtected && !isAuthenticated) {
        return <LoadingSpinner />
    }

    // Use dynamic content (from protected API) if available, otherwise static props content
    const displayContent = dynamicContent || contents

    return (
        <>
            {status === "md" ? (
                <>
                    <Head>
                        <title>{filename}</title>
                        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
                    </Head>
                    <Navbar folderPath={folderPath} />
                    <div className="main lg:flex lg:mr-9 w-screen bg-paper">
                        {showToc ? (
                            <div className="hidetoc">
                                <SlugToc paths={path} />
                            </div>
                        ) : (
                            <></>
                        )}
                        {/* 桌面端：Time Machine 目录刻度轨，独占一列 */}
                        <div className="hidden lg:block flex-shrink-0">
                            <Toc content={displayContent} />
                        </div>
                        <div className="flex-1 max-w-4xl mx-auto min-w-0">
                            {/* 票据式文章头：编号行 */}
                            <div className="lg:max-w-3xl mx-auto px-4 pt-8">
                                <div className="tk-meta tk-dbl pt-3">
                                    <span>{(folderPath || '').replace(/^post\/?/, '') || 'UTOPIA'}</span>
                                    <span className="tk-leader" />
                                    {isProtected && <span className="mr-2">私密 ·</span>}
                                    <span>{formatStampDate(updatedAt) || 'UTOPIA PRESS'}</span>
                                </div>
                            </div>
                            <MarkdownArticle content={displayContent} />
                            <PageView slug={folderPath + '/' + filename} />
                            <div className="pb-10">
                                <Footer />
                            </div>
                        </div>
                    </div>

                    {/* 移动端：右缘细线目录，滑入/点按弹出 */}
                    <div className="lg:hidden">
                        <MobileToc content={displayContent} />
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
                        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
                    </Head>
                    <Navbar folderPath={folderPath} />
                    <div className="main lg:flex lg:mr-9 w-screen bg-paper">
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
    let allPaths = []

    try {
        const env = await getCfEnv()
        const db = env?.DB

        if (db) {
            // Get all post slugs for pre-rendering
            const { results: posts } = await db.prepare(
                'SELECT slug FROM posts'
            ).all()

            if (posts) {
                for (const post of posts) {
                    allPaths.push({
                        params: { slug: post.slug.split('/') }
                    })
                }
            }

            // Get all folder paths (using distinct parent paths from path_tree)
            const { results: folders } = await db.prepare(
                "SELECT DISTINCT path FROM path_tree WHERE type = 'folder'"
            ).all()

            if (folders) {
                for (const folder of folders) {
                    allPaths.push({
                        params: { slug: folder.path.split('/') }
                    })
                }
            }
        }
    } catch (e) {
        console.warn('getStaticPaths D1 fallback:', e.message)
        // Fallback: don't pre-build, generate on demand
    }

    return {
        paths: allPaths,
        fallback: 'blocking',
    }
}

export const getStaticProps = async ({ params: { slug } }) => {
    if (!slug || !Array.isArray(slug) || slug.length === 0) {
        return { notFound: true }
    }

    // Security: Block suspicious paths
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

    if (!fullPath.startsWith('post/') && !fullPath.startsWith('post')) {
        return { notFound: true }
    }

    const folderPath = slug.join("/")
    const reg = /(?:\.([^.]+))?$/

    // Check if it's a markdown file
    if (reg.exec(slug[slug.length - 1])[1] === "md") {
        // It's a markdown article — data comes exclusively from D1 + R2
        const env = await getCfEnv()
        const db = env?.DB
        if (!db) throw new Error('D1 database not available')

        const post = await db.prepare(
            'SELECT slug, title, category, is_protected, created_at, updated_at, path FROM posts WHERE slug = ?'
        ).bind(folderPath).first()

        if (!post) return { notFound: true }

        const filename = slug[slug.length - 1]
        const articleFolderPath = slug.slice(0, -1).join('/')

        // Fetch full markdown from R2 (the single source of truth for article content)
        const r2 = env?.IMAGES
        if (!r2) throw new Error('R2 bucket not available')

        const obj = await r2.get(post.slug)
        if (!obj) {
            // D1 row exists but R2 object is missing (e.g. half-finished
            // upload). 404 with a short revalidate heals automatically once
            // the object lands, instead of caching a 500.
            console.warn(`R2 object not found for post: ${post.slug}`)
            return { notFound: true, revalidate: 60 }
        }

        const raw = await obj.text()
        // Lightweight frontmatter strip (avoids heavy gray-matter library that exceeds Worker CPU limits)
        const stripped = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
        let content = normalizeImagePath(stripped)

        // For protected articles, serve masked content (B-plan)
        // Real content is fetched client-side after auth
        if (post.is_protected) {
            content = content.replace(/[^\s\n]/g, '*')
        }

        return {
            props: {
                filename,
                contents: content,
                status: "md",
                folderPath: articleFolderPath,
                isProtected: !!post.is_protected,
                updatedAt: post.updated_at || null,
            },
            revalidate: 60,
        }

    } else {
        // It might be a folder — data comes exclusively from D1
        const env = await getCfEnv()
        const db = env?.DB
        if (!db) throw new Error('D1 database not available')

        const folderContents = await getFolderContents(db, folderPath)
        if (!folderContents) return { notFound: true, revalidate: 60 }

        return {
            props: {
                status: "folder",
                folderPath,
                folderContents,
            },
            revalidate: 60,
        }
    }
}
