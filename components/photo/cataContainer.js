import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Link from "next/link"
import Head from "next/head"

// R2 CDN direct URL
const R2_CDN_URL = typeof window !== 'undefined'
    ? (window.__NEXT_DATA__?.props?.pageProps?.__r2CdnUrl || '')
    : (process.env.NEXT_PUBLIC_R2_CDN_URL || '')

/**
 * Lightweight parallax image banner — no external library needed.
 * Uses IntersectionObserver + scroll listener for smooth background movement.
 */
function ParallaxImage({ src, speed = -0.3, className, onLoad, onError, loadingStrategy, children }) {
    const containerRef = useRef(null)
    const [offset, setOffset] = useState(0)
    const [isInView, setIsInView] = useState(false)

    // Track visibility with IntersectionObserver
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

    // Compute parallax offset only when in view
    const handleScroll = useCallback(() => {
        if (!isInView || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const windowH = window.innerHeight
        // Progress: 0 when element enters bottom, 1 when it leaves top
        const progress = 1 - (rect.top + rect.height) / (windowH + rect.height)
        setOffset(progress * speed * rect.height)
    }, [isInView, speed])

    useEffect(() => {
        if (!isInView) return
        // Compute initial position
        handleScroll()
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [isInView, handleScroll])

    return (
        <div ref={containerRef} className={className} style={{ position: "relative", overflow: "hidden" }}>
            {/* Parallax background layer */}
            {src && (
                <div
                    style={{
                        position: "absolute",
                        inset: "-20% 0", // Extra height for parallax travel room
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
            {/* Content overlay */}
            {children}
        </div>
    )
}

function toThumbPath(rawPath) {
    if (!rawPath) return rawPath
    let url = rawPath
    if (rawPath.includes('/photography/cata/')) {
        url = rawPath
    } else if (rawPath.includes('/photography/content/')) {
        url = rawPath.replace('/photography/content/', '/photography/thumb/')
    } else {
        url = rawPath.replace('/photography/', '/photography/thumb/')
    }
    // Use CDN direct URL if configured
    if (R2_CDN_URL && url.startsWith('/')) {
        return R2_CDN_URL + url
    }
    return url
}

export function CataContainer({ categories, eagerCount = 2 }) {
    const [loadedImages, setLoadedImages] = useState(new Set())
    const [imageSrcs, setImageSrcs] = useState({})
    const [fallbackTried, setFallbackTried] = useState(new Set())

    const categoryData = useMemo(() => {
        if (!Array.isArray(categories) || categories.length === 0) return []

        return categories
            .map((item, index) => {
                const rawTitle =
                    (typeof item?.title === 'string' && item.title.trim()) ||
                    (typeof item?.category === 'string' && item.category.trim()) ||
                    null

                if (!rawTitle) return null

                const normalizedTitle = rawTitle.toLowerCase()
                const normalizedIndex = item?.index != null ? String(item.index) : String(index)

                return {
                    index: normalizedIndex,
                    title: normalizedTitle,
                    coverImage: item?.coverImage || null,
                    fallbackCover: item?.fallbackCover || item?.coverImage || null,
                }
            })
            .filter(Boolean)
    }, [categories])

    useEffect(() => {
        // Reset when categories set changes (e.g. after API fallback fetch)
        setLoadedImages(new Set())
        setImageSrcs({})
        setFallbackTried(new Set())
    }, [categoryData])

    return (
        <div className="flex flex-col w-full">
            {/* Preconnect to CDN domain */}
            {R2_CDN_URL && (
                <Head>
                    <link rel="preconnect" href={R2_CDN_URL} />
                    <link rel="dns-prefetch" href={R2_CDN_URL} />
                </Head>
            )}
            {categoryData.length === 0 && (
                <div className="w-full py-12 text-center text-gray-500">No categories available</div>
            )}

            {categoryData.map((item, index) => {
                const isLoaded = loadedImages.has(item.index)
                const primarySrc = toThumbPath(item.coverImage || `/photography/cata/${item.index}.jpg`)
                const fallbackSrc = toThumbPath(item.fallbackCover || primarySrc)
                const imageSrc = imageSrcs[item.index] || primarySrc

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
                                speed={-0.3}
                                loadingStrategy={index < eagerCount ? 'eager' : 'lazy'}
                                className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                                onLoad={() => {
                                    setLoadedImages(prev => {
                                        if (prev.has(item.index)) return prev
                                        const next = new Set(prev)
                                        next.add(item.index)
                                        return next
                                    })
                                }}
                                onError={() => {
                                    const tried = fallbackTried.has(item.index)
                                    if (!tried && fallbackSrc && fallbackSrc !== imageSrc) {
                                        setFallbackTried(prev => {
                                            const next = new Set(prev)
                                            next.add(item.index)
                                            return next
                                        })
                                        setImageSrcs(prev => ({ ...prev, [item.index]: fallbackSrc }))
                                        return
                                    }
                                    setLoadedImages(prev => {
                                        if (prev.has(item.index)) return prev
                                        const next = new Set(prev)
                                        next.add(item.index)
                                        return next
                                    })
                                }}
                            >
                                {/* 渐变覆盖层 */}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 group-hover:from-black/60 group-hover:to-black/60 transition-all duration-500"></div>

                                {/* 标题区域 */}
                                <div className="absolute inset-0 z-10 flex items-center justify-center">
                                    <div className="relative">
                                        <div className="text-white font-extralight tracking-wider group-hover:scale-110 transition-transform duration-500">
                                            {item.title}
                                        </div>

                                        {/* 悬停发光效果 */}
                                        <div className="absolute inset-0 text-white font-extralight tracking-wider opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-500">
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
