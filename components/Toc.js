import { useState, useEffect, useCallback, useRef } from "react"

/**
 * Generate a URL-friendly slug from heading text.
 * Handles CJK characters by keeping them as-is; only strips
 * punctuation and collapses whitespace into hyphens.
 * Must stay in sync with the identical function in MarkdownArticle.js.
 */
function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // keep letters (any script), digits, spaces, hyphens
    .replace(/[\s]+/g, "-")            // spaces → hyphens
    .replace(/-+/g, "-")              // collapse consecutive hyphens
    .replace(/^-|-$/g, "")            // trim leading/trailing hyphens
}

/**
 * Parse h2/h3 headings from a raw markdown string.
 * Returns an array of { title, id, level, indent }.
 */
function parseHeadingsFromMarkdown(markdown) {
  if (!markdown) return []

  const lines = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  const headings = []
  const seenSlugs = {}
  let inCodeBlock = false

  for (const line of lines) {
    // Skip code blocks
    if (/^```/.test(line.trim())) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    // 只收 h2/h3：h1 是文章标题，h4/h5 太细碎不进目录轨
    const match = /^(#{2,3})\s+(.+)$/.exec(line)
    if (!match) continue

    const level = match[1].length
    const title = match[2].replace(/[*_`~]/g, "").trim() // strip inline formatting
    let slug = slugify(title)

    // De-duplicate slugs
    if (seenSlugs[slug] != null) {
      seenSlugs[slug]++
      slug = `${slug}-${seenSlugs[slug]}`
    } else {
      seenSlugs[slug] = 0
    }

    headings.push({ title, id: slug, level, indent: level - 2 })
  }

  return headings
}

/**
 * Shared hook: parse headings from markdown and track which one is
 * current. Tracking is scroll-position based (the last heading whose
 * top passed the 30%-viewport line), so it stays in sync scrolling
 * both directions — IntersectionObserver only fired on entry and
 * went stale when scrolling back up.
 */
function useHeadings(content) {
  const [toc, setToc] = useState([])
  const [activeId, setActiveId] = useState("")

  useEffect(() => {
    setToc(parseHeadingsFromMarkdown(content))
  }, [content])

  useEffect(() => {
    if (toc.length === 0) return

    let raf = null
    const compute = () => {
      raf = null
      const doc = document.documentElement
      const marker = window.innerHeight * 0.3
      const atBottom = doc.scrollTop + doc.clientHeight >= doc.scrollHeight - 2

      let current = toc[0].id
      if (atBottom) {
        current = toc[toc.length - 1].id
      } else {
        for (const h of toc) {
          const el = document.getElementById(h.id)
          if (!el) continue
          if (el.getBoundingClientRect().top <= marker) current = h.id
          else break
        }
      }
      setActiveId((prev) => (prev === current ? prev : current))
    }

    const onScroll = () => {
      if (raf == null) raf = requestAnimationFrame(compute)
    }

    compute()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf != null) cancelAnimationFrame(raf)
    }
  }, [toc])

  return { toc, activeId }
}

function scrollToHeading(id) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: "smooth" })
  }
}

/**
 * Shared fisheye painter: writes tick width / label opacity+scale
 * inline via refs — no React re-render per pointermove.
 * focusY == null 表示无光标/手指，回到静态基准态。
 */
function makeFisheyePaint(itemRefs, activeIdxRef, reducedMotionRef, opts) {
  const { tickGrow, labelIdle } = opts
  // amp：鱼眼幅度。hover/按压 = 1；滚动跟随的气泡弱一档（0.6）
  return (focusY, amp = 1) => {
    itemRefs.current.forEach((refs, i) => {
      if (!refs || !refs.el || !refs.tick || !refs.label) return
      let g = 0
      let d = 0
      if (focusY != null && !reducedMotionRef.current) {
        // offsetTop 不受 transform 影响，位移后力场依然稳定
        const cy = refs.el.offsetTop + refs.el.offsetHeight / 2
        d = (cy - focusY) / 56
        g = Math.exp(-d * d) * amp
      }
      const on = i === activeIdxRef.current
      refs.tick.style.width = `${refs.base + g * tickGrow + (on ? 8 : 0)}px`
      // 密度形变：焦点附近的条目被挤向两侧（Time Machine 的呼吸感）
      refs.el.style.transform = `translateY(${(d * g * 9).toFixed(1)}px)`

      // 基准态：当前大而深，其余小而淡（h3 再淡一档，字号见 CSS）；
      // 当前章节的「大」主要来自气泡驻留（焦点停在它上面），on 只加一点
      const baseOp = labelIdle ? (on ? 1 : refs.lv3 ? 0.5 : 0.75) : 0
      const hidden = !labelIdle && focusY == null
      const opacity = hidden ? 0 : Math.min(1, baseOp + g * 0.55)
      const scale = (on ? 1.06 : 1) + g * 0.35
      refs.label.style.opacity = opacity.toFixed(3)
      refs.label.style.transform =
        `translateY(-50%) translateX(${(g * refs.dir * 14).toFixed(1)}px) scale(${scale.toFixed(3)})`
    })
  }
}

