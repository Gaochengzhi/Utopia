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
const MAX_ACTIVE_PAGES = 3
// Deliberately alternate two- and three-frame rows. The weights are visual
// sizes rather than image aspect ratios, so brand-new photos without bundled
// dimension metadata still form an uneven contact sheet instead of a 3×3 grid.
const ROW_LAYOUTS = [
  [1.65, 0.82],
  [0.76, 1.38, 0.92],
  [1.08, 0.68, 1.48],
  [0.88, 1.42],
  [1.42, 0.78, 1.02],
  [0.72, 1.28],
]

const pad2 = value => String(value).padStart(2, '0')
const formatDate = value => {
  const date = new Date(Number(value))
  if (!value || Number.isNaN(date.getTime())) return 'DATE —'
  return `DATE ${date.getUTCFullYear()}.${pad2(date.getUTCMonth() + 1)}.${pad2(date.getUTCDate())}`
}

function rowsFor(entries, pageIndex) {
  const rows = []
  let cursor = 0
  let layoutIndex = pageIndex * 2
  while (cursor < entries.length) {
    const weights = ROW_LAYOUTS[layoutIndex % ROW_LAYOUTS.length]
    const take = Math.min(weights.length, entries.length - cursor)
    const row = entries.slice(cursor, cursor + take).map((entry, index) => {
      const ar = entry.w && entry.h ? entry.w / entry.h : 1.5
      return {
        ...entry,
        ar: Math.round(ar * 1000) / 1000,
        layoutWeight: weights[index],
      }
    })
    rows.push(row)
    cursor += take
    layoutIndex++
  }
  return rows
}

