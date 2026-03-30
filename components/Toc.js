import { useState, useEffect, useCallback } from "react"

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

  const lines = markdown.split("\n")
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

    const match = /^(#{1,5})\s+(.+)$/.exec(line)
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

  // Calculate indent relative to the minimum level present
  if (headings.length === 0) return []
  const minLevel = Math.min(...headings.map((h) => h.level))
  return headings.map((h) => ({
    ...h,
    indent: h.level - minLevel,
  }))
}

export function Toc({ content }) {
  const [toc, setToc] = useState([])
  const [activeId, setActiveId] = useState("")

  // Build TOC from the markdown string
  useEffect(() => {
    const headings = parseHeadingsFromMarkdown(content)
    setToc(headings)
  }, [content])

  // Highlight the currently visible heading via IntersectionObserver
  useEffect(() => {
    if (toc.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first visible heading
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

  const handleClick = useCallback((e, o) => {
    e.preventDefault()
    const el = document.getElementById(o.id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }, [])

  return (
    <>
      <div className="lg:h-[88vh] overflow-y-scroll mb-4 p-4 ml-4 lg:min-w-[18rem] lg:max-w-[18rem] bg-gray-50/80 dark:bg-gray-800/40 rounded-lg backdrop-blur-sm">
        {toc.map((o) => (
          <div
            onClick={(e) => handleClick(e, o)}
            key={o.id}
            className={`flex text-sm mt-1 overflow-ellipsis transition-all ease-in firstT cursor-pointer py-1.5 px-2 rounded-md hover:bg-gray-200/60 dark:hover:bg-gray-700/60 ${
              activeId === o.id
                ? "bg-blue-100/60 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                : o.indent === 0
                ? "text-gray-800 dark:text-gray-100 font-medium"
                : o.indent === 1
                ? "text-gray-700 dark:text-gray-200"
                : o.indent === 2
                ? "text-gray-600 dark:text-gray-300"
                : "text-gray-500 dark:text-gray-400"
            }`}
            style={{ marginLeft: `${o.indent * 0.75}rem` }}
          >
            <div className="truncate text-left leading-5">{o.title}</div>
          </div>
        ))}
      </div>
    </>
  )
}
