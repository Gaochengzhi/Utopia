import { useState, useEffect, useRef, useCallback } from "react"
import { PhotoProvider, PhotoView } from "react-photo-view"
import "react-photo-view/dist/react-photo-view.css"
import { getCdnThumbUrl, getCdnFullUrl, CDN_BASE, handleCdnError } from "/lib/cdnUrl"

export function Walls({ path, scrollDirection = 'horizontal' }) {
    const [loadedImages, setLoadedImages] = useState(new Set())
    const [isPaused, setIsPaused] = useState(false)
    const [isDraggingActive, setIsDraggingActive] = useState(false)
    const containerRef = useRef(null)
    const contentRef = useRef(null)
    const isDragging = useRef(false)
    const startPos = useRef({ x: 0, y: 0 })
    const currentOffset = useRef(0)
    const animationId = useRef(null)

    // 为PhotoView生成全尺寸压缩图URL — 直连 CDN
    const getFullSizeUrl = (originalPath) => getCdnFullUrl(originalPath)

    // 获取缩略图URL — 直连 CDN
    const getThumbnailUrl = (originalPath) => getCdnThumbUrl(originalPath)

    const markLoaded = useCallback((index) => {
        setLoadedImages(prev => {
            if (prev.has(index)) return prev
            const next = new Set(prev)
            next.add(index)
            return next
        })
    }, [])

    // 应用内容变换 - 正确拖拽内容而不是容器
    const applyContentTransform = useCallback((offset) => {
        const content = contentRef.current
        if (!content) return

        if (scrollDirection === 'horizontal') {
            // 横向拖拽时，移动所有行
            const rows = content.querySelectorAll('.photo-row')
            rows.forEach((row) => {
                row.style.transform = `translateX(${offset}px)`
            })
        } else {
            // 纵向拖拽时移动整个内容
            content.style.transform = `translateY(${offset}px)`
        }
    }, [scrollDirection])

    // 重置内容位置
    const resetContentTransform = useCallback(() => {
        const content = contentRef.current
        if (!content) return

        if (scrollDirection === 'horizontal') {
            const rows = content.querySelectorAll('.photo-row')
            rows.forEach((row) => {
                row.style.transform = 'translateX(0)'
            })
        } else {
            content.style.transform = 'translateY(0)'
        }
        currentOffset.current = 0
    }, [scrollDirection])

    // 定义不同的图片尺寸模式 - 响应式设计
    const getImageSize = (index) => {
        // 桌面端尺寸（更大）
        const desktopPatterns = [
            { width: '280px', height: '210px' },   // 标准小
            { width: '360px', height: '210px' },   // 宽一些
            { width: '240px', height: '240px' },   // 正方形小
            { width: '300px', height: '225px' },   // 标准
            { width: '420px', height: '210px' },   // 长条形
            { width: '300px', height: '300px' },   // 正方形大
            { width: '330px', height: '250px' },   // 中等偏大
            { width: '240px', height: '180px' },   // 迷你
            { width: '480px', height: '240px' },   // 超宽
        ]

        // 移动端尺寸（保持原有尺寸）
        const mobilePatterns = [
            { width: '180px', height: '135px' },   // 标准小
            { width: '240px', height: '135px' },   // 宽一些
            { width: '160px', height: '160px' },   // 正方形小
            { width: '200px', height: '150px' },   // 标准
            { width: '280px', height: '140px' },   // 长条形
            { width: '200px', height: '200px' },   // 正方形大
            { width: '220px', height: '165px' },   // 中等偏大
            { width: '160px', height: '120px' },   // 迷你
            { width: '320px', height: '160px' },   // 超宽
        ]

        // 返回响应式尺寸对象
        const desktopSize = desktopPatterns[index % desktopPatterns.length]
        const mobileSize = mobilePatterns[index % mobilePatterns.length]

        return {
            desktop: desktopSize,
            mobile: mobileSize
        }
    }

    // 生成较大的随机间距范围
    const getRandomSpacing = (index) => {
        // 使用索引作为种子确保一致性
        const seed = index * 12345
        const random1 = (seed % 200) / 100 - 1        // -1 到 1
        const random2 = ((seed * 7) % 200) / 100 - 1  // -1 到 1
        const random3 = ((seed * 13) % 200) / 100 - 1 // -1 到 1
        const random4 = ((seed * 19) % 200) / 100 - 1 // -1 到 1

        return {
            marginLeft: `${random1 * 10}px`,      // -10px 到 10px
            marginRight: `${random2 * 10}px`,     // -10px 到 10px
            marginTop: `${random3 * 8}px`,        // -8px 到 8px
            marginBottom: `${random4 * 8}px`,     // -8px 到 8px
        }
    }

    // 将图片分配到三行，并添加尺寸和间距信息
    const distributeToRows = () => {
        const rows = [[], [], []]
        path.forEach((item, index) => {
            const sizeOptions = getImageSize(index)
            const spacing = getRandomSpacing(index)
            rows[index % 3].push({
                ...item,
                originalIndex: index,
                sizeOptions,
                spacing
            })
        })
        return rows
    }

    const rows = distributeToRows()

    // 优化的拖拽事件处理
    const handleStart = useCallback((clientX, clientY, e) => {
        // 如果点击的是图片，不启动拖拽
        if (e.target.tagName === 'IMG' || e.target.closest('.responsive-photo-item')) {
            return
        }

        if (animationId.current) {
            cancelAnimationFrame(animationId.current)
            animationId.current = null
        }

        isDragging.current = true
        setIsDraggingActive(true)
        startPos.current = { x: clientX, y: clientY }
        currentOffset.current = 0

        setIsPaused(true)

        const container = containerRef.current
        if (container) {
            container.style.cursor = 'grabbing'
            container.style.userSelect = 'none'
        }
    }, [])

    const handleMove = useCallback((clientX, clientY) => {
        if (!isDragging.current) return

        const deltaX = clientX - startPos.current.x
        const deltaY = clientY - startPos.current.y

        // 根据滚动方向计算偏移
        if (scrollDirection === 'horizontal') {
            currentOffset.current = deltaX * 0.8
        } else {
            currentOffset.current = deltaY * 0.8
        }

        // 应用变换到内容
        applyContentTransform(currentOffset.current)
    }, [scrollDirection, applyContentTransform])

    const handleEnd = useCallback(() => {
        isDragging.current = false
        setIsDraggingActive(false)

        const container = containerRef.current
        if (container) {
            container.style.cursor = 'grab'
            container.style.userSelect = ''
        }

        // 延迟重置以保持平滑过渡
        setTimeout(() => {
            setIsPaused(false)
            resetContentTransform()
        }, 500)
    }, [resetContentTransform])

    // 鼠标事件
    const handleMouseDown = useCallback((e) => {
        handleStart(e.clientX, e.clientY, e)
    }, [handleStart])

    const handleMouseMove = useCallback((e) => {
        if (isDragging.current) {
            e.preventDefault()
            handleMove(e.clientX, e.clientY)
        }
    }, [handleMove])

    const handleMouseUp = useCallback(() => {
        handleEnd()
    }, [handleEnd])

    // 触摸事件
    const handleTouchStart = useCallback((e) => {
        const touch = e.touches[0]
        handleStart(touch.clientX, touch.clientY, e)
    }, [handleStart])

    const handleTouchMove = useCallback((e) => {
        if (isDragging.current) {
            e.preventDefault()
            const touch = e.touches[0]
            handleMove(touch.clientX, touch.clientY)
        }
    }, [handleMove])

    const handleTouchEnd = useCallback(() => {
        handleEnd()
    }, [handleEnd])

    // 清理
    useEffect(() => {
        return () => {
            if (animationId.current) {
                cancelAnimationFrame(animationId.current)
            }
        }
    }, [])

    return (
        <div className="w-full">
            <PhotoProvider
                maskOpacity={0.5}
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
                {/* 根据滚动方向显示不同布局 */}
                {scrollDirection === 'horizontal' ? (
                    /* 主页横向滚动布局 - 三行错落有致 */
                    <div
                        ref={containerRef}
                        className="overflow-hidden cursor-grab"
                        style={{
                            cursor: isDragging.current ? 'grabbing' : 'grab'
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div ref={contentRef} className="space-y-1" style={{ perspective: '1000px' }}>
                            {rows.map((row, rowIndex) => (
                                <div
                                    key={rowIndex}
                                    className="flex items-end photo-row"
                                    style={{
                                        // 为每行添加轻微的垂直偏移
                                        transform: `translateY(${rowIndex % 2 === 0 ? '-2px' : '9px'})`,
                                        // 动画控制 - 拖拽时暂停
                                        animation: (isPaused || isDraggingActive) ? 'none' : `autoScrollRight ${60 + rowIndex * 10}s linear infinite`,
                                        animationPlayState: (isPaused || isDraggingActive) ? 'paused' : 'running',
                                        // 确保有足够的宽度
                                        width: 'max-content',
                                        display: 'flex',
                                        gap: '1rem',
                                        willChange: isDraggingActive ? 'transform' : 'auto',
                                        transition: isDraggingActive ? 'none' : 'transform 0.3s ease',
                                        // 进一步减少行的上下边距
                                        paddingTop: `${(rowIndex % 3)}px`,
                                        paddingBottom: `${((rowIndex + 1) % 3)}px`,
                                    }}
                                >
                                    {/* 渲染图片两次实现无缝循环 */}
                                    {[...row, ...row].map((item, index) => {
                                        const isLoaded = loadedImages.has(item.originalIndex)

                                        return (
                                            <PhotoView
                                                key={`${item.key}-${index}`}
                                                src={getFullSizeUrl(item.path)}
                                                render={({ attrs, scale }) => (
                                                    <img {...attrs} crossOrigin="anonymous" />
                                                )}
                                            >
                                                <div
                                                    className={`flex-shrink-0 group cursor-pointer relative overflow-hidden rounded-lg responsive-photo-item hover:z-10 ${isDraggingActive ? '' : 'transition-all duration-300'
                                                        }`}
                                                    onClick={(e) => {
                                                        e.stopPropagation() // 阻止事件冒泡
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation() // 阻止拖拽事件
                                                    }}
                                                    style={{
                                                        // 移动端尺寸（默认）
                                                        width: item.sizeOptions.mobile.width,
                                                        height: item.sizeOptions.mobile.height,
                                                        // 恢复完整的变换效果，拖拽时轻微简化
                                                        transform: isDraggingActive
                                                            ? `rotate(${(item.originalIndex % 7 - 3) * 0.3}deg) translateY(${(item.originalIndex % 5 - 2) * 1.5}px)`
                                                            : `rotate(${(item.originalIndex % 7 - 3) * 0.5}deg) translateY(${(item.originalIndex % 5 - 2) * 2}px)`,
                                                        // 桌面端尺寸通过CSS变量传递
                                                        '--desktop-width': item.sizeOptions.desktop.width,
                                                        '--desktop-height': item.sizeOptions.desktop.height,
                                                        // 随机间距
                                                        ...item.spacing,
                                                        // 性能优化
                                                        willChange: isDraggingActive ? 'transform' : 'auto',
                                                        backfaceVisibility: 'hidden',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isDraggingActive) {
                                                            e.currentTarget.style.transform = `scale(1.2) rotateX(3deg) rotateY(5deg) rotateZ(2deg) translateY(-15px) translateZ(30px)`
                                                            e.currentTarget.style.transformStyle = 'preserve-3d'
                                                            e.currentTarget.style.perspective = '1000px'
                                                            e.currentTarget.style.zIndex = '50' // 确保在最上层
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isDraggingActive) {
                                                            e.currentTarget.style.transform = `rotate(${(item.originalIndex % 7 - 3) * 0.5}deg) translateY(${(item.originalIndex % 5 - 2) * 2}px)`
                                                            e.currentTarget.style.transformStyle = ''
                                                            e.currentTarget.style.perspective = ''
                                                            e.currentTarget.style.zIndex = ''
                                                        }
                                                    }}
                                                >
                                                    {/* 加载状态 - 横向墙使用轻量占位，无spinner */}
                                                    {!isLoaded && (
                                                        <div className="absolute inset-0 bg-gray-800/60 rounded-lg"></div>
                                                    )}

                                                    <img
                                                        src={getThumbnailUrl(item.path)}
                                                        crossOrigin="anonymous"
                                                        className={`absolute inset-0 w-full h-full object-cover rounded-lg ${
                                                            isLoaded
                                                            ? 'opacity-100'
                                                            : 'opacity-0'
                                                            } ${isDraggingActive
                                                                ? 'transition-none'
                                                                : 'transition-opacity duration-300'
                                                            }`}
                                                        alt=""
                                                        loading={index < 4 ? 'eager' : 'lazy'}
                                                        decoding="async"
                                                        onLoad={() => markLoaded(item.originalIndex)}
                                                        onError={handleCdnError}
                                                    />

                                                    {/* 光影效果 - 拖拽时简化但保留 */}
                                                    <div className={`absolute inset-0 rounded-lg pointer-events-none ${isDraggingActive
                                                        ? 'bg-gradient-to-br from-white/5 via-transparent to-black/10'
                                                        : 'bg-gradient-to-br from-white/10 via-transparent to-black/20'
                                                        }`} />
                                                </div>
                                            </PhotoView>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* 分类页面3列网格布局 */
                    <div className="w-full p-4">
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4 max-w-none">
                            {path.map((item, index) => {
                                const isLoaded = loadedImages.has(index)
                                
                                return (
                                    <PhotoView
                                        key={item.key}
                                        src={getFullSizeUrl(item.path)}
                                        render={({ attrs, scale }) => (
                                            <img {...attrs} crossOrigin="anonymous" />
                                        )}
                                    >
                                        <div className="aspect-square group cursor-pointer relative overflow-hidden rounded-lg hover:scale-105 transition-transform duration-300">
                                            {/* 加载状态 */}
                                            {!isLoaded && (
                                                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center rounded-lg">
                                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                </div>
                                            )}

                                    <img
                                                src={getThumbnailUrl(item.path)}
                                                crossOrigin="anonymous"
                                                className={`absolute inset-0 w-full h-full object-cover rounded-lg transition-opacity duration-300 ${
                                                    isLoaded ? 'opacity-100' : 'opacity-0'
                                                }`}
                                                alt=""
                                                loading={index < 24 ? 'eager' : 'lazy'}
                                                decoding="async"
                                                fetchpriority={index < 8 ? 'high' : 'auto'}
                                                onLoad={() => markLoaded(index)}
                                                onError={handleCdnError}
                                            />

                                            {/* 简单的悬停遮罩 */}
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                                        </div>
                                    </PhotoView>
                                )
                            })}
                        </div>
                    </div>
                )}
            </PhotoProvider>
        </div>
    )
}
