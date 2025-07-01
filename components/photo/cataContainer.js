import { useState, useEffect } from "react"
import { cataList } from "./cataList"
import { ParallaxBanner } from "react-scroll-parallax"
import { ParallaxProvider } from "react-scroll-parallax"
import Link from "next/link"

export function CataContainer({ }) {
    const [loadedImages, setLoadedImages] = useState(new Set())

    // 预加载图片
    useEffect(() => {
        cataList.forEach((item) => {
            const img = new Image()
            img.onload = () => {
                setLoadedImages(prev => new Set([...prev, item.index]))
            }
            img.src = `/photography/cata/${item.index}.jpg`
        })
    }, [])

    return (
        <div className="flex flex-col justify-center items-center w-full">
            <ParallaxProvider>
                {cataList.map((item) => {
                    const isLoaded = loadedImages.has(item.index)
                    
                    return (
                        <Link key={item.index} href={"/photographer/" + item.title.toLowerCase()}>
                            <div className="text-gray-300 w-full lg:h-[29rem] sm:h-[13rem] md:h-[19rem] h-[12rem] lg:text-8xl text-5xl flex justify-center group relative overflow-hidden">
                                {/* 加载状态 */}
                                {!isLoaded && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 animate-pulse flex items-center justify-center">
                                        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                )}

                                <ParallaxBanner
                                    layers={[
                                        { image: `/photography/cata/${item.index}.jpg`, speed: -20 },
                                    ]}
                                    className="aspect-[2/1] w-full transition-transform duration-500 group-hover:scale-105"
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
                                </ParallaxBanner>
                            </div>
                        </Link>
                    )
                })}
            </ParallaxProvider>
        </div>
    )
}
