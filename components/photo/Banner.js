import { useState, useEffect, useRef } from "react"
import ShareLInk from "/components/ShareLInk"
import { CodeOutlined, CameraOutlined, BankOutlined } from "@ant-design/icons"
import { Carousel } from "antd"
import { PhotoProvider, PhotoView } from "react-photo-view"
import "react-photo-view/dist/react-photo-view.css"
import Link from "next/link"

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
        return `/.pic/full${imagePath}`
    }

    // 获取缩略图URL
    const getThumbnailUrl = (imagePath) => {
        return `/.pic/thumb${imagePath}`
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
                    <BankOutlined className="text-green-400 group-hover:animate-pulse" />
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
                    toolbarRender={({ rotate, onRotate, onScale, scale }) => (
                        <div className="flex space-x-2 text-white bg-black/70 rounded-lg p-3">
                            <button onClick={() => onRotate(rotate + 90)} className="p-2 hover:bg-white/20 rounded transition-all">
                                ↻
                            </button>
                            <button onClick={() => onScale(scale + 0.5)} className="p-2 hover:bg-white/20 rounded transition-all">
                                🔍+
                            </button>
                            <button onClick={() => onScale(scale - 0.5)} className="p-2 hover:bg-white/20 rounded transition-all">
                                🔍-
                            </button>
                        </div>
                    )}
                >
                    <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                        {/* 渐变边框 */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl opacity-75 blur-sm"></div>

                        <div className="relative bg-black rounded-2xl overflow-hidden">
                            <Carousel
                                className="w-full overflow-hidden"
                                effect="fade"
                                autoplay
                                autoplaySpeed={4000}
                                beforeChange={(from, to) => setCurrentSlide(to)}
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

                                            <img
                                                src={getThumbnailUrl(`/photography/banner/${i}.jpg`)}
                                                className={`picinside h-full object-cover w-full transition-all duration-1000 group-hover:scale-105 ${loadedImages.has(i)
                                                    ? 'opacity-100 filter-none'
                                                    : 'opacity-0 blur-md'
                                                    }`}
                                                alt={`Banner image ${i}`}
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
                            </Carousel>

                        </div>
                    </div>
                </PhotoProvider>
            </div>
        </div>
    )
}
// You should use getStaticProps when:
//- The data required to render the page is available at build time ahead of a user’s request.
//- The data comes from a headless CMS.
//- The data can be publicly cached (not user-specific).
//- The page must be pre-rendered (for SEO) and be very fast — getStaticProps generates HTML and JSON files, both of which can be cached by a CDN for performance.
