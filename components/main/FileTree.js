import { useRouter } from "next/router"
import { useState, useEffect } from "react"

// Inline SVG icons to replace @ant-design/icons
const FileTextIcon = ({ className }) => (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
    </svg>
)

const FolderIcon = ({ open, className }) => (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {open ? (
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z" />
        ) : (
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        )}
    </svg>
)

const ChevronIcon = ({ expanded, className }) => (
    <svg
        className={`${className} transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="9 18 15 12 9 6" />
    </svg>
)

// Recursive tree node component
function TreeNode({ node, depth = 0, onFileClick, expandedKeys, toggleExpand }) {
    if (!node || node.title === "x") return null

    const isFolder = !node.isLeaf
    const isExpanded = expandedKeys.has(node.key)
    const displayTitle = node.isLeaf
        ? node.title?.replace(/\.[^/.]+$/, "")
        : node.title

    const handleClick = () => {
        if (isFolder) {
            toggleExpand(node.key)
        } else {
            onFileClick(node)
        }
    }

    return (
        <div>
            <div
                className="flex items-center text-sm py-1 px-2 cursor-pointer rounded-md hover:bg-gray-200/60 dark:hover:bg-gray-600/80 text-gray-700 dark:text-gray-200 transition-colors duration-150"
                style={{ paddingLeft: `${depth * 16 + 4}px` }}
                onClick={handleClick}
            >
                {isFolder && (
                    <ChevronIcon expanded={isExpanded} className="mr-1 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                )}
                {isFolder ? (
                    <FolderIcon open={isExpanded} className="mr-2 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
                ) : (
                    <span className="w-3 mr-1 flex-shrink-0" />
                )}
                {!isFolder && (
                    <FileTextIcon className="mr-2 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                )}
                <span className="truncate text-left leading-5">{displayTitle}</span>
            </div>
            {isFolder && isExpanded && node.children && (
                <div>
                    {node.children
                        .filter(child => child && child.title !== "x")
                        .map(child => (
                            <TreeNode
                                key={child.key}
                                node={child}
                                depth={depth + 1}
                                onFileClick={onFileClick}
                                expandedKeys={expandedKeys}
                                toggleExpand={toggleExpand}
                            />
                        ))}
                </div>
            )}
        </div>
    )
}

export default function FileTree({ paths }) {
    const [isTreeMode, setIsTreeMode] = useState(true)
    const [posts, setPosts] = useState([])
    const [expandedKeys, setExpandedKeys] = useState(new Set(["myrootkey"]))
    const router = useRouter()


    useEffect(() => {
        if (!isTreeMode) {
            fetch('/api/posts?limit=50')
                .then(res => res.json())
                .then(data => setPosts(data.posts || []))
                .catch(err => console.error('Failed to fetch posts:', err))
        }
    }, [isTreeMode])

    const toggleExpand = (key) => {
        setExpandedKeys(prev => {
            const next = new Set(prev)
            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }
            return next
        })
    }

    const onFileClick = (node) => {
        const fullpath = node.path ?? ""
        const filename = fullpath.split("/").pop()
        let reg = /(?:\.([^.]+))?$/
        if (reg.exec(filename)[1] === "md") {
            router.push(fullpath)
        }
    }

    const handleFileClick = (path) => {
        const filename = path.split("/").pop()
        let reg = /(?:\.([^.]+))?$/
        if (reg.exec(filename)[1] === "md") {
            router.push(path)
        }
    }

    const renderTreeMode = () => {
        if (!paths) {
            return (
                <div className="flex items-center justify-center p-4 text-gray-500 dark:text-gray-400">
                    <p>目录数据加载中...</p>
                </div>
            )
        }

        const nodesToRender = (paths.children && paths.children.length > 0 && (paths.title === 'content' || paths.key === 'myrootkey' || paths.title === 'post' || !paths.isLeaf))
            ? paths.children
            : [paths]

        return (
            <div className="min-w-[16rem] text-gray-900 dark:text-gray-100 mt-2">
                {nodesToRender.map(node => (
                    <TreeNode
                        key={node.key || node.path || Math.random().toString()}
                        node={node}
                        depth={0}
                        onFileClick={onFileClick}
                        expandedKeys={expandedKeys}
                        toggleExpand={toggleExpand}
                    />
                ))}
            </div>
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
                        <FileTextIcon className="mr-2 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                        <div className="truncate text-left leading-5">{post.title?.replace(/\.[^/.]+$/, "")}</div>
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
