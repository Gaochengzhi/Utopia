import WaterfallCards from "/components/main/WaterfallCards"
import FileTree from "/components/main/FileTree"
import FolderList from "/components/FolderList"
import { Info } from "/components/Info"
import SkillsTags from "/components/SkillsTags"
import matter from "gray-matter"
import Head from "next/head"
import Navbar from "/components/Navbar"
import { useEffect, useState } from "react"

export default function Home({ paths, initialPosts, totalPosts, folders }) {
    const [posts, setPosts] = useState(initialPosts)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        localStorage.setItem("paths", JSON.stringify(paths))

        // Check authentication status
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/auth/check-diary')
                const data = await response.json()
                setIsAuthenticated(data.authenticated)

                // If authenticated, refresh posts to show unmasked content
                if (data.authenticated) {
                    const postsResponse = await fetch('/api/posts?page=1&limit=10')
                    const postsData = await postsResponse.json()
                    if (postsData.posts) {
                        setPosts(postsData.posts)
                    }
                }
            } catch (error) {
                console.error('Failed to check auth:', error)
            }
        }

        checkAuth()
    }, [])

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
                <div className="lg:hidden mt-16 -mb-16">
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
                    />
                </div>
            </div>
        </>
    )
}

export const getStaticProps = async () => {
    const fs = require('fs')
    const path = require('path')
    const { readAllFile } = require('/components/util/readAllfile')
    const { normalizeImagePath } = require('/components/util/imageUtils')
    const { isProtectedPath, maskContent } = require('/lib/auth')

    let infoArray = await readAllFile("post", (i) => i)

    // 按时间排序，最新的在前
    const sortedPosts = infoArray.SortedInfoArray.sort((a, b) =>
        new Date(b.time) - new Date(a.time)
    )

    // 只加载第一页数据 (前10篇文章)
    const initialPosts = sortedPosts.slice(0, 10).map((o) => {
        const fullpath = o.path
        const rawMarkdown = fs.readFileSync(fullpath).toString()
        const normalizedMarkdown = normalizeImagePath(rawMarkdown)
        const markDownWithoutYarm = matter(normalizedMarkdown)

        // 增加预览内容长度以适应卡片显示
        let content =
            markDownWithoutYarm.content.length > 1500
                ? markDownWithoutYarm.content.slice(0, 1500) + "..."
                : markDownWithoutYarm.content

        // 如果是受保护的文章，标记为加密并遮罩内容
        const isProtected = isProtectedPath(fullpath)
        if (isProtected) {
            content = maskContent(content)
            o.isProtected = true
        }

        o.content = content
        return o
    })

    // 读取 post 文件夹的一级子目录（只显示文件夹）
    const postPath = path.join(process.cwd(), "post")
    const items = fs.readdirSync(postPath)
    const folders = items
        .filter(item => !item.startsWith('.')) // 过滤隐藏文件
        .map(item => {
            const itemPath = path.join(postPath, item)
            const itemStats = fs.statSync(itemPath)
            return {
                name: item,
                path: `/post/${item}`,
                isFolder: itemStats.isDirectory()
            }
        })
        .filter(item => item.isFolder) // 只保留文件夹
        .sort((a, b) => a.name.localeCompare(b.name)) // 按字母排序

    return {
        props: {
            paths: infoArray.InfoArray,
            initialPosts,
            totalPosts: sortedPosts.length,
            folders,
        },
        revalidate: 1,
    }
}
