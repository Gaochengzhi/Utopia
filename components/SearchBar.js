import { SearchOutlined } from "@ant-design/icons"
import { useState } from "react"
import { useRouter } from "next/router"
export default function SearchBar({}) {
  const router = useRouter()
  const [searchText, setSearchText] = useState("")
  const [reslist, setReslist] = useState([])
  const [show, setShow] = useState(false)

  const handelChangeSearchText = (e) => {
    setSearchText(e.target.value)
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
    // http://124.220.179.145:8888/

    let tmp
    fetch("http://124.220.179.145:8888/api/hello?que=" + searchText)
      // fetch("http://localhost:3000/api/hello?que=" + searchText)
      .then((response) => response.json())
      .then((json) => {
        tmp = json.name.split(/\r?\n/)
        tmp.pop()
        setReslist(tmp)
        setShow(true)
      })
  }
  return (
    <div className="relative">
      <div className="rounded-md border border-gray-400 mx-3 flex justify-around items-center bg-white text-base">
        <input
          type="text"
          id="search_bar"
          value={searchText}
          onChange={handelChangeSearchText}
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
          {reslist.map((item) => {
            const queText = searchText
            const resList = item.split(":")
            const url = resList[0].slice(7, -3)
            const lineNumber = resList[1]
            const contentList = resList[2].split(queText)
            const keyword = queText + contentList[1]
            return (
              <div
                key={item}
                className="border-b my-1 overflow-y-hidden hover:bg-gray-200 px-1 rounded-md"
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
                  <div className="inline">{contentList[0]}</div>
                  <div className="inline text-blue-400 font-bold">
                    {queText}
                  </div>
                  <div className="inline">{contentList[1]}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
