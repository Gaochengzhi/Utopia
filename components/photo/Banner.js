import { useState, useEffect, useRef, useCallback } from "react"
import ShareLInk from "/components/ShareLInk"
import { PhotoProvider, PhotoView } from "react-photo-view"
import "react-photo-view/dist/react-photo-view.css"
import Link from "next/link"
import Image from "next/image"

// Inline SVG icons
const BankIcon = ({ className }) => (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z" />
    </svg>
)

// Simple CSS Carousel component
function SimpleCarousel({ children, autoplaySpeed = 4000, onSlideChange }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const timerRef = useRef(null)
    const count = children.length

    const goTo = useCallback((index) => {
        if (isTransitioning) return
        setIsTransitioning(true)
        setCurrentIndex(index)
        onSlideChange?.(index)
        setTimeout(() => setIsTransitioning(false), 500)
    }, [isTransitioning, onSlideChange])

    // Auto play
    useEffect(() => {
        timerRef.current = setInterval(() => {
            goTo((currentIndex + 1) % count)
        }, autoplaySpeed)
        return () => clearInterval(timerRef.current)
    }, [currentIndex, count, autoplaySpeed, goTo])

    return (
        <div className="relative w-full overflow-hidden">
            {children.map((child, index) => (
                <div
                    key={index}
                    className="absolute inset-0 transition-opacity duration-500"
                    style={{
                        opacity: index === currentIndex ? 1 : 0,
                        zIndex: index === currentIndex ? 1 : 0,
                        position: index === 0 ? 'relative' : 'absolute',
                    }}
                >
                    {child}
                </div>
            ))}
        </div>
    )
}