/* ═══════════════════════════════════════════════════════
   桌面端：Time Machine 刻度轨
   h2/h3 标题默认全部可见；光标扫过时附近刻度按高斯
   衰减放大（Dock magnification）。走 ref 直改样式。
   ═══════════════════════════════════════════════════════ */
export function Toc({ content }) {
  const { toc, activeId } = useHeadings(content)
  const railRef = useRef(null)
  const itemRefs = useRef([])
  const hoverYRef = useRef(null)
  const focusYRef = useRef(null)   // 滚动跟随的焦点：缓动逼近 targetY
  const targetYRef = useRef(null)  // 当前章节的中心（焦点的目标位置）
  const loopRef = useRef(null)
  const activeIdxRef = useRef(-1)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    // 裁掉目录变短后残留的尾部条目；不能整个清空——
    // effect 在渲染后执行，会把刚注册好的 refs 抹掉
    itemRefs.current.length = toc.length
  }, [toc])

  useEffect(() => {
    reducedMotionRef.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false
  }, [])

  const paintRef = useRef(null)
  if (!paintRef.current) {
    paintRef.current = makeFisheyePaint(itemRefs, activeIdxRef, reducedMotionRef, {
      tickGrow: 32,
      labelIdle: true, // 桌面：标签常显
    })
  }

  // 单一 rAF 驱动：hover 时以光标为焦点（全幅鱼眼）；
  // 无光标时焦点每帧向当前章节缓动 16%，放大气泡沿轨道
  // 平滑滑行——页面滚动切章时的 Time Machine 缓动感
  const ensureLoop = useCallback(() => {
    if (loopRef.current != null) return
    const step = () => {
      loopRef.current = null
      if (hoverYRef.current != null) {
        paintRef.current(hoverYRef.current, 1)
        return
      }
      const target = targetYRef.current
      if (target == null) {
        paintRef.current(null, 1)
        return
      }
      let cur = focusYRef.current
      if (cur == null || reducedMotionRef.current) cur = target
      const diff = target - cur
      let settled = true
      if (Math.abs(diff) > 0.5) {
        cur += diff * 0.16
        settled = false
      } else {
        cur = target
      }
      focusYRef.current = cur
      paintRef.current(cur, 0.6)
      if (!settled) loopRef.current = requestAnimationFrame(step)
    }
    loopRef.current = requestAnimationFrame(step)
  }, [])

  useEffect(() => {
    activeIdxRef.current = toc.findIndex((o) => o.id === activeId)
    const refs = itemRefs.current[activeIdxRef.current]
    if (refs?.el) {
      targetYRef.current = refs.el.offsetTop + refs.el.offsetHeight / 2
      // 首次定位不做长距离滑入，直接落位
      if (focusYRef.current == null) focusYRef.current = targetYRef.current
    } else {
      targetYRef.current = null
    }
    ensureLoop()
  }, [toc, activeId, ensureLoop])

  // 只在卸载时取消挂起的帧并复位，防止 ensureLoop 永久空转
  useEffect(() => () => {
    if (loopRef.current != null) {
      cancelAnimationFrame(loopRef.current)
      loopRef.current = null
    }
  }, [])

  const handleMove = useCallback((e) => {
    if (!railRef.current) return
    hoverYRef.current = e.clientY - railRef.current.getBoundingClientRect().top
    ensureLoop()
  }, [ensureLoop])

  const handleLeave = useCallback(() => {
    hoverYRef.current = null
    ensureLoop()
  }, [ensureLoop])

  const handleClick = useCallback((e, o) => {
    e.preventDefault()
    scrollToHeading(o.id)
  }, [])

  if (toc.length === 0) return <div className="tocrail" aria-hidden="true" />

  return (
    <nav
      ref={railRef}
      className="tocrail"
      aria-label="目录"
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {toc.map((o, i) => (
        <div
          key={o.id}
          ref={(el) => {
            if (el) {
              itemRefs.current[i] = {
                el,
                tick: el.children[0],
                label: el.children[1],
                base: o.indent === 0 ? 22 : 12,
                lv3: o.indent > 0,
                dir: 1, // 标签在刻度右侧，放大时向右推
              }
            }
          }}
          className={`tocrail-item ${o.indent > 0 ? "lv3" : ""} ${activeId === o.id ? "on" : ""}`}
          onClick={(e) => handleClick(e, o)}
        >
          <span className="tocrail-tick" />
          <span className="tocrail-label">{o.title}</span>
        </div>
      ))}
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════
   移动端：右缘细线列
   默认只见刻度；手指按压时标题浮现，跟随手指鱼眼放大
   （同桌面行为），松手滚动到离手指最近的章节。
   ═══════════════════════════════════════════════════════ */
export function MobileToc({ content }) {
  const { toc, activeId } = useHeadings(content)
  const railRef = useRef(null)
  const itemRefs = useRef([])
  const pressYRef = useRef(null)
  const rafRef = useRef(null)
  const activeIdxRef = useRef(-1)
  const reducedMotionRef = useRef(false)
  // 按压中：标题浮现区域垫上半透明纸底，避免和正文混在一起
  const [pressing, setPressing] = useState(false)

  // 文章太长时细线列只保留 h2，避免撑出屏幕
  const railToc = toc.length > 26 ? toc.filter((o) => o.indent === 0) : toc

  useEffect(() => {
    // 同桌面端：只裁尾，不整个清空
    itemRefs.current.length = railToc.length
  }, [railToc.length])

  useEffect(() => {
    reducedMotionRef.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false
  }, [])

  const paintRef = useRef(null)
  if (!paintRef.current) {
    paintRef.current = makeFisheyePaint(itemRefs, activeIdxRef, reducedMotionRef, {
      tickGrow: 14,
      labelIdle: false, // 移动端：默认不显示标签，按压才浮现
    })
  }

  const schedule = useCallback(() => {
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        paintRef.current(pressYRef.current)
      })
    }
  }, [])

  useEffect(() => {
    activeIdxRef.current = railToc.findIndex((o) => o.id === activeId)
    schedule()
  }, [railToc, activeId, schedule])

  // 同桌面端：只在卸载时取消挂起帧并复位（防 schedule 永久空转）
  useEffect(() => () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const setPressY = useCallback((e) => {
    if (!railRef.current) return
    pressYRef.current = e.clientY - railRef.current.getBoundingClientRect().top
    schedule()
  }, [schedule])

  const onPointerDown = useCallback((e) => {
    railRef.current?.setPointerCapture?.(e.pointerId)
    setPressing(true)
    setPressY(e)
  }, [setPressY])

  const onPointerMove = useCallback((e) => {
    if (pressYRef.current == null) return
    setPressY(e)
  }, [setPressY])

  const onPointerUp = useCallback(() => {
    const y = pressYRef.current
    pressYRef.current = null
    setPressing(false)
    schedule()
    if (y == null) return
    // 松手：跳到离手指最近的章节
    let best = null
    let bestDist = Infinity
    itemRefs.current.forEach((refs, i) => {
      if (!refs || !refs.el) return
      const cy = refs.el.offsetTop + refs.el.offsetHeight / 2
      const d = Math.abs(cy - y)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    })
    if (best != null && railToc[best]) scrollToHeading(railToc[best].id)
  }, [railToc, schedule])

  const onPointerCancel = useCallback(() => {
    pressYRef.current = null
    setPressing(false)
    schedule()
  }, [schedule])

  if (toc.length === 0) return null

  return (
    <nav
      ref={railRef}
      className={`tocrail-m ${pressing ? "pressing" : ""}`}
      aria-label="目录"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {railToc.map((o, i) => (
        <div
          key={o.id}
          ref={(el) => {
            if (el) {
              itemRefs.current[i] = {
                el,
                label: el.children[0],
                tick: el.children[1],
                base: o.indent === 0 ? 10 : 6,
                lv3: o.indent > 0,
                dir: -1, // 标签在刻度左侧，放大时向左推
              }
            }
          }}
          className={`tocrail-m-item ${o.indent > 0 ? "lv3" : ""} ${activeId === o.id ? "on" : ""}`}
        >
          <span className="tocrail-m-label">{o.title}</span>
          <span className="tocrail-m-tick" />
        </div>
      ))}
    </nav>
  )
}
