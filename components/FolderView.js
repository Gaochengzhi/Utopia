import Link from "next/link"
import Breadcrumb from "/components/Breadcrumb"
import { Footer } from "/components/footer"

function formatRelativeTime(dateStr) {
    if (!dateStr) return null
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    const now = Date.now()
    const diff = now - date.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 30) return `${days} 天前`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months} 个月前`
    const years = Math.floor(days / 365)
    return `${years} 年前`
}

export default function FolderView({ folderPath, folderContents }) {
    const folders = (folderContents || []).filter(i => i.isFolder)
    const articles = (folderContents || []).filter(i => !i.isFolder)

    return (
        <div className="flex-1 max-w-7xl mx-auto p-4">
            <div className="lg:max-w-6xl mx-auto mt-10">
                <Breadcrumb folderPath={folderPath} isNavbar={false} />

                {/* 子文件夹 */}
                {folders.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-8">
                        {folders.map((item) => (
                            <Link key={item.path} href={item.path}>
                                <div className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 hover:-translate-y-1 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200">
                                    <span className="text-lg">📁</span>
                                    <span className="text-base font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                        {item.name}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* 文章列表：标题 + 时间胶囊 */}
                {articles.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                        {articles.map((item) => {
                            const relTime = formatRelativeTime(item.time)
                            return (
                                <Link key={item.path} href={item.path}>
                                    <div className="group cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:scale-[1.02] hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 ease-out">
                                        <span className="text-base flex-shrink-0">📄</span>
                                        <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 whitespace-nowrap">
                                            {item.name}
                                        </span>
                                        {relTime && (
                                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-1">
                                                · {relTime}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}

                <div className="pb-10 mt-10">
                    <Footer />
                </div>
            </div>
        </div>
    )
}
