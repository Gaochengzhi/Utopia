import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Link from "next/link"
import { getCdnCataThumbUrl, handleCdnError } from "/lib/cdnUrl"

/**
 * Lightweight parallax image banner — no external library needed.
 * Uses IntersectionObserver + scroll listener for smooth background movement.
 */
function ParallaxImage({ src, speed = -0.3, className, onLoad, onError, loadingStrategy, children }) {
    const containerRef = useRef(null)
    const [offset, setOffset] = useState(0)
    const [isInView, setIsInView] = useState(false)
    const PARALLAX_BLEED_RATIO = 0.45
    const MAX_OFFSET_RATIO = 0.4

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const observer = new IntersectionObserver(
            ([entry]) => setIsInView(entry.isIntersecting),
            { rootMargin: "200px 0px" }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const handleScroll = useCallback(() => {
        if (!isInView || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const windowH = window.innerHeight
        const progress = 1 - (rect.top + rect.height) / (windowH + rect.height)
        const rawOffset = progress * speed * rect.height
        const maxOffset = rect.height * MAX_OFFSET_RATIO
        const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, rawOffset))
        setOffset(clampedOffset)
    }, [isInView, speed])

    useEffect(() => {
        if (!isInView) return
        handleScroll()
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [isInView, handleScroll])

    return (
        <div ref={containerRef} className={className} style={{ position: "relative", overflow: "hidden" }}>
            {src && (
                <div
                    style={{
                        position: "absolute",
                        inset: `-${PARALLAX_BLEED_RATIO * 100}% 0`,
                        transform: `translate3d(0, ${offset}px, 0)`,
                        willChange: "transform",
                    }}
                >
                    <img
                        src={src}
                        alt=""
                        loading={loadingStrategy || 'lazy'}
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover"
                        onLoad={onLoad}
                        onError={onError}
                    />
                </div>
            )}
            {children}
        </div>
    )
}



export function CataContainer({ categories, eagerCount = 2 }) {
    const [loadedImages, setLoadedImages] = useState(new Set())

    const categoryData = useMemo(() => {
        if (!Array.isArray(categories) || categories.length === 0) return []

        return categories
            .map((item, index) => {
                const title = typeof item?.title === 'string' && item.title.trim()
                if (!title) return null

                return {
                    index: item?.index != null ? String(item.index) : String(index),
                    title: title.toLowerCase(),
                    coverImage: item?.coverImage || null,
                }
            })
            .filter(Boolean)
    }, [categories])

    const markLoaded = useCallback((id) => {
        setLoadedImages(prev => {
            if (prev.has(id)) return prev
            const next = new Set(prev)
            next.add(id)
            return next
        })
    }, [])

    return (
        <div className="flex flex-col w-full">
            {categoryData.length === 0 && (
                <div className="w-full py-12 text-center text-gray-500">No categories available</div>
            )}

            {categoryData.map((item, index) => {
                const isLoaded = loadedImages.has(item.index)
                const imageSrc = getCdnCataThumbUrl(item.coverImage || `/photography/cata/${item.index}.jpg`)

                return (
                    <Link key={`${item.index}-${item.title}`} href={"/photographer/" + item.title} className="block w-full">
                        <div className="text-gray-300 w-full lg:h-[29rem] sm:h-[13rem] md:h-[19rem] h-[12rem] lg:text-8xl text-5xl flex justify-center group relative overflow-hidden">
                            {/* 加载状态 */}
                            {!isLoaded && (
                                <div className="absolute inset-0 z-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 animate-pulse flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                </div>
                            )}

                            <ParallaxImage
                                src={imageSrc}
                                speed={-0.6}
                                loadingStrategy={index < eagerCount ? 'eager' : 'lazy'}
                                className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                                onLoad={() => markLoaded(item.index)}
                                onError={(e) => { handleCdnError(e); markLoaded(item.index) }}
                            >
                                {/* 渐变覆盖层 */}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 group-hover:from-black/60 group-hover:to-black/60 transition-all duration-500"></div>

                                {/* 标题区域 */}
                                <div className="absolute inset-0 z-10 flex items-center justify-center">
                                    <div className="relative">
                                        <div className="text-white font-extralight tracking-wider uppercase group-hover:scale-110 transition-transform duration-500">
                                            {item.title}
                                        </div>

                                        {/* 悬停发光效果 */}
                                        <div className="absolute inset-0 text-white font-extralight tracking-wider uppercase opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-500">
                                            {item.title}
                                        </div>
                                    </div>
                                </div>

                                {/* 悬停指示器 */}
                                <div className="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="flex items-center space-x-2 text-white text-sm bg-black/50 px-3 py-1 rounded-lg backdrop-blur-sm">
                                        <span>Enter Gallery</span>
                                        <span>→</span>
                                    </div>
                                </div>
                            </ParallaxImage>
                        </div>
                    </Link>
                )
            })}
        </div>
    )
}