function Frame({ entry, number }) {
  return (
    <div className={s.jit} style={{ flexGrow: entry.layoutWeight }}>
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

function pageHeight(element) {
  if (!element) return 0
  const style = window.getComputedStyle(element)
  return element.getBoundingClientRect().height + Number.parseFloat(style.marginBottom || 0)
}

/**
 * A bidirectional, bounded scroll window. Exactly three film pages (54
 * frames) can stay mounted. Pages outside the window are represented only by
 * a height + cursor range and are fetched again when the visitor scrolls back.
 */
export default function RecentArchive({ initialPage }) {
  const [pages, setPages] = useState(() => initialPage?.photos?.length ? [initialPage.photos] : [])
  const [topSpacer, setTopSpacer] = useState(0)
  const [bottomSpacer, setBottomSpacer] = useState(0)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [locale, setLocale] = useLocale()

  const pagesRef = useRef(initialPage?.photos?.length ? [initialPage.photos] : [])
  const hasOlderRef = useRef(Boolean(initialPage?.hasMore))
  const aboveRangesRef = useRef([])
  const belowRangesRef = useRef([])
  const topSpacerRef = useRef(0)
  const bottomSpacerRef = useRef(0)
  const busyRef = useRef(false)
  const abortRef = useRef(null)
  const rootRef = useRef(null)
  const topTriggerRef = useRef(null)
  const bottomTriggerRef = useRef(null)
  const retryRef = useRef(null)

  const commitPages = useCallback(next => {
    pagesRef.current = next
    setPages(next)
  }, [])
  const changeTopSpacer = useCallback(delta => {
    topSpacerRef.current = Math.max(0, topSpacerRef.current + delta)
    setTopSpacer(topSpacerRef.current)
  }, [])
  const changeBottomSpacer = useCallback(delta => {
    bottomSpacerRef.current = Math.max(0, bottomSpacerRef.current + delta)
    setBottomSpacer(bottomSpacerRef.current)
  }, [])

  const requestPage = useCallback(async ({ direction, limit }) => {
    const currentPages = pagesRef.current
    const boundaryPage = direction === 'older'
      ? currentPages[currentPages.length - 1]
      : currentPages[0]
    const boundary = direction === 'older'
      ? boundaryPage?.[boundaryPage.length - 1]
      : boundaryPage?.[0]
    if (!boundary?.cursor || busyRef.current) return null

    busyRef.current = true
    setLoading(direction)
    setError('')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const query = new URLSearchParams({ direction, limit: String(limit), cursor: boundary.cursor })
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
    const restoring = belowRangesRef.current[belowRangesRef.current.length - 1]
    if (!restoring && !hasOlderRef.current) return
    retryRef.current = loadOlder
    const data = await requestPage({ direction: 'older', limit: restoring?.count || PAGE_SIZE })
    if (!data?.photos?.length) {
      if (data) hasOlderRef.current = false
      return
    }

    const current = pagesRef.current
    const evicted = current.length >= MAX_ACTIVE_PAGES ? current[0] : null
    if (evicted) {
      const element = rootRef.current?.querySelector('[data-recent-page]')
      const height = pageHeight(element)
      aboveRangesRef.current.push({ count: evicted.length, height })
      changeTopSpacer(height)
    }
    if (restoring) {
      belowRangesRef.current.pop()
      changeBottomSpacer(-restoring.height)
    }
    commitPages([...(evicted ? current.slice(1) : current), data.photos])
    hasOlderRef.current = Boolean(data.hasMore)
  }, [changeBottomSpacer, changeTopSpacer, commitPages, requestPage])

  const loadNewer = useCallback(async () => {
    const restoring = aboveRangesRef.current[aboveRangesRef.current.length - 1]
    if (!restoring) return
    retryRef.current = loadNewer
    const data = await requestPage({ direction: 'newer', limit: restoring.count })
    if (!data?.photos?.length) return

    const current = pagesRef.current
    const evicted = current.length >= MAX_ACTIVE_PAGES ? current[current.length - 1] : null
    if (evicted) {
      const pageElements = rootRef.current?.querySelectorAll('[data-recent-page]')
      const height = pageHeight(pageElements?.[pageElements.length - 1])
      belowRangesRef.current.push({ count: evicted.length, height })
      changeBottomSpacer(height)
    }
    aboveRangesRef.current.pop()
    changeTopSpacer(-restoring.height)
    commitPages([data.photos, ...(evicted ? current.slice(0, -1) : current)])
  }, [changeBottomSpacer, changeTopSpacer, commitPages, requestPage])

  useEffect(() => {
    const observe = (element, callback) => {
      if (!element || !('IntersectionObserver' in window)) return undefined
      const observer = new IntersectionObserver(
        entries => entries.forEach(entry => entry.isIntersecting && callback()),
        { rootMargin: '900px 0px' }
      )
      observer.observe(element)
      return () => observer.disconnect()
    }
    const stopTop = observe(topTriggerRef.current, loadNewer)
    const stopBottom = observe(bottomTriggerRef.current, loadOlder)
    return () => {
      stopTop?.()
      stopBottom?.()
    }
  }, [loadNewer, loadOlder, pages])

  useEffect(() => () => abortRef.current?.abort(), [])

  let frameNumber = 1
  return (
    <div ref={rootRef} className={s.root} data-lang={locale}>
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

        <div style={{ height: topSpacer }} aria-hidden="true" />
        <div ref={topTriggerRef} className="h-px" aria-hidden="true" />

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
                  {row.map((entry, itemIndex) => (
                    <Frame key={entry.p} entry={entry} number={pageStart + rows.slice(0, rowIndex).reduce((sum, prior) => sum + prior.length, 0) + itemIndex} />
                  ))}
                </div>
              ))}
            </section>
          )
        })}

        <div ref={bottomTriggerRef} className="h-px" aria-hidden="true" />
        <div style={{ height: bottomSpacer }} aria-hidden="true" />

        <footer className={s.foot}>
          {loading && <div className={s.footBar}>显影中 DEVELOPING…</div>}
          {error && (
            <div className={s.footBar}>
              <span>{error}</span>
              <button type="button" onClick={() => retryRef.current?.()} className={s.back}>RETRY →</button>
            </div>
          )}
          {!loading && !error && !hasOlderRef.current && belowRangesRef.current.length === 0 && (
            <div className={s.footBar}><span>· FIN · ARCHIVE END</span><Link href="/photographer">回到暗房 BACK TO DARKROOM</Link></div>
          )}
        </footer>
      </PhotoProvider>
    </div>
  )
}
