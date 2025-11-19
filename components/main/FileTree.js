import { Tree } from "antd"
import { useRouter } from "next/router"
import { useState, useEffect } from "react"
import { FileTextOutlined } from "@ant-design/icons"
import { tree2list } from "../util/treeSort"
const { DirectoryTree } = Tree

export default function FileTree({ paths }) {
    const [isTreeMode, setIsTreeMode] = useState(true)
    const [posts, setPosts] = useState([])
    const router = useRouter()

    // 处理文件名，去掉扩展名
    const removeFileExtension = (filename) => {
        return filename ? filename.replace(/\.[^/.]+$/, "") : filename
    }

    // 递归处理树形数据，去掉文件名后缀
    const processTreeData = (node) => {
        if (!node) return node

        const processed = { ...node }

        // 如果是文件（有isLeaf属性且为true），处理title
        if (processed.isLeaf && processed.title) {
            processed.title = removeFileExtension(processed.title)
        }

        // 递归处理子节点
        if (processed.children && Array.isArray(processed.children)) {
            processed.children = processed.children.map(processTreeData)
        }

        return processed
    }

    useEffect(() => {
        if (!isTreeMode) {
            fetch('/api/posts?limit=50')
                .then(res => res.json())
                .then(data => setPosts(data.posts || []))
                .catch(err => console.error('Failed to fetch posts:', err))
        }
    }, [isTreeMode])

    const onSelect = (_, info) => {
        const fullpath = info.path ?? ""
        const filname = fullpath.split("/").pop()
        let reg = /(?:\.([^.]+))?$/
        if (reg.exec(filname)[1] === "md") {
            router.push(fullpath)
        }
    }

    const handleFileClick = (path) => {
        const filname = path.split("/").pop()
        let reg = /(?:\.([^.]+))?$/
        if (reg.exec(filname)[1] === "md") {
            router.push(path)
        }
    }

    const renderTreeMode = () => {
        // Check if paths data is available
        if (!paths) {
            return (
                <div className="flex items-center justify-center p-4 text-gray-500 dark:text-gray-400">
                    <p>目录数据加载中...</p>
                </div>
            )
        }

        return (
            <DirectoryTree
                className="transition-all duration-150 ease-in min-w-[16rem] text-gray-900 dark:text-gray-100"
                multiple
                selectable={false}
                onClick={onSelect}
                defaultExpandedKeys={["myrootkey"]}
                treeData={[processTreeData(paths)]}
            />
        )
    }

    const renderFlatMode = () => {
        return (
            <div className="min-w-[16rem] text-gray-900 dark:text-gray-100">
                {posts.map((post) => (
                    <div
                        key={post.path}
                        onClick={() => handleFileClick(post.path)}
                        className="flex items-center text-sm mt-1 overflow-ellipsis transition-all ease-in cursor-pointer py-1 px-3 hover:bg-gray-200/60 dark:hover:bg-gray-600/80 text-gray-700 dark:text-gray-200"
                    >
                        <FileTextOutlined className="mr-2 text-gray-500 dark:text-gray-400" />
                        <div className="truncate text-left leading-5">{removeFileExtension(post.title)}</div>
                    </div>
                ))}
            </div>
        )
    }

    const toggleViewMode = () => {
        setIsTreeMode(!isTreeMode)
    }

    return (
        <>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200/60 dark:border-gray-700/60 px-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isTreeMode ? '树状目录' : '文章列表'}
                </span>
                <button
                    onClick={toggleViewMode}
                    className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                    aria-label={isTreeMode ? '切换到列表视图' : '切换到树状视图'}
                >
                    {isTreeMode ? (
                        // List icon for flat mode
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 10h16M4 14h16M4 18h16"
                            />
                        </svg>
                    ) : (
                        // Tree icon for tree mode
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 21v-4a2 2 0 012-2h4a2 2 0 012 2v4"
                            />
                        </svg>
                    )}
                </button>
            </div>
            {isTreeMode ? renderTreeMode() : renderFlatMode()}
        </>
    )
}
