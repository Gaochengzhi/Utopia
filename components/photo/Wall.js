import { useState, useEffect, useRef, useCallback } from "react"
import { PhotoProvider, PhotoView } from "react-photo-view"
import "react-photo-view/dist/react-photo-view.css"
import { getCdnThumbUrl, getCdnFullUrl, CDN_BASE, handleCdnError } from "/lib/cdnUrl"

export function Walls({ path, scrollDirection = 'horizontal' }) {
    const [loadedImages, setLoadedImages] = useState(new Set())
    const [isDraggingActive, setIsDraggingActive] = useState(false)
    const containerRef = useRef(null)
    const contentRef = useRef(null)

    // === JS-driven scroll state (all in refs for performance) ===
    const rowRefs = useRef([])
    const offsetsRef = useRef([0, 0, 0])
    const halfWidthsRef = useRef([0, 0, 0])
    const rafRef = useRef(null)
    const isDraggingRef = useRef(false)
    const isPotentialDragRef = useRef(false)
    const dragStartXRef = useRef(0)
    const dragOffsetsRef = useRef([0, 0, 0])
    const wasDraggingRef = useRef(false)
    // Touch direction detection
    const touchStartPosRef = useRef({ x: 0, y: 0 })
    const touchDirectionRef = useRef(null) // 'horizontal' | 'vertical' | null

    // Scroll durations in seconds per row (matches old CSS animation timing)
    const DURATIONS = [60, 70, 80]

    const getFullSizeUrl = (originalPath) => getCdnFullUrl(originalPath)
    const getThumbnailUrl = (originalPath) => getCdnThumbUrl(originalPath)

    const markLoaded = useCallback((index) => {
        setLoadedImages(prev => {
            if (prev.has(index)) return prev
            const next = new Set(prev)
            next.add(index)
            return next
        })
    }, [])

    // Image size patterns
    const getImageSize = (index) => {
        const desktopPatterns = [
            { width: '280px', height: '210px' },
            { width: '360px', height: '210px' },
            { width: '240px', height: '240px' },
            { width: '300px', height: '225px' },
            { width: '420px', height: '210px' },
            { width: '300px', height: '300px' },
            { width: '330px', height: '250px' },
            { width: '240px', height: '180px' },
            { width: '480px', height: '240px' },
        ]
        const mobilePatterns = [
            { width: '180px', height: '135px' },
            { width: '240px', height: '135px' },
            { width: '160px', height: '160px' },
            { width: '200px', height: '150px' },
            { width: '280px', height: '140px' },
            { width: '200px', height: '200px' },
            { width: '220px', height: '165px' },
            { width: '160px', height: '120px' },
            { width: '320px', height: '160px' },
        ]
        return {
            desktop: desktopPatterns[index % desktopPatterns.length],
            mobile: mobilePatterns[index % mobilePatterns.length]
        }
    }

    const getRandomSpacing = (index) => {
        const seed = index * 12345
        const random1 = (seed % 200) / 100 - 1
        const random2 = ((seed * 7) % 200) / 100 - 1
        const random3 = ((seed * 13) % 200) / 100 - 1
        const random4 = ((seed * 19) % 200) / 100 - 1
        return {
            marginLeft: `${random1 * 10}px`,
            marginRight: `${random2 * 10}px`,
            marginTop: `${random3 * 8}px`,
            marginBottom: `${random4 * 8}px`,
        }
    }

    const distributeToRows = () => {
        const rows = [[], [], []]
        path.forEach((item, index) => {
            const sizeOptions = getImageSize(index)
            const spacing = getRandomSpacing(index)
            rows[index % 3].push({ ...item, originalIndex: index, sizeOptions, spacing })
        })
        return rows
    }

    const rows = distributeToRows()

    // === Measure half-widths for seamless looping ===
    const measureHalfWidths = useCallback(() => {
        rowRefs.current.forEach((rowEl, rowIndex) => {
            if (!rowEl) return
            const items = rowEl.querySelectorAll('[data-photo-idx]')
            const halfCount = rows[rowIndex]?.length || 0
            if (items.length >= halfCount * 2 && halfCount > 0) {
                const firstRect = items[0].getBoundingClientRect()
                const halfRect = items[halfCount].getBoundingClientRect()
                halfWidthsRef.current[rowIndex] = halfRect.left - firstRect.left
            }
        })
    }, [rows])

    useEffect(() => {
        if (scrollDirection !== 'horizontal') return
        const timer = setTimeout(measureHalfWidths, 200)
        const observer = new ResizeObserver(measureHalfWidths)
        rowRefs.current.forEach(el => { if (el) observer.observe(el) })
        return () => { clearTimeout(timer); observer.disconnect() }
    }, [measureHalfWidths, scrollDirection])

    // Re-measure when images load
    useEffect(() => {
        if (loadedImages.size > 0) measureHalfWidths()
    }, [loadedImages.size, measureHalfWidths])

    // === Wrap offset into valid range ===
    const wrapOffset = (offset, hw) => {
        if (hw <= 0) return offset
        while (offset <= -hw) offset += hw
        while (offset > 0) offset -= hw
        return offset
    }

    // === rAF animation loop ===
    useEffect(() => {
        if (scrollDirection !== 'horizontal') return

        const animate = () => {
            if (!isDraggingRef.current) {
                for (let i = 0; i < 3; i++) {
                    const hw = halfWidthsRef.current[i]
                    if (hw <= 0) continue
                    const speed = hw / (DURATIONS[i] * 60)
                    offsetsRef.current[i] = wrapOffset(offsetsRef.current[i] - speed, hw)
                }
            }
            // Apply transforms every frame
            for (let i = 0; i < 3; i++) {
                const rowEl = rowRefs.current[i]
                if (rowEl) {
                    const yOffset = i % 2 === 0 ? -2 : 9
                    rowEl.style.transform = `translateX(${offsetsRef.current[i]}px) translateY(${yOffset}px)`
                }
            }
            rafRef.current = requestAnimationFrame(animate)
        }

        rafRef.current = requestAnimationFrame(animate)
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }, [scrollDirection])

    // === Drag logic ===
    const handleDragStart = useCallback((clientX) => {
        dragStartXRef.current = clientX
        dragOffsetsRef.current = [...offsetsRef.current]
        isPotentialDragRef.current = true
        isDraggingRef.current = false
    }, [])

    const handleDragMove = useCallback((clientX) => {
        if (!isPotentialDragRef.current && !isDraggingRef.current) return
        const deltaX = clientX - dragStartXRef.current
        // Activate drag after threshold
        if (isPotentialDragRef.current && Math.abs(deltaX) > 5) {
            isPotentialDragRef.current = false
            isDraggingRef.current = true
            setIsDraggingActive(true)
            if (containerRef.current) containerRef.current.style.cursor = 'grabbing'
        }
        if (!isDraggingRef.current) return
        for (let i = 0; i < 3; i++) {
            const hw = halfWidthsRef.current[i]
            if (hw <= 0) continue
            offsetsRef.current[i] = wrapOffset(dragOffsetsRef.current[i] + deltaX, hw)
        }
    }, [])

    const handleDragEnd = useCallback(() => {
        if (isDraggingRef.current) {
            wasDraggingRef.current = true
            setTimeout(() => { wasDraggingRef.current = false }, 10)
        }
        isPotentialDragRef.current = false
        isDraggingRef.current = false
        setIsDraggingActive(false)
        if (containerRef.current) {
            containerRef.current.style.cursor = 'grab'
            containerRef.current.style.userSelect = ''
        }
    }, [])

    // === Mouse events ===
    const handleMouseDown = useCallback((e) => {
        e.preventDefault()
        handleDragStart(e.clientX)
        const onMove = (ev) => handleDragMove(ev.clientX)
        const onUp = () => {
            handleDragEnd()
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
        }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
    }, [handleDragStart, handleDragMove, handleDragEnd])

    // Suppress click on PhotoView trigger after a drag
    const handleClickCapture = useCallback((e) => {
        if (wasDraggingRef.current) {
            e.stopPropagation()
            e.preventDefault()
            wasDraggingRef.current = false
        }
    }, [])

    // === Touch events (native, for passive:false on touchmove) ===
    useEffect(() => {
        const container = containerRef.current
        if (!container || scrollDirection !== 'horizontal') return

        const onTouchStart = (e) => {
            const t = e.touches[0]
            touchStartPosRef.current = { x: t.clientX, y: t.clientY }
            touchDirectionRef.current = null
            handleDragStart(t.clientX)
        }

        const onTouchMove = (e) => {
            if (!isPotentialDragRef.current && !isDraggingRef.current) return
            const t = e.touches[0]
            const dx = t.clientX - touchStartPosRef.current.x
            const dy = t.clientY - touchStartPosRef.current.y

            // Determine swipe direction on first significant move
            if (touchDirectionRef.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
                touchDirectionRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
            }
            if (touchDirectionRef.current === 'vertical') {
                isPotentialDragRef.current = false
                return // let page scroll
            }
            if (touchDirectionRef.current === 'horizontal') {
                e.preventDefault() // prevent page scroll
                handleDragMove(t.clientX)
            }
        }

        const onTouchEnd = () => {
            handleDragEnd()
            touchDirectionRef.current = null
        }

        container.addEventListener('touchstart', onTouchStart, { passive: true })
        container.addEventListener('touchmove', onTouchMove, { passive: false })
        container.addEventListener('touchend', onTouchEnd, { passive: true })
        return () => {
            container.removeEventListener('touchstart', onTouchStart)
            container.removeEventListener('touchmove', onTouchMove)
            container.removeEventListener('touchend', onTouchEnd)
        }
    }, [scrollDirection, handleDragStart, handleDragMove, handleDragEnd])

    // Cleanup
    useEffect(() => {
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }, [])

    // === Toolbar render for PhotoProvider ===
    const toolbarRender = ({ rotate, onRotate }) => (
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
            <button onClick={() => onRotate(rotate - 90)} className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10" title="向左旋转 90°">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.91c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/></svg>
            </button>
            <button onClick={() => onRotate(rotate + 90)} className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10" title="向右旋转 90°">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z"/></svg>
            </button>
            <button onClick={() => onRotate(0)} className="text-white hover:text-green-400 transition-colors p-2 rounded-full hover:bg-white/10" title="重置旋转">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
            </button>
        </div>
    )

    // === Render a single photo item ===
    const renderPhotoItem = (item, index, rowIndex) => {
        const isLoaded = loadedImages.has(item.originalIndex)
        return (
            <PhotoView
                key={`${item.key}-${index}`}
                src={getFullSizeUrl(item.path)}
                render={({ attrs }) => <img {...attrs} />}
            >
                <div
                    data-photo-idx={index}
                    className={`flex-shrink-0 group cursor-pointer relative overflow-hidden rounded-lg responsive-photo-item hover:z-10 ${isDraggingActive ? '' : 'transition-all duration-300'}`}
                    style={{
                        width: item.sizeOptions.mobile.width,
                        height: item.sizeOptions.mobile.height,
                        transform: isDraggingActive
                            ? `rotate(${(item.originalIndex % 7 - 3) * 0.3}deg) translateY(${(item.originalIndex % 5 - 2) * 1.5}px)`
                            : `rotate(${(item.originalIndex % 7 - 3) * 0.5}deg) translateY(${(item.originalIndex % 5 - 2) * 2}px)`,
                        '--desktop-width': item.sizeOptions.desktop.width,
                        '--desktop-height': item.sizeOptions.desktop.height,
                        ...item.spacing,
                        willChange: isDraggingActive ? 'transform' : 'auto',
                        backfaceVisibility: 'hidden',
                    }}
                    onMouseEnter={(e) => {
                        if (!isDraggingActive) {
                            e.currentTarget.style.transform = `scale(1.2) rotateX(3deg) rotateY(5deg) rotateZ(2deg) translateY(-15px) translateZ(30px)`
                            e.currentTarget.style.transformStyle = 'preserve-3d'
                            e.currentTarget.style.perspective = '1000px'
                            e.currentTarget.style.zIndex = '50'
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
                    {!isLoaded && <div className="absolute inset-0 bg-gray-800/60 rounded-lg"></div>}
                    <img
                        src={getThumbnailUrl(item.path)}
                        className={`absolute inset-0 w-full h-full object-cover rounded-lg ${isLoaded ? 'opacity-100' : 'opacity-0'} ${isDraggingActive ? 'transition-none' : 'transition-opacity duration-300'}`}
                        alt=""
                        loading={index < 4 ? 'eager' : 'lazy'}
                        decoding="async"
                        onLoad={() => markLoaded(item.originalIndex)}
                        onError={handleCdnError}
                    />
                    <div className={`absolute inset-0 rounded-lg pointer-events-none ${isDraggingActive
                        ? 'bg-gradient-to-br from-white/5 via-transparent to-black/10'
                        : 'bg-gradient-to-br from-white/10 via-transparent to-black/20'
                        }`} />
                </div>
            </PhotoView>
        )
    }

    return (
        <div className="w-full">
            <PhotoProvider maskOpacity={0.5} pullClosable={true} toolbarRender={toolbarRender}>
                {scrollDirection === 'horizontal' ? (
                    <div
                        ref={containerRef}
                        className="overflow-hidden cursor-grab select-none"
                        onMouseDown={handleMouseDown}
                        onClickCapture={handleClickCapture}
                    >
                        <div ref={contentRef} className="space-y-1" style={{ perspective: '1000px' }}>
                            {rows.map((row, rowIndex) => (
                                <div
                                    key={rowIndex}
                                    ref={el => rowRefs.current[rowIndex] = el}
                                    className="flex items-end"
                                    style={{
                                        width: 'max-content',
                                        display: 'flex',
                                        gap: '1rem',
                                        willChange: 'transform',
                                        paddingTop: `${(rowIndex % 3)}px`,
                                        paddingBottom: `${((rowIndex + 1) % 3)}px`,
                                    }}
                                >
                                    {[...row, ...row].map((item, index) => renderPhotoItem(item, index, rowIndex))}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Grid layout for category pages - unchanged */
                    <div className="w-full p-4">
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-4 max-w-none">
                            {path.map((item, index) => {
                                const isLoaded = loadedImages.has(index)
                                return (
                                    <PhotoView key={item.key} src={getFullSizeUrl(item.path)} render={({ attrs }) => <img {...attrs} />}>
                                        <div className="aspect-square group cursor-pointer relative overflow-hidden rounded-lg hover:scale-105 transition-transform duration-300">
                                            {!isLoaded && (
                                                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center rounded-lg">
                                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                            <img
                                                src={getThumbnailUrl(item.path)}
                                                className={`absolute inset-0 w-full h-full object-cover rounded-lg transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                                                alt=""
                                                loading={index < 24 ? 'eager' : 'lazy'}
                                                decoding="async"
                                                fetchpriority={index < 8 ? 'high' : 'auto'}
                                                onLoad={() => markLoaded(index)}
                                                onError={handleCdnError}
                                            />
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
