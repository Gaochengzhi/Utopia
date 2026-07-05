import { useState, useEffect, useCallback, useRef } from "react"

/**
 * Generate a URL-friendly slug from heading text.
 * Handles CJK characters by keeping them as-is; only strips
 * punctuation and collapses whitespace into hyphens.
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
 * Parse headings from a raw markdown string.
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

    // Skip h1 headings — they are the article title, not part of the TOC
    const match = /^(#{2,5})\s+(.+)$/.exec(line)
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

    headings.push({ title, id: slug, level })
  }

  // The regex above already skips h1 (only matches #{2,5}).
  // Indent is simply level - 2: h2 → 0, h3 → 1, h4 → 2, h5 → 3.
  return headings.map((h) => ({
    ...h,
    indent: h.level - 2,
  }))
}

/**
 * Shared hook: parse headings from markdown and track which one
 * is currently visible (IntersectionObserver).
 */
function useHeadings(content) {
  const [toc, setToc] = useState([])
  const [activeId, setActiveId] = useState("")

  useEffect(() => {
    setToc(parseHeadingsFromMarkdown(content))
  }, [content])

  useEffect(() => {
    if (toc.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 }
    )

    for (const h of toc) {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [toc])

  return { toc, activeId }
}

function scrollToHeading(id) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: "smooth" })
  }
}

/* ═══════════════════════════════════════════════════════
   桌面端：Time Machine 刻度轨
   静止只见刻度 + 当前章节标题；光标扫过时附近刻度
   按高斯衰减放大、标题淡入（Dock magnification）。
   鱼眼是纯视觉反馈，走 ref 直改样式，不触发 React 重渲染。
   ═══════════════════════════════════════════════════════ */
export function Toc({ content }) {
  const { toc, activeId } = useHeadings(content)
  const railRef = useRef(null)
  const itemRefs = useRef([])
  const hoverYRef = useRef(null)
  const rafRef = useRef(null)
  const activeIdxRef = useRef(-1)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    itemRefs.current = []
  }, [toc])

  useEffect(() => {
    reducedMotionRef.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false
  }, [])

  const paint = useCallback(() => {
    rafRef.current = null
    const hy = hoverYRef.current
    itemRefs.current.forEach((refs, i) => {
      if (!refs || !refs.el || !refs.tick || !refs.label) return
      let g = 0
      if (hy != null && !reducedMotionRef.current) {
        const cy = refs.el.offsetTop + refs.el.offsetHeight / 2
        const d = (cy - hy) / 52
        g = Math.exp(-d * d)
      }
      const on = i === activeIdxRef.current
      refs.tick.style.width = `${refs.base + g * 34 + (on ? 9 : 0)}px`
      const opacity = hy == null ? (on ? 1 : 0) : Math.max(g, on ? 0.25 : 0)
      refs.label.style.opacity = opacity.toFixed(3)
      refs.label.style.transform =
        `translateY(-50%) translateX(${(g * 12).toFixed(1)}px) scale(${(0.88 + g * 0.24).toFixed(3)})`
      refs.label.style.zIndex = String(5 + Math.round(g * 10))
    })
  }, [])

  const schedule = useCallback(() => {
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(paint)
    }
  }, [paint])

  useEffect(() => {
    activeIdxRef.current = toc.findIndex((o) => o.id === activeId)
    schedule()
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [toc, activeId, schedule])

  const handleMove = useCallback((e) => {
    if (!railRef.current) return
    hoverYRef.current = e.clientY - railRef.current.getBoundingClientRect().top
    schedule()
  }, [schedule])

  const handleLeave = useCallback(() => {
    hoverYRef.current = null
    schedule()
  }, [schedule])

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
   平时不占版面；滚动时当前章节标题短暂浮现后隐去；
   点按细线列（或从右缘向内滑）弹出完整抽屉目录。
   ═══════════════════════════════════════════════════════ */
export function MobileToc({ content }) {
  const { toc, activeId } = useHeadings(content)
  const [open, setOpen] = useState(false)
  const [chipVisible, setChipVisible] = useState(false)
  const chipTimerRef = useRef(null)
  const touchStartXRef = useRef(null)

  // 文章太长时细线列只保留 h2，避免撑出屏幕
  const railToc = toc.length > 26 ? toc.filter((o) => o.indent === 0) : toc
  const activeTitle = toc.find((o) => o.id === activeId)?.title || ""

  // 滚动 → 当前标题浮现，停止滚动 1.4s 后隐去
  useEffect(() => {
    if (toc.length === 0) return
    const onScroll = () => {
      setChipVisible(true)
      if (chipTimerRef.current) clearTimeout(chipTimerRef.current)
      chipTimerRef.current = setTimeout(() => setChipVisible(false), 1400)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (chipTimerRef.current) clearTimeout(chipTimerRef.current)
    }
  }, [toc])

  // 从右缘向内滑弹出抽屉
  const onTouchStart = (e) => {
    touchStartXRef.current = e.touches?.[0]?.clientX ?? null
  }
  const onTouchMove = (e) => {
    const startX = touchStartXRef.current
    if (startX == null) return
    const x = e.touches?.[0]?.clientX
    if (x != null && startX - x > 24) {
      touchStartXRef.current = null
      setOpen(true)
    }
  }

  if (toc.length === 0) return null

  return (
    <>
      {!open && (
        <div
          className="tocrail-m"
          aria-label="打开目录"
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
        >
          {railToc.map((o) => (
            <span
              key={o.id}
              className={`tocrail-m-tick ${o.indent > 0 ? "lv3" : ""} ${activeId === o.id ? "on" : ""}`}
            />
          ))}
        </div>
      )}

      <div className={`tocrail-m-chip ${chipVisible && !open && activeTitle ? "show" : ""}`}>
        {activeTitle}
      </div>

      {open && (
        <div className="tocrail-m-drawer">
          <div className="backdrop" onClick={() => setOpen(false)} />
          <div className="tocrail-m-panel">
            <div className="tk-meta mb-4">
              <span>CONTENTS</span>
              <span className="tk-leader" />
              <span>目录</span>
            </div>
            {toc.map((o) => (
              <button
                key={o.id}
                className={`tocrail-m-item ${o.indent > 0 ? "lv3" : ""} ${activeId === o.id ? "on" : ""}`}
                onClick={() => {
                  setOpen(false)
                  scrollToHeading(o.id)
                }}
              >
                {o.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
