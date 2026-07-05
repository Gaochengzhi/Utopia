import { useState } from "react"
import { useRouter } from "next/router"

const SearchOutlinedSvg = ({ className }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
)

export default function SearchIcon() {
    const router = useRouter()
    const [searchText, setSearchText] = useState("")
    const [reslist, setReslist] = useState([])
    const [show, setShow] = useState(false)
    const [searchVisible, setSearchVisible] = useState(false)

    const handleChangeSearchText = (e) => {
        setSearchText(e.target.value)
        // 如果输入为空，隐藏搜索结果
        if (!e.target.value.trim()) {
            setShow(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            handleSubmit()
        }
        if (e.key === "Backspace") {
            setShow(false)
        }
        if (e.key === "Escape") {
            handleCloseSearch()
        }
    }

    const handleGoToPage = (url, keyword) => {
        setShow(false)
        router.push({
            pathname: "/post/" + url + ".md",
            query: { keyword: keyword },
        })
    }

    const handleSubmit = () => {
        // 输入验证
        if (!searchText || searchText.trim().length === 0) {
            setShow(false)
            return
        }

        // 限制搜索词长度
        if (searchText.length > 100) {
            alert('搜索词过长，请输入100字符以内的关键词')
            return
        }

        fetch(`/api/search?query=` + encodeURIComponent(searchText.trim()))
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    console.error('Search error:', data.error)
                    setReslist([])
                    setShow(false)
                    return
                }

                setReslist(data.results || [])
                setShow(data.results && data.results.length > 0)
            })
            .catch((error) => {
                console.error('Search request failed:', error)
                setReslist([])
                setShow(false)
            })
    }

    const handleOpenSearch = () => {
        setSearchVisible(true)
        // 聚焦到搜索框
        setTimeout(() => {
            document.getElementById('search_input')?.focus()
        }, 100)
    }

    const handleCloseSearch = () => {
        setSearchVisible(false)
        setShow(false)
        setSearchText("")
        setReslist([])
    }

    return (
        <>
            {/* 搜索图标 */}
            <div
                className="clickable flex justify-center items-center text-2xl cursor-pointer text-ink2 hover:text-ink"
                onClick={handleOpenSearch}
            >
                <SearchOutlinedSvg />
            </div>

            {/* 搜索框 */}
            {searchVisible && (
                <div
                    className="fixed inset-0 z-50"
                    onClick={handleCloseSearch}
                >
                    <div className="flex justify-center pt-20">
                        <div
                            className="bg-paper border border-ink p-4 w-full max-w-2xl mx-4 animate-fade-in"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 搜索输入框 */}
                            <div className="relative">
                                <div className="tk-meta mb-2 !text-[0.65rem]">
                                    <span>SEARCH</span>
                                    <span className="tk-leader" />
                                    <span>检索单</span>
                                </div>
                                <div className="border border-rule flex justify-around items-center bg-chip text-base focus-within:border-ink transition-colors">
                                    <input
                                        type="text"
                                        id="search_input"
                                        value={searchText}
                                        onChange={handleChangeSearchText}
                                        onKeyDown={handleKeyDown}
                                        autoComplete="off"
                                        placeholder="搜索文章内容..."
                                        className="px-4 py-2 flex-1 focus:!outline-none bg-transparent text-ink placeholder-ink2/70"
                                    />
                                    <div
                                        className="text-ink2 flex items-center px-3 cursor-pointer hover:text-ink"
                                        onClick={handleSubmit}
                                    >
                                        <SearchOutlinedSvg />
                                    </div>
                                </div>

                                {/* 搜索结果 */}
                                <div className={show ? "mt-2 border border-rule bg-chip max-h-96 overflow-auto" : "hidden"}>
                                    {reslist.map((item, index) => {
                                        const queText = searchText.trim()
                                        const resList = item.split(":")

                                        // 安全检查：确保有足够的分割结果
                                        if (resList.length < 3) return null

                                        const url = resList[0].slice(7, -3)
                                        const lineNumber = resList[1]
                                        const content = resList.slice(2).join(':')
                                        const contentList = content.split(queText)
                                        const keyword = queText + (contentList[1] || '')

                                        return (
                                            <div
                                                key={`${item}-${index}`}
                                                className="border-b border-rule/60 p-3 hover:bg-panel cursor-pointer"
                                                onClick={() =>
                                                    handleGoToPage(
                                                        url,
                                                        keyword.toString().replace(new RegExp("\\*", "gm"), "")
                                                    )
                                                }
                                            >
                                                <div className="font-mono text-xs tracking-wider text-ink2 mb-1">
                                                    {url} · L{lineNumber}
                                                </div>
                                                <div className="text-ink2 text-sm">
                                                    <span>{contentList[0] || ''}</span>
                                                    <span className="text-accent font-bold border-b border-accent px-0.5">
                                                        {queText}
                                                    </span>
                                                    <span>{contentList[1] || ''}</span>
                                                </div>
                                            </div>
                                        )
                                    }).filter(Boolean)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </>
    )
}