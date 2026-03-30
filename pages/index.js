import WaterfallCards from "/components/main/WaterfallCards"
import FileTree from "/components/main/FileTree"
import FolderList from "/components/FolderList"
import { Info } from "/components/Info"
import SkillsTags from "/components/SkillsTags"
import Head from "next/head"
import Navbar from "/components/Navbar"
import { useEffect, useState } from "react"
import { getCfEnv } from "/lib/cfContext"
import { normalizeImageUrl } from "/components/util/imageUtils"

export default function Home({ paths: staticPaths, initialPosts, totalPosts: staticTotalPosts, folders: staticFolders }) {
    const [posts, setPosts] = useState(initialPosts || [])
    const [totalPosts, setTotalPosts] = useState(staticTotalPosts || 0)
    const [paths, setPaths] = useState(staticPaths || {})
    const [folders, setFolders] = useState(staticFolders || [])
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const hasStaticPaths = staticPaths && Object.keys(staticPaths).length > 0

    useEffect(() => {
        if (paths && Object.keys(paths).length > 0) {
            localStorage.setItem("paths", JSON.stringify(paths))
        }
    }, [paths])

    useEffect(() => {
        const loadData = async () => {
            try {
                // Always fetch posts via API (getStaticProps may return empty when D1 unavailable at build)
                const postsResponse = await fetch('/api/posts?page=1&limit=10')
                const postsData = await postsResponse.json()
                if (postsData.posts && postsData.posts.length > 0) {
                    setPosts(postsData.posts)
                    setTotalPosts(postsData.pagination?.totalPosts || postsData.posts.length)
                }

                // Fetch paths if static props didn't provide them
                if (!hasStaticPaths) {
                    const pathsRes = await fetch('/api/paths')
                    const pathsData = await pathsRes.json()
                    if (pathsData.paths) {
                        setPaths(pathsData.paths)
                        localStorage.setItem("paths", JSON.stringify(pathsData.paths))
                    }
                }

                // Check authentication status
                const authResponse = await fetch('/api/auth/check-diary')
                const authData = await authResponse.json()
                setIsAuthenticated(authData.authenticated)

                // If authenticated, refresh posts to show unmasked content
                if (authData.authenticated) {
                    const authPostsResponse = await fetch('/api/posts?page=1&limit=10')
                    const authPostsData = await authPostsResponse.json()
                    if (authPostsData.posts) {
                        setPosts(authPostsData.posts)
                    }
                }
            } catch (error) {
                console.error('Failed to load data:', error)
            }
        }

        loadData()
    }, [hasStaticPaths])

    return (
        <>
            <Head>
                <title>Utopia</title>
                <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            </Head>
            <Navbar paths={paths} state={"index"} />

            {/* 全新的布局：侧边栏 + 瀑布流卡片 */}
            <div className="relative pt-8">
                {/* 左侧边栏 - 固定定位 */}
                <div className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 z-30 hidden lg:block">
                    <div className="h-full p-6 bg-white dark:bg-gray-900 shadow-lg">
                        <div className="flex flex-col items-center space-y-6 mb-8">
                            <Info />
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 h-[calc((100vh-10rem)/2)] overflow-y-auto overflow-x-hidden  scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                            <FileTree paths={paths} />
                        </div>
                    </div>
                </div>

                {/* Mobile layout */}
                <div className="lg:hidden mt-16">
                    {/* Profile info with mobile variant */}
                    <Info variant="mobile" showSkills={false} />
                    {/* 标签胶囊 */}
                    <SkillsTags />
                    {/* 目录 */}
                </div>

                {/* 主内容区域 - 瀑布流卡片 */}
                <div className="lg:ml-80">
                    {/* 一级目录列表 */}
                    <FolderList folders={folders} />

                    {/* 瀑布流卡片 */}
                    <WaterfallCards
                        initialPosts={posts}
                        totalPosts={totalPosts}
                        isAuthenticated={isAuthenticated}
                    />
                </div>
            </div>
        </>
    )
}

export const getStaticProps = async () => {
    // In Cloudflare environment, we use D1 via getCloudflareContext
    // During build, the adapter provides access to bindings
    let paths = {}
    let initialPosts = []
    let totalPosts = 0
    let folders = []

    try {
        const env = await getCfEnv()
        const db = env?.DB

        if (db) {
            // Get path tree
            const { results: treeRows } = await db.prepare(
                'SELECT * FROM path_tree ORDER BY path'
            ).all()

            if (treeRows && treeRows.length > 0) {
                // Rebuild tree structure (same as paths API)
                const nodeMap = {}
                const childrenMap = {}

                for (const row of treeRows) {
                    const node = {
                        title: row.title,
                        path: row.path,
                        key: row.node_key || String(Math.floor(Math.random() * 9e9)),
                        isLeaf: !!row.is_leaf,
                        type: row.type,
                        time: row.created_at,
                    }
                    if (!row.is_leaf) node.children = []
                    nodeMap[row.path] = node

                    const parentKey = row.parent_path || '__root__'
                    if (!childrenMap[parentKey]) childrenMap[parentKey] = []
                    childrenMap[parentKey].push(node)
                }

                for (const [parentPath, children] of Object.entries(childrenMap)) {
                    if (parentPath === '__root__') continue
                    if (nodeMap[parentPath]) nodeMap[parentPath].children = children
                }

                const roots = childrenMap['__root__'] || []
                paths = roots.length === 1 ? roots[0] : {
                    title: 'content', key: 'myrootkey', isLeaf: false,
                    type: 'folder', children: roots,
                }
            }

            // Get initial posts (first page)
            const countResult = await db.prepare('SELECT COUNT(*) as total FROM posts').first()
            totalPosts = countResult?.total || 0

            const { results: postRows } = await db.prepare(`
                SELECT slug, title, category, content_preview, first_image,
                       is_protected, created_at, path
                FROM posts
                ORDER BY created_at DESC
                LIMIT 10
            `).all()

            initialPosts = (postRows || []).map(row => ({
                path: row.slug,
                title: row.title,
                time: row.created_at,
                isLeaf: true,
                type: 'file',
                key: String(Math.floor(Math.random() * 9e9)),
                content: row.is_protected ? '****' : (row.content_preview || ''),
                isProtected: !!row.is_protected,
                firstImage: normalizeImageUrl(row.first_image) || null,
            }))

            // Get top-level folders from path_tree (preserves hierarchy)
            const { results: folderRows } = await db.prepare(`
                SELECT title, path, type FROM path_tree 
                WHERE parent_path = 'post' AND type = 'folder'
                ORDER BY title
            `).all()

            folders = (folderRows || []).map(row => ({
                name: row.title,
                path: `/${row.path}`,
                isFolder: true,
            }))
        }
    } catch (e) {
        console.error('getStaticProps failed:', e.message)
    }

    return {
        props: { paths, initialPosts, totalPosts, folders },
    }
}
