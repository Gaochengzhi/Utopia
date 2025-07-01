import WaterfallCards from "/components/main/WaterfallCards"
import FileTree from "/components/main/FileTree"
import { Info } from "/components/Info"
import ShareLInk from "/components/ShareLInk"
import matter from "gray-matter"
import Head from "next/head"
import Navbar from "/components/Navbar"
import fs from "fs"
import { useEffect } from "react"
import { readAllFile } from "/components/util/readAllfile"
import Cookies from "js-cookie"
const config = require('../config.local.js')

export default function Home({ paths, initialPosts, totalPosts }) {
    useEffect(() => {
        localStorage.setItem("paths", JSON.stringify(paths))
        Cookies.set("refreshed", "true", { expires: 1 })
        if (!Cookies.get("refreshed")) {
            localStorage.setItem("refreshed", "true")
            setTimeout(() => window.location.reload(), 3000)
        }
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
                    <div className="h-full p-6 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-lg">
                        <div className="flex flex-col items-center space-y-6 mb-8">
                            <Info />
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 max-h-[calc(100vh-20rem)] overflow-y-auto border border-gray-200 dark:border-gray-600">
                            <FileTree paths={paths} />
                        </div>
                    </div>
                </div>

                {/* 移动端布局 */}
                <div className="lg:hidden mt-16">
                    {/* 个人信息容器 - 添加响应式宽度控制 */}
                    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-center p-4">
                            <div className="w-full max-w-lg">
                                {/* 社交媒体链接 */}
                                <div className="flex justify-center items-center space-x-4 mb-4">
                                    <ShareLInk />
                                </div>

                                {/* 头像和基本信息 */}
                                <div className="flex items-center space-x-4 mb-4">
                                    <div className="flex justify-center items-center rounded-full p-1 border-gray-400 border-dotted border-2 shadow-md">
                                        <img src="/icon.jpeg" alt="" className="w-16 h-16 rounded-full object-cover" />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="text-xl font-light text-gray-900 dark:text-gray-100">@Taitan_Pascal</div>
                                        
                                        {/* 彩色点击提示 */}
                                        <div className="text-base font-serif flex items-center mt-1">
                                            <div className="inline m-[-1px] text-purple-600 text-sm">C</div>
                                            <div className="inline m-[-1px] text-orange-600 text-sm">l</div>
                                            <div className="inline m-[-1px] text-yellow-600 text-sm">i</div>
                                            <div className="inline m-[-1px] text-green-600 text-sm">c</div>
                                            <div className="inline m-[-1px] text-blue-600 text-sm">k</div>
                                            <div className="inline text-lg ml-1">👇</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 职业描述 */}
                                <div className="text-gray-500 dark:text-gray-400 text-sm space-y-1 mb-3">
                                    <div className="jobs cursor-pointer">🌈 瓦梁湖生态观察小队副队长</div>
                                    <div className="jobs cursor-pointer">👨🏻‍💻 Software Engineer</div>
                                    <div className="jobs cursor-pointer">📸 Photographer</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 标签胶囊 */}
                    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                        <div className="flex justify-center">
                            <div className="w-full max-w-lg">
                                <div className="flex flex-wrap justify-center gap-2">
                                    <div className="mytag bg-orange-600 text-white text-xs px-3 py-1 rounded-full">Unix/Linux</div>
                                    <div className="mytag bg-purple-500 text-white text-xs px-3 py-1 rounded-full">film shoot</div>
                                    <div className="mytag bg-sky-500 text-white text-xs px-3 py-1 rounded-full">React</div>
                                    <div className="mytag bg-gray-800 text-white text-xs px-3 py-1 rounded-full">Nextjs</div>
                                    <div className="mytag bg-green-600 text-white text-xs px-3 py-1 rounded-full">nvim</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 目录 */}
                    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex justify-center p-4">
                            <div className="w-full max-w-lg">
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3 max-h-60 overflow-y-auto">
                                    <FileTree paths={paths} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 主内容区域 - 瀑布流卡片 */}
                <div className="lg:ml-80 pt-8">
                    <WaterfallCards 
                        initialPosts={initialPosts} 
                        totalPosts={totalPosts} 
                    />
                </div>
            </div>
        </>
    )
}

export const getStaticProps = async () => {
    let infoArray = await readAllFile("post", (i) => i)
    
    // 按时间排序，最新的在前
    const sortedPosts = infoArray.SortedInfoArray.sort((a, b) => 
        new Date(b.time) - new Date(a.time)
    )
    
    // 只加载第一页数据 (前10篇文章)
    const initialPosts = sortedPosts.slice(0, 10).map((o) => {
        const fullpath = o.path
        const rawMarkdown = fs
            .readFileSync(fullpath)
            .toString()
            .replace(
                new RegExp(
                    "(file://)?/Users/kounarushi/mycode/web-blog/public/.pic/",
                    "gm"
                ),
                config.IMAGE_SERVER_URL
            )
        const markDownWithoutYarm = matter(rawMarkdown)
        // 增加预览内容长度以适应卡片显示
        o.content =
            markDownWithoutYarm.content.length > 1500
                ? markDownWithoutYarm.content.slice(0, 1500) + "..."
                : markDownWithoutYarm.content
        return o
    })

    return {
        props: {
            paths: infoArray.InfoArray,
            initialPosts,
            totalPosts: sortedPosts.length,
        },
        revalidate: 1,
    }
}
