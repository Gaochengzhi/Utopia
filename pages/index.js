import WaterfallCards from "/components/main/WaterfallCards"
import FileTree from "/components/main/FileTree"
import FolderList from "/components/FolderList"
import { Info } from "/components/Info"
import SkillsTags from "/components/SkillsTags"
import Head from "next/head"
import Navbar from "/components/Navbar"
import { useEffect, useState } from "react"
import { getCfEnv } from "/lib/cfContext"
import { getPathTree, getTopLevelFolders } from "/lib/data/paths"
import { getPaginatedPosts } from "/lib/data/posts"

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

    const hasStaticPosts = initialPosts && initialPosts.length > 0

    useEffect(() => {
        const loadData = async () => {
            try {
                // Only fetch posts if SSG didn't provide them
                if (!hasStaticPosts) {
                    const postsResponse = await fetch('/api/posts?page=1&limit=10')
                    const postsData = await postsResponse.json()
                    if (postsData.posts && postsData.posts.length > 0) {
                        setPosts(postsData.posts)
                        setTotalPosts(postsData.pagination?.totalPosts || postsData.posts.length)
                    }
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

                // Check authentication status (lightweight, still needed)
                const authResponse = await fetch('/api/auth/check-diary')
                const authData = await authResponse.json()
                setIsAuthenticated(authData.authenticated)

                // Only re-fetch posts if authenticated (to unmask protected content)
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
    }, [hasStaticPaths, hasStaticPosts])

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
    let paths = {}
    let initialPosts = []
    let totalPosts = 0
    let folders = []

    try {
        const env = await getCfEnv()
        const db = env?.DB

        if (db) {
            // Get path tree (shared logic from lib/data/paths.js)
            paths = await getPathTree(db)

            // Get initial posts (shared logic from lib/data/posts.js)
            const result = await getPaginatedPosts(db, { page: 1, limit: 10 })
            initialPosts = result.posts
            totalPosts = result.totalPosts

            // Get top-level folders (shared logic from lib/data/paths.js)
            folders = await getTopLevelFolders(db)
        }
    } catch (e) {
        console.error('getStaticProps failed:', e.message)
    }

    return {
        props: { paths, initialPosts, totalPosts, folders },
    }
}
