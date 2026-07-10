import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import 'react-photo-view/dist/react-photo-view.css'
import { getCdnFullUrl, getCdnPreviewUrl } from '/lib/cdnUrl'
import { useLocale } from '/lib/i18n/useLocale'
import LangSwitch from './LangSwitch'
import DeferredImage from './DeferredImage'
import s from './Gallery.module.css'

const PAGE_SIZE = 18
// Match the category-detail contact sheets: widths follow aspect ratio, which
// makes every frame in one row resolve to exactly the same image height.
const ROW_TARGETS = [3.4, 4.3, 2.9, 3.8, 4.6, 3.1]
// Newly uploaded photos can precede the bundled dimension manifest. Until the
// next manifest refresh, use varied photographic ratios rather than making
// every unknown frame the same square/landscape shape.
const FALLBACK_ASPECTS = [1.55, 0.72, 1.2, 0.82, 1.75, 1, 0.68, 1.4]

const pad2 = value => String(value).padStart(2, '0')
const formatDate = value => {
  const date = new Date(Number(value))
  if (!value || Number.isNaN(date.getTime())) return 'DATE —'
  return `DATE ${date.getUTCFullYear()}.${pad2(date.getUTCMonth() + 1)}.${pad2(date.getUTCDate())}`
}

function rowsFor(entries, pageIndex) {
  const rows = []
  let items = []
  let sum = 0
  let targetIndex = pageIndex * 2
  entries.forEach((entry, index) => {
    const fallback = FALLBACK_ASPECTS[(pageIndex * PAGE_SIZE + index) % FALLBACK_ASPECTS.length]
    const ar = entry.w && entry.h ? entry.w / entry.h : fallback
    const roundedAr = Math.round(ar * 1000) / 1000
    items.push({ ...entry, ar: roundedAr })
    sum += roundedAr

    if (sum >= ROW_TARGETS[targetIndex % ROW_TARGETS.length] || items.length >= 5) {
      rows.push({ items, target: sum, partial: false })
      items = []
      sum = 0
      targetIndex++
    }
  })

  if (items.length) {
    const target = ROW_TARGETS[targetIndex % ROW_TARGETS.length]
    rows.push({
      items,
      target: Math.max(sum, Math.min(target, sum * 1.9)),
      partial: sum < target * 0.72,
    })
  }
  return rows
}

function Frame({ entry, number }) {
  return (
    <div className={s.jit} style={{ flexGrow: entry.ar }}>
      <PhotoView src={getCdnFullUrl(entry.p)}>
        <div className={s.ph} style={{ aspectRatio: entry.ar }}>
          <DeferredImage
            src={getCdnPreviewUrl(entry.p)}
            alt={`${entry.cat} ${entry.filename}`}
            draggable={false}
          />
        </div>
      </PhotoView>
      <span className={s.fno} aria-label={`Archive frame ${number}`}>
        <span>TP-5063</span>
        <span>{entry.cat.toUpperCase()}</span>
        <span className={s.filmDate}>{formatDate(entry.createdAt)}</span>
        <span>F {String(number).padStart(4, '0')}</span>
      </span>
    </div>
  )
}

/**
 * Append-only cursor pagination keeps every rendered film page stable while
 * DeferredImage independently releases decoded bitmaps far from the viewport.
 * Keeping the DOM pages avoids scroll jumps and observer ping-pong when a
 * compact viewport can see both ends of a small virtual window at once.
 */
