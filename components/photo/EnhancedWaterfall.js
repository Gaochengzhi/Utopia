import { useState, useEffect, useRef } from "react"
import { PhotoProvider, PhotoView } from "react-photo-view"
import "react-photo-view/dist/react-photo-view.css"
import NextImage from "next/image"

export function EnhancedWaterfall({ path, columns = 3 }) {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [hoveredIndex, setHoveredIndex] = useState(null)
    const [loadedImages, setLoadedImages] = useState(new Set())
    const containerRef = useRef(null)
    const [columnCount, setColumnCount] = useState(columns)

    // 响应式列数调整
    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth
            if (width < 640) setColumnCount(1)
            else if (width < 1024) setColumnCount(2)
            else if (width < 1280) setColumnCount(3)
            else if (width < 1536) setColumnCount(4)
            else setColumnCount(5)
        }

        updateColumns()
        window.addEventListener('resize', updateColumns)
        return () => window.removeEventListener('resize', updateColumns)
    }, [])

    // 鼠标位置跟踪
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                setMousePosition({
                    x: (e.clientX - rect.left - rect.width / 2) / rect.width,
                    y: (e.clientY - rect.top - rect.height / 2) / rect.height
                })
            }
        }

        document.addEventListener('mousemove', handleMouseMove)
        return () => document.removeEventListener('mousemove', handleMouseMove)
    }, [])

    // 图片预加载
    useEffect(() => {
        const imagePromises = path.map((item, index) => {
            return new Promise((resolve) => {
                const img = new Image()
                img.onload = () => {
                    setLoadedImages(prev => new Set([...prev, index]))
                    resolve()
                }
                img.onerror = resolve
                img.src = item.path
            })
        })

        Promise.all(imagePromises)
    }, [path])

    // 瀑布流布局算法
    const createMasonryLayout = () => {
        const columns = Array(columnCount).fill().map(() => [])
        const columnHeights = Array(columnCount).fill(0)

        path.forEach((item, index) => {
            // 找到最短的列
            const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))
            columns[shortestColumnIndex].push({ ...item, index })
            // 估算高度（实际应该根据图片比例计算）
            columnHeights[shortestColumnIndex] += 200 + Math.random() * 100
        })

        return columns
    }

    const masonryColumns = createMasonryLayout()

    // 3D变换计算
    const getTransform = (index) => {
        if (hoveredIndex === index) {
            const tiltX = mousePosition.y * 10
            const tiltY = mousePosition.x * -10
            return `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.05) translateZ(20px)`
        }
        return 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1) translateZ(0px)'
    }

    return (
        <div 
            ref={containerRef}
            className="enhanced-waterfall-container w-full py-8"
            style={{
                background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0c0c0c 100%)'
            }}
        >
            <PhotoProvider 
                maskOpacity={0.8} 
                pullClosable={true}
                toolbarRender={({ rotate, onRotate }) => (
                    <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                        <button
                            onClick={() => onRotate(rotate - 90)}
                            className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10"
                            title="向左旋转 90°"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.91c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/>
                            </svg>
                        </button>
                        
                        <button
                            onClick={() => onRotate(rotate + 90)}
                            className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10"
                            title="向右旋转 90°"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z"/>
                            </svg>
                        </button>

                        <button
                            onClick={() => onRotate(0)}
                            className="text-white hover:text-green-400 transition-colors p-2 rounded-full hover:bg-white/10"
                            title="重置旋转"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                            </svg>
                        </button>
                    </div>
                )}
            >
                <div 
                    className="masonry-grid"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                        gap: '1rem',
                        maxWidth: '1400px',
                        margin: '0 auto',
                        padding: '0 1rem'
                    }}
                >
                    {masonryColumns.map((column, columnIndex) => (
                        <div key={columnIndex} className="masonry-column">
                            {column.map((item) => (
                                <PhotoView key={item.index} src={item.path}>
                                    <div
                                        className="masonry-item group cursor-pointer"
                                        style={{
                                            marginBottom: '1rem',
                                            transform: getTransform(item.index),
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            transformStyle: 'preserve-3d'
                                        }}
                                        onMouseEnter={() => setHoveredIndex(item.index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    >
                                        <div className="relative overflow-hidden rounded-lg shadow-2xl">
                                            {/* 加载骨架屏 */}
                                            {!loadedImages.has(item.index) && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                                                </div>
                                            )}
                                            
                                            <NextImage
                                                src={item.path}
                                                alt=""
                                                width={1200}
                                                height={800}
                                                className={`w-full h-auto object-cover transition-all duration-500 ${
                                                    loadedImages.has(item.index) 
                                                        ? 'opacity-100 filter-none' 
                                                        : 'opacity-0 blur-sm'
                                                }`}
                                                unoptimized
                                                style={{
                                                    aspectRatio: 'auto',
                                                    minHeight: '200px'
                                                }}
                                            />
                                            
                                            {/* 悬停遮罩效果 */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <div className="absolute bottom-4 left-4 right-4">
                                                    <div className="text-white text-sm font-medium mb-1">
                                                        📸 Click to view
                                                    </div>
                                                    <div className="text-white/80 text-xs">
                                                        {item.title || 'Untitled'}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* 3D 光晕效果 */}
                                            <div 
                                                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                style={{
                                                    background: `radial-gradient(circle at ${(mousePosition.x + 1) * 50}% ${(mousePosition.y + 1) * 50}%, rgba(255,255,255,0.1) 0%, transparent 70%)`,
                                                    transform: 'translateZ(1px)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </PhotoView>
                            ))}
                        </div>
                    ))}
                </div>
            </PhotoProvider>
            
            {/* 背景装饰元素 */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 20 }, (_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white/10 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${3 + Math.random() * 4}s`
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
