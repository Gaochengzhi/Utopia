import { SearchOutlined } from "@ant-design/icons"
import { useState } from "react"
import { useRouter } from "next/router"
const config = require('../config.local.js')
export default function SearchBar({ }) {
    const router = useRouter()
    const [searchText, setSearchText] = useState("")
    const [reslist, setReslist] = useState([])
    const [show, setShow] = useState(false)

    const handleChangeSearchText = (e) => {
        setSearchText(e.target.value)
        // 如果输入为空，隐藏搜索结果
        if (!e.target.value.trim()) {
            setShow(false)
        }
    }
    const handleKeyDown = (e) => {
        if (e.key == "Enter") {
            handleSubmit()
        }
        console.log(e.key)
        if (e.key == "Backspace") {
            setShow(false)
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
        
        fetch(`http://${config.API_DOMAIN}/api/search?query=` + encodeURIComponent(searchText.trim()))
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
    return (
        <div className="relative">
            <div className="rounded-md border border-gray-400 mx-3 flex justify-around items-center bg-white text-base">
                <input
                    type="text"
                    id="search_bar"
                    value={searchText}
                    onChange={handleChangeSearchText}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    className="px-2 m-[2px] focus:!outline-none"
                />

                <div
                    className="text-gray-400 flex items-center m-1"
                    onClick={handleSubmit}
                >
                    <SearchOutlined />
                </div>
            </div>
            <div className={show ? "search_bar" : "hidden"}>
                <div className="inset-y-[32px] max-h-[30rem] overflow-auto">
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
                                className="border-b my-1 overflow-y-hidden hover:bg-gray-200 px-1 rounded-md cursor-pointer"
                                onClick={() =>
                                    handleGoToPage(
                                        url,
                                        keyword.toString().replace(new RegExp("\\*", "gm"), "")
                                    )
                                }
                            >
                                <div className="font-semibold py-1">
                                    {url}：第{lineNumber}行
                                </div>
                                <div className="text-gray-600 text-sm pb-1">
                                    <div className="inline">{contentList[0] || ''}</div>
                                    <div className="inline text-blue-400 font-bold">
                                        {queText}
                                    </div>
                                    <div className="inline">{contentList[1] || ''}</div>
                                </div>
                            </div>
                        )
                    }).filter(Boolean)}
                </div>
            </div>
        </div>
    )
}