export default function RecentArchive({ initialPage }) {
  const [pages, setPages] = useState(() => initialPage?.photos?.length ? [initialPage.photos] : [])
  const [hasOlder, setHasOlder] = useState(Boolean(initialPage?.hasMore))
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [locale, setLocale] = useLocale()

  const pagesRef = useRef(initialPage?.photos?.length ? [initialPage.photos] : [])
  const hasOlderRef = useRef(Boolean(initialPage?.hasMore))
  const busyRef = useRef(false)
  const abortRef = useRef(null)
  const bottomTriggerRef = useRef(null)
  const retryRef = useRef(null)

  const commitPages = useCallback(next => {
    pagesRef.current = next
    setPages(next)
  }, [])
  const commitHasOlder = useCallback(next => {
    hasOlderRef.current = next
    setHasOlder(next)
  }, [])

  const requestPage = useCallback(async ({ limit }) => {
    const currentPages = pagesRef.current
    const boundaryPage = currentPages[currentPages.length - 1]
    const boundary = boundaryPage?.[boundaryPage.length - 1]
    if (!boundary?.cursor || busyRef.current) return null

    busyRef.current = true
    setLoading('older')
    setError('')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const query = new URLSearchParams({ direction: 'older', limit: String(limit), cursor: boundary.cursor })
      const response = await fetch(`/api/photography/recent?${query}`, { signal: controller.signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Archive request failed')
      return data
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError('胶片暂时无法显影，请重试。')
      }
      return null
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      busyRef.current = false
      setLoading('')
    }
  }, [])

  const loadOlder = useCallback(async () => {
    if (!hasOlderRef.current || busyRef.current) return
    retryRef.current = loadOlder
    const data = await requestPage({ limit: PAGE_SIZE })
    if (!data?.photos?.length) {
      if (data) commitHasOlder(false)
      return
    }

    commitPages([...pagesRef.current, data.photos])
    commitHasOlder(Boolean(data.hasMore))
  }, [commitHasOlder, commitPages, requestPage])

  useEffect(() => {
    const element = bottomTriggerRef.current
    if (!element || !hasOlder || !('IntersectionObserver' in window)) return undefined

    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => entry.isIntersecting && loadOlder()),
      { rootMargin: '900px 0px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasOlder, loadOlder, pages])

  useEffect(() => () => abortRef.current?.abort(), [])

  let frameNumber = 1
  return (
    <div className={s.root} data-lang={locale}>
      <PhotoProvider maskOpacity={0.96} pullClosable>
        <div className={s.top}>
          <Link href="/photographer" className={s.back}>
            <svg className={s.backMark} viewBox="0 0 16 16" aria-hidden="true"><path d="M13 2.5 4 8l9 5.5Z" /></svg>
            <span>{locale === 'ja' ? '暗室' : '暗房 DARKROOM'}</span>
          </Link>
          <span className={s.pos}>LATEST <b>NOW</b></span>
          <LangSwitch locale={locale} onChange={setLocale} />
        </div>

        <header className={`${s.head} ${s.recentHead}`}>
          <h1 className={`${s.h1} ${s.recentTitle}`}>RECENT<span className={s.zh}>最近</span><span className={s.ja}>最新</span></h1>
        </header>

        {pages.map((page, pageIndex) => {
          const rows = rowsFor(page, pageIndex)
          const pageStart = frameNumber
          frameNumber += page.length
          return (
            <section key={page[0]?.p || pageIndex} data-recent-page className={s.roll} style={{ marginTop: 0 }}>
              <div className={s.edgeprint}>RECENT PRINTS · TAITAN_PASCAL · UTOPIA · CONTINUOUS ARCHIVE · RECENT PRINTS · TAITAN_PASCAL · UTOPIA ·</div>
              <div className={s.rollNo}>ROLL {pad2(pageIndex + 1)} · NEWEST FIRST · {page.length} FRAMES</div>
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className={s.jrow}>
                  {row.items.map((entry, itemIndex) => (
                    <Frame key={entry.p} entry={entry} number={pageStart + rows.slice(0, rowIndex).reduce((sum, prior) => sum + prior.items.length, 0) + itemIndex} />
                  ))}
                  {row.partial && (
                    <div
                      className={s.jpad}
                      style={{ flexGrow: Math.max(0, row.target - row.items.reduce((sum, entry) => sum + entry.ar, 0)) }}
                    />
                  )}
                </div>
              ))}
            </section>
          )
        })}

        <div ref={bottomTriggerRef} className="h-px" aria-hidden="true" />

        <footer className={s.foot}>
          {loading && <div className={s.footBar}>显影中 DEVELOPING…</div>}
          {error && (
            <div className={s.footBar}>
              <span>{error}</span>
              <button type="button" onClick={() => retryRef.current?.()} className={s.back}>RETRY →</button>
            </div>
          )}
          {!loading && !error && !hasOlder && (
            <div className={s.footBar}><span>· FIN · ARCHIVE END</span><Link href="/photographer">回到暗房 BACK TO DARKROOM</Link></div>
          )}
        </footer>
      </PhotoProvider>
    </div>
  )
}
