import { useState, useEffect, useRef } from "react"
import { PhotoProvider, PhotoView } from "react-photo-view"
import "react-photo-view/dist/react-photo-view.css"

export function Walls({ path, scrollDirection = 'horizontal' }) {
  const [loadedImages, setLoadedImages] = useState(new Set())
  const [isPaused, setIsPaused] = useState(false)
  const containerRef = useRef(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const scrollLeft = useRef(0)
  const scrollTop = useRef(0)

  // 图片预加载
  useEffect(() => {
    path.forEach((item, index) => {
      const img = new Image()
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, index]))
      }
      img.src = item.path
    })
  }, [path])

  // 设置触控事件监听器，支持 passive 选项
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchMovePassive = (e) => {
      if (!isDragging.current) return
      
      e.preventDefault()
      const touch = e.touches[0]
      
      if (scrollDirection === 'horizontal') {
        const x = touch.pageX - container.offsetLeft
        const walk = (x - startX.current) * 2
        container.scrollLeft = scrollLeft.current - walk
      } else {
        const y = touch.pageY - container.offsetTop
        const walk = (y - startY.current) * 2
        container.scrollTop = scrollTop.current - walk
      }
    }

    container.addEventListener('touchmove', handleTouchMovePassive, { passive: false })
    
    return () => {
      container.removeEventListener('touchmove', handleTouchMovePassive)
    }
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

  // 将图片分配到三行，并添加尺寸信息
  const distributeToRows = () => {
    const rows = [[], [], []]
    path.forEach((item, index) => {
      const sizeOptions = getImageSize(index)
      rows[index % 3].push({ 
        ...item, 
        originalIndex: index,
        sizeOptions
      })
    })
    return rows
  }

  const rows = distributeToRows()

  // 触控事件处理
  const handleMouseDown = (e) => {
    isDragging.current = true
    const container = containerRef.current
    if (!container) return
    
    startX.current = e.pageX - container.offsetLeft
    startY.current = e.pageY - container.offsetTop
    scrollLeft.current = container.scrollLeft
    scrollTop.current = container.scrollTop
    
    setIsPaused(true)
    container.style.cursor = 'grabbing'
  }

  const handleMouseMove = (e) => {
    if (!isDragging.current) return
    e.preventDefault()
    
    const container = containerRef.current
    if (!container) return
    
    if (scrollDirection === 'horizontal') {
      const x = e.pageX - container.offsetLeft
      const walk = (x - startX.current) * 2
      container.scrollLeft = scrollLeft.current - walk
    } else {
      const y = e.pageY - container.offsetTop
      const walk = (y - startY.current) * 2
      container.scrollTop = scrollTop.current - walk
    }
  }

  const handleMouseUp = () => {
    isDragging.current = false
    const container = containerRef.current
    if (container) {
      container.style.cursor = 'grab'
    }
    setTimeout(() => setIsPaused(false), 1000)
  }

  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    isDragging.current = true
    const container = containerRef.current
    if (!container) return
    
    startX.current = touch.pageX - container.offsetLeft
    startY.current = touch.pageY - container.offsetTop
    scrollLeft.current = container.scrollLeft
    scrollTop.current = container.scrollTop
    
    setIsPaused(true)
  }

  const handleTouchEnd = () => {
    isDragging.current = false
    setTimeout(() => setIsPaused(false), 1000)
  }

  return (
    <div className="w-full">
      <PhotoProvider 
        maskOpacity={0.8} 
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
        {/* 根据滚动方向显示不同布局 */}
        {scrollDirection === 'horizontal' ? (
          /* 主页横向滚动布局 - 三行错落有致 */
          <div 
            ref={containerRef}
            className="space-y-2 overflow-hidden cursor-grab"
            style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {rows.map((row, rowIndex) => (
              <div 
                key={rowIndex}
                className="flex gap-2 items-end photo-wall-scroll"
                style={{
                  // 为每行添加轻微的垂直偏移，创造错落感
                  transform: `translateY(${rowIndex % 2 === 0 ? '0px' : '8px'})`,
                  // 自动向右移动动画，每行速度略有不同以增加层次感（减慢速度）
                  animation: isPaused ? 'none' : `autoScrollRight ${60 + rowIndex * 10}s linear infinite`,
                  animationPlayState: isPaused ? 'paused' : 'running',
                  // 确保有足够的宽度，使动画从0%移动到-50%时正好完成一个循环
                  width: 'max-content',
                  display: 'flex',
                  gap: '0.5rem',
                }}
              >
                {/* 渲染图片两次实现无缝循环 */}
                {[...row, ...row].map((item, index) => {
                  const isLoaded = loadedImages.has(item.originalIndex)
                  
                  return (
                    <PhotoView key={`${item.key}-${index}`} src={item.path}>
                      <div 
                        className="flex-shrink-0 group cursor-pointer relative overflow-hidden rounded-lg responsive-photo-item"
                        style={{
                          // 移动端尺寸（默认）
                          width: item.sizeOptions.mobile.width,
                          height: item.sizeOptions.mobile.height,
                          // 为每个图片添加轻微的旋转和位移
                          transform: `rotate(${(item.originalIndex % 7 - 3) * 0.5}deg) translateY(${(item.originalIndex % 5 - 2) * 2}px)`,
                          transition: 'all 0.3s ease',
                          // 桌面端尺寸通过CSS变量传递
                          '--desktop-width': item.sizeOptions.desktop.width,
                          '--desktop-height': item.sizeOptions.desktop.height,
                        }}
                      >
                        {/* 加载状态 */}
                        {!isLoaded && (
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 animate-pulse flex items-center justify-center rounded-lg">
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          </div>
                        )}
                        
                        <img
                          src={item.path}
                          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:rotate-0 group-hover:translate-y-0 rounded-lg ${
                            isLoaded 
                              ? 'opacity-100 filter-none' 
                              : 'opacity-0 blur-sm'
                          }`}
                          alt=""
                          loading="lazy"
                        />
                        
                        {/* 增强的阴影效果 */}
                        <div className="absolute inset-0 shadow-md rounded-lg" />
                        <div 
                          className="absolute -inset-3 bg-white/40 rounded-lg -z-20 opacity-90"
                          style={{
                            filter: 'blur(16px)',
                          }}
                        />
                        <div 
                          className="absolute -inset-1 bg-gray-200/50 rounded-lg -z-10 opacity-80"
                          style={{
                            filter: 'blur(8px)',
                          }}
                        />
                        
                        {/* 悬停遮罩 */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
                          <div className="text-white text-sm font-medium bg-black/50 px-3 py-2 rounded-full backdrop-blur-sm">
                            📸 View
                          </div>
                        </div>
                        
                        {/* 光影效果 */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 rounded-lg pointer-events-none" />
                      </div>
                    </PhotoView>
                  )
                })}
              </div>
            ))}
          </div>
        ) : (
          /* 分类页面垂直滚动布局 - 保持原有多样化尺寸 */
          <div 
            ref={containerRef}
            className="overflow-y-auto max-h-[80vh] cursor-grab p-4 scrollbar-hide"
            style={{ 
              cursor: isDragging.current ? 'grabbing' : 'grab',
              scrollBehavior: 'smooth'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div 
              className="flex flex-wrap gap-4 justify-center"
              style={{
                alignItems: 'flex-start'
              }}
            >
              {path.map((item, index) => {
                const isLoaded = loadedImages.has(index)
                const sizeOptions = getImageSize(index)
                
                return (
                  <PhotoView key={item.key} src={item.path}>
                    <div 
                      className="group cursor-pointer relative overflow-hidden rounded-lg responsive-photo-item"
                      style={{
                        // 使用原来的多样化尺寸
                        width: sizeOptions.mobile.width,
                        height: sizeOptions.mobile.height,
                        transform: `rotate(${(index % 7 - 3) * 0.5}deg)`,
                        transition: 'all 0.3s ease',
                        // 桌面端尺寸
                        '--desktop-width': sizeOptions.desktop.width,
                        '--desktop-height': sizeOptions.desktop.height,
                        flexShrink: 0
                      }}
                    >
                    {/* 加载状态 */}
                    {!isLoaded && (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 animate-pulse flex items-center justify-center rounded-lg">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                    
                    <img
                      src={item.path}
                      className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:rotate-0 rounded-lg ${
                        isLoaded 
                          ? 'opacity-100 filter-none' 
                          : 'opacity-0 blur-sm'
                      }`}
                      alt=""
                      loading="lazy"
                    />
                    
                    {/* 增强的阴影效果 */}
                    <div className="absolute inset-0 shadow-md rounded-lg" />
                    <div 
                      className="absolute -inset-3 bg-white/40 rounded-lg -z-20 opacity-90"
                      style={{
                        filter: 'blur(16px)',
                      }}
                    />
                    <div 
                      className="absolute -inset-1 bg-gray-200/50 rounded-lg -z-10 opacity-80"
                      style={{
                        filter: 'blur(8px)',
                      }}
                    />
                    
                    {/* 悬停遮罩 */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
                      <div className="text-white text-sm font-medium bg-black/50 px-3 py-2 rounded-full backdrop-blur-sm">
                        📸 View
                      </div>
                    </div>
                    
                      {/* 光影效果 */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 rounded-lg pointer-events-none" />
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