export function Banner({ }) {
    const [scrollY, setScrollY] = useState(0)
    const [isVisible, setIsVisible] = useState(false)
    const [loadedImages, setLoadedImages] = useState(new Set())
    const [currentSlide, setCurrentSlide] = useState(0)
    const bannerRef = useRef(null)
    const textRef = useRef(null)

    // 视差滚动效果
    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // 组件可见性检测
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting)
            },
            { threshold: 0.1 }
        )

        if (bannerRef.current) {
            observer.observe(bannerRef.current)
        }

        return () => observer.disconnect()
    }, [])

    // 图片预加载 - 使用缩略图
    useEffect(() => {
        const bannerImages = [1, 2, 3, 4, 5]
        bannerImages.forEach((i) => {
            const img = new Image()
            img.onload = () => {
                setLoadedImages(prev => new Set([...prev, i]))
            }
            img.src = `/.pic/thumb/photography/banner/${i}.jpg`
        })
    }, [])

    // 获取全尺寸压缩图URL
    const getFullSizeUrl = (imagePath) => {
        return imagePath.replace('/photography/', '/.pic/full/photography/')
    }

    // 获取缩略图URL
    const getThumbnailUrl = (imagePath) => {
        return imagePath.replace('/photography/', '/.pic/thumb/photography/')
    }

    // 文字动画效果
    const getTextAnimation = (delay = 0) => ({
        transform: isVisible
            ? `translateY(0px) opacity(1)`
            : `translateY(30px) opacity(0)`,
        transition: `all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`
    })

    return (
        <div
            ref={bannerRef}
            className="w-full flex flex-col-reverse md:flex-row items-center relative overflow-hidden"
            style={{
                background: `linear-gradient(135deg, 
          rgba(0,0,0,0.9) 0%, 
          rgba(20,20,20,0.95) 25%, 
          rgba(40,40,40,0.9) 50%, 
          rgba(20,20,20,0.95) 75%, 
          rgba(0,0,0,0.9) 100%)`
            }}
        >
            {/* 背景动态装饰 */}
            <div className="absolute inset-0 pointer-events-none">
                {/* 视差移动的几何图形 */}
                <div
                    className="absolute top-10 left-10 w-20 h-20 border border-purple-500/20 rounded-full"
                    style={{
                        transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.05}px) rotate(${scrollY * 0.1}deg)`
                    }}
                />
                <div
                    className="absolute bottom-20 right-20 w-16 h-16 border border-blue-500/20 rounded-lg"
                    style={{
                        transform: `translate(${-scrollY * 0.15}px, ${scrollY * 0.08}px) rotate(${-scrollY * 0.12}deg)`
                    }}
                />
                <div
                    className="absolute top-1/2 left-1/4 w-12 h-12 border border-pink-500/20"
                    style={{
                        transform: `translate(${scrollY * 0.08}px, ${-scrollY * 0.06}px) rotate(${scrollY * 0.08}deg)`
                    }}
                />

                {/* 简化的装饰元素 */}
                {Array.from({ length: 3 }, (_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white/10 rounded-full animate-float"
                        style={{
                            left: `${20 + i * 30}%`,
                            top: `${20 + i * 20}%`,
                            animationDelay: `${i * 2}s`,
                            animationDuration: `${6 + i}s`
                        }}
                    />
                ))}
            </div>

            {/* 文字内容区域 */}
            <div
                ref={textRef}
                className="w-full md:w-[50%] h-60 flex flex-col justify-center items-center text-white relative z-10 p-6 pb-20"
                style={{
                    transform: `translateY(${scrollY * 0.1}px)`
                }}
            >
                <div
                    className="text-4xl md:text-5xl mt-9 font-serif bg-gradient-to-r from-white to-white bg-clip-text text-transparent"
                    style={getTextAnimation(100)}
                >
                    Taitan_Pascal
                </div>


                <div
                    className="flex flex-col justify-center items-center mt-6"
                    style={getTextAnimation(300)}
                >
                    <div className="font-serif mb-4 text-lg text-gray-300">
                        联系我: 点击下面图标 👇
                    </div>
                    <div className="flex space-x-4 text-2xl transform hover:scale-110 transition-transform duration-300">
                        <ShareLInk />
                    </div>
                </div>

                <div
                    className="mt-6 mb-2 p-4 flex items-center border-2 border-gradient-to-r from-purple-500 to-blue-500 rounded-lg border-dashed backdrop-blur-sm bg-white/5 hover:bg-white/10 transition-all duration-300 group"
                    style={getTextAnimation(400)}
                >
                    <BankIcon className="text-green-400 group-hover:animate-pulse" />
                    <div className="inline px-2 text-gray-300">常驻 seu.edu.cn 接受</div>
                    <Link className="cursor-pointer" href="/photographer/order">
                        <div className="inline text-sky-400 cursor-pointer hover:text-sky-300 transition-colors duration-200 font-medium">
                            预约
                        </div>
                    </Link>
                </div>
            </div>

            {/* 图片轮播区域 */}
            <div className="md:w-[50%] w-full relative">
                <PhotoProvider
                    maskOpacity={0.9}
                    pullClosable={true}
                    toolbarRender={({ rotate, onRotate }) => (
                        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                            <button
                                onClick={() => onRotate(rotate - 90)}
                                className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10"
                                title="向左旋转 90°"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.91c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z" />
                                </svg>
                            </button>
                            
                            <button
                                onClick={() => onRotate(rotate + 90)}
                                className="text-white hover:text-blue-400 transition-colors p-2 rounded-full hover:bg-white/10"
                                title="向右旋转 90°"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z" />
                                </svg>
                            </button>

                            <button
                                onClick={() => onRotate(0)}
                                className="text-white hover:text-green-400 transition-colors p-2 rounded-full hover:bg-white/10"
                                title="重置旋转"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                                </svg>
                            </button>
                        </div>
                    )}
                >
                    <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                        {/* 渐变边框 */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl opacity-75 blur-sm"></div>

                        <div className="relative bg-black rounded-2xl overflow-hidden">
                            <SimpleCarousel
                                autoplaySpeed={4000}
                                onSlideChange={setCurrentSlide}
                            >
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <PhotoView key={i} src={getFullSizeUrl(`/photography/banner/${i}.jpg`)}>
                                        <div className="picon relative group cursor-pointer" key={i}>
                                            {/* 加载状态 */}
                                            {!loadedImages.has(i) && (
                                                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 animate-pulse flex items-center justify-center">
                                                    <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                </div>
                                            )}

                                            <Image
                                                src={getThumbnailUrl(`/photography/banner/${i}.jpg`)}
                                                className={`picinside h-full object-cover w-full transition-all duration-1000 group-hover:scale-105 ${loadedImages.has(i)
                                                    ? 'opacity-100 filter-none'
                                                    : 'opacity-0 blur-md'
                                                    }`}
                                                alt={`Banner image ${i}`}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 60vw"
                                                unoptimized
                                                style={{
                                                    transform: `translateY(${scrollY * 0.05}px)`
                                                }}
                                            />

                                            {/* 悬停覆盖层 */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                                <div className="absolute bottom-4 left-4 right-4">
                                                    <div className="text-white font-medium">📸 Click to enlarge</div>
                                                    <div className="text-white/80 text-sm">Professional Photography</div>
                                                </div>
                                            </div>

                                            {/* 点击时的涟漪效果 */}
                                            <div className="absolute inset-0 overflow-hidden rounded-lg">
                                                <div className="absolute inset-0 scale-0 group-active:scale-100 bg-white/20 rounded-full transition-transform duration-300"></div>
                                            </div>
                                        </div>
                                    </PhotoView>
                                ))}
                            </SimpleCarousel>

                        </div>
                    </div>
                </PhotoProvider>
            </div>
        </div>
    )
}
