// 处理已经存在的图片
function observeStatic(target) {
  getImgElements(target, (nodes) => {
    nodes.forEach((node) => {
      const lazySrc =
        node.getAttribute("data-src") || node.getAttribute("lazy-src")
      if (!lazySrc) {
        wrapImg(node)
      }
    })
  })
}

// 监听动态插入的 img
function observeDynamic(target) {
  target.addEventListener(
    "error",
    errorHandler,
    true // 只有捕获阶段能捕捉到img加载error
  )

  const errorHandler = (e) => {
    const element = e.target

    if (element instanceof HTMLImageElement) {
      const src = element.getAttribute("src")
      // lazyload图片不处理
      const lazySrc =
        element.getAttribute("data-src") || element.getAttribute("lazy-src")
      if (!src || lazySrc) {
        return
      }

      setTimeout(() => {
        // 延迟到onError执行后处理
        ImgErrorHandler(element)
      }, 0)
    }
  }
}

// 图片错误处理函数
const ImgErrorHandler = (element) => {
  const src = element.src
  const isOrigin = !element[0]

  // 图片还没有 重载过 || 没有超过重载次数
  if (isOrigin || !ifImgLoadOverMaxCount(src)) {
    // 如果重来没有加载，那么就保存元数据
    if (isOrigin) {
      element[0] = src
    }
    element.src = addReloadFlag(src)
    return
  }

  // defaultUrl也加载失败，没救了
  element.onerror = null
  element.src = DEFAULT_IMG
}

// 获取到元素下所有的 img 标签
function getImgElements(target, callback) {
  const nodes = target.querySelectorAll("img")
  if (typeof callback === "function") {
    callback([].slice.call(nodes))
  }
}

// 处理 img 标签
function wrapImg(element) {
  //   if (wrappedImgElements.indexOf(element) !== -1) {
  //     return
  //   }

  //   wrappedImgElements.push(element)

  const originalOnError = element.onerror
  element.onerror = function (e) {
    if (typeof originalOnError === "function") {
      originalOnError.call(this, e)
    }

    ImgErrorHandler(element)
  }

  if (element.complete && element.naturalWidth === 0) {
    // 意味着没加载成功，直接重试
    ImgErrorHandler(element)
  }
}

let DYNAMIC_TARGET = null

export function obseverImg(target) {
  return
  if (DYNAMIC_TARGET) {
    // 不允许多次observe
    return
  }
  DYNAMIC_TARGET = target
  observeStatic(target)
  observeDynamic(target)
}
