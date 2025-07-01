import { useState, useEffect } from "react"
import { PhotoProvider, PhotoView } from "react-photo-view"
import "react-photo-view/dist/react-photo-view.css"

export function Walls({ path }) {
  const [loadedImages, setLoadedImages] = useState(new Set())

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

  // 定义不同的图片尺寸模式
  const getImageSize = (index) => {
    const patterns = [
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
    return patterns[index % patterns.length]
  }

  // 将图片分配到三行，并添加尺寸信息
  const distributeToRows = () => {
    const rows = [[], [], []]
    path.forEach((item, index) => {
      const size = getImageSize(index)
      rows[index % 3].push({ 
        ...item, 
        originalIndex: index,
        ...size
      })
    })
    return rows
  }

  const rows = distributeToRows()

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
        {/* 三行横向滚动的图片 - 错落有致的布局 */}
        <div className="space-y-2">
          {rows.map((row, rowIndex) => (
            <div 
              key={rowIndex}
              className="flex gap-2 overflow-x-auto scrollbar-hide items-end"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                // 为每行添加轻微的垂直偏移，创造错落感
                transform: `translateY(${rowIndex % 2 === 0 ? '0px' : '8px'})`,
              }}
            >
              {row.map((item) => {
                const isLoaded = loadedImages.has(item.originalIndex)
                
                return (
                  <PhotoView key={item.key} src={item.path}>
                    <div 
                      className="flex-shrink-0 group cursor-pointer relative overflow-hidden rounded-lg"
                      style={{
                        width: item.width,
                        height: item.height,
                        // 为每个图片添加轻微的旋转和位移
                        transform: `rotate(${(item.originalIndex % 7 - 3) * 0.5}deg) translateY(${(item.originalIndex % 5 - 2) * 2}px)`,
                        transition: 'all 0.3s ease',
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
                      
                      {/* 阴影效果 */}
                      <div 
                        className="absolute -inset-1 bg-black/20 rounded-lg -z-10 opacity-60"
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
      </PhotoProvider>
    </div>
  )
}
