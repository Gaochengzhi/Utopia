import { useRouter } from "next/router"
import { useState, useEffect } from "react"

export function Toc({}) {
  const [toc, setToc] = useState([])
  const router = useRouter()
  function getHeadingList(list) {
    if (!Array.isArray(list)) {
      return
    }
    const reg = /h(\d)/ // 使用正则来匹配标题节点
    const levelStack = [] // 记录标题层级
    const prefixStack = [] // 记录前缀

    return list.reduce((res, node) => {
      const { localName, innerText, id } = node || {}
      const tagSplited = reg.exec(localName)
      if (!tagSplited) return res

      updateLevelList(levelStack, prefixStack, Number(tagSplited[1]))

      res.push({
        title: `${innerText}`,
        indent: prefixStack.length - 1,
        id,
      })
      return res
    }, [])
  }

  function updateLevelList(levelStack, prefixStack, current) {
    const idx = levelStack.length - 1
    const lastLevel = levelStack[idx]
    if (!lastLevel || current > lastLevel) {
      // 当前为最深层级，压入栈尾
      levelStack.push(current)
      prefixStack.push(1)
      return
    }

    if (current === lastLevel) {
      // 层级相等时，只修改前缀
      prefixStack[idx]++
    } else if (current < lastLevel) {
      // 当前层级更高，先和上一层级对比
      const preIndex = idx - 1
      const preLevel = levelStack[preIndex]
      if (!preLevel || current > preLevel) {
        // 如果preLevel不存在，则代表当前层级比顶层更高，即 [2, 3, 1] 这种情况
        // 如果preLevel比当前层级更高，即 [1, 3, 2] 这种情况
        prefixStack[idx]++
        levelStack[idx] = current
      } else {
        // 删除栈尾，继续递归
        levelStack.splice(idx, 1)
        prefixStack.splice(idx, 1)
        updateLevelList(levelStack, prefixStack, current)
      }
    }
  }

  const handleClick = (e, o) => {
    e.preventDefault()
    document.getElementById(o.id).scrollIntoView({
      behavior: "smooth",
    })
  }
  function times(str, num) {
    return num > 1 ? (str += times(str, --num)) : str
  }

  useEffect(() => {
    const titleArry = document.querySelectorAll("h1,h2,h3,h4,h5")
    titleArry.forEach((o) => {
      o.setAttribute("id", Math.floor(Math.random() * 9e9).toString())
    })

    const tree = getHeadingList(
      Array.from(document.querySelectorAll("h1,h2,h3,h4,h5"))
    )

    setToc(tree)

    // console.log(Array.from(document.querySelectorAll("h2,h3,h4,h5")))
  }, [router.asPath])
  return (
    <>
      <div className="lg:h-[88vh] overflow-y-scroll mb-4 p-4 ml-4 lg:min-w-[18rem] lg:max-w-[18rem] bg-gray-50/80 dark:bg-gray-800/40 rounded-lg backdrop-blur-sm">
        {toc.map((o) => (
          <div
            onClick={(e) => handleClick(e, o)}
            key={o.id}
            className={`flex text-sm mt-1 overflow-ellipsis transition-all ease-in firstT cursor-pointer py-1.5 px-2 rounded-md hover:bg-gray-200/60 dark:hover:bg-gray-700/60 ${
              o.indent === 0 ? 'text-gray-800 dark:text-gray-100 font-medium' :
              o.indent === 1 ? 'text-gray-700 dark:text-gray-200' :
              o.indent === 2 ? 'text-gray-600 dark:text-gray-300' :
              'text-gray-500 dark:text-gray-400'
            }`}
            style={{marginLeft: `${o.indent * 0.75}rem`}}
          >
            <div className="truncate text-left leading-5">{o.title}</div>
          </div>
        ))}
      </div>
    </>
  )
}
