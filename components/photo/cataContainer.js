import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"

/**
 * Lightweight parallax image banner — no external library needed.
 * Uses IntersectionObserver + scroll listener for smooth background movement.
 */
function ParallaxImage({ src, speed = -0.3, className, children }) {
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
            <div
                style={{
                    position: "absolute",
                    inset: "-20% 0",           // Extra height for parallax travel room
                    backgroundImage: `url(${src})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    transform: `translate3d(0, ${offset}px, 0)`,
                    willChange: "transform",
                }}
            />
            {/* Content overlay */}
            {children}
        </div>
    )
}

export function CataContainer({ categories }) {
    const [loadedImages, setLoadedImages] = useState(new Set())

    const categoryData = categories && categories.length > 0 ? categories : []

    // 预加载图片
    useEffect(() => {
        categoryData.forEach((item) => {
            const img = new Image()
            img.onload = () => {
                setLoadedImages(prev => new Set([...prev, item.index]))
            }
            const imagePath = item.coverImage || `/photography/cata/${item.index}.jpg`
            img.src = imagePath.replace('/photography/', '/photography/thumb/')
        })
    }, [categoryData])

    return (
        <div className="flex flex-col justify-center items-center w-full">
            {categoryData.map((item) => {
                const isLoaded = loadedImages.has(item.index)
                const imageSrc = (item.coverImage || `/photography/cata/${item.index}.jpg`)
                    .replace('/photography/', '/photography/full/')

                return (
                    <Link key={item.index} href={"/photographer/" + item.title.toLowerCase()}>
                        <div className="text-gray-300 w-full lg:h-[29rem] sm:h-[13rem] md:h-[19rem] h-[12rem] lg:text-8xl text-5xl flex justify-center group relative overflow-hidden">
                            {/* 加载状态 */}
                            {!isLoaded && (
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 animate-pulse flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                </div>
                            )}

                            <ParallaxImage
                                src={imageSrc}
                                speed={-0.3}
                                className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                            >
                                {/* 渐变覆盖层 */}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 group-hover:from-black/60 group-hover:to-black/60 transition-all duration-500"></div>

                                {/* 标题区域 */}
                                <div className="absolute inset-0 flex items-center justify-center">
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
                                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
