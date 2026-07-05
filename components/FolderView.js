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
            <div className="lg:max-w-4xl mx-auto mt-10">
                <Breadcrumb folderPath={folderPath} isNavbar={false} />

                {/* 子文件夹：索引页签 */}
                {folders.length > 0 && (
                    <div className="flex flex-wrap gap-2.5 mb-8 mt-6">
                        {folders.map((item) => (
                            <Link key={item.path} href={item.path}>
                                <span className="tk-tab cursor-pointer">
                                    {item.name} /
                                </span>
                            </Link>
                        ))}
                    </div>
                )}

                {/* 文章列表：账本式条目，标题 + 点线 + 时间 */}
                {articles.length > 0 && (
                    <div className="tk-dbl mt-6">
                        {articles.map((item) => {
                            const relTime = formatRelativeTime(item.time)
                            return (
                                <Link key={item.path} href={item.path}>
                                    <div className="group flex items-baseline cursor-pointer border-b border-rule/60 py-3 px-1 hover:bg-chip transition-colors duration-200">
                                        <span className="text-base text-ink group-hover:text-accent transition-colors duration-200 line-clamp-1 min-w-0">
                                            {item.name}
                                        </span>
                                        <span className="tk-leader" />
                                        {relTime && (
                                            <span className="font-mono text-xs text-ink2 whitespace-nowrap tracking-wider">
                                                {relTime}
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
