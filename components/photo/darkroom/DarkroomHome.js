/**
 * Darkroom — the photographer homepage.
 *
 * One continuous night in a darkroom: a full-width banner band develops on
 * load and drifts with the scroll, people ride two self-advancing film rows
 * you can grab and drag, the city surfaces as layered strips sliding left,
 * the wall's square prints hang face-down — white paper backs out — and flip
 * themselves over in a loose diagonal cascade when you reach them, and the
 * session closes on the archive index: every category, inline.
 *
 * Navigation: right-edge chapter rail + full-screen INDEX overlay.
 */
import { memo, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import 'react-photo-view/dist/react-photo-view.css'
import { Parallax, ParallaxProvider } from 'react-scroll-parallax'
import { getCdnFullUrl, getCdnPreviewUrl, getCdnThumbUrl } from '/lib/cdnUrl'
import { useLocale } from '/lib/i18n/useLocale'
import LangSwitch from '/components/photo/darkroom/LangSwitch'
import DeferredImage from '/components/photo/darkroom/DeferredImage'
import { useMarquee } from './useMarquee'
import s from './Darkroom.module.css'

const RAIL_TICKS = [
    { id: 'top', no: '00', lab: '序 PROLOGUE', ja: 'プロローグ' },
    { id: 'ch1', no: '01', lab: '人 PEOPLE', ja: '人物' },
    { id: 'ch2', no: '02', lab: '城市 CITY', ja: '街' },
    { id: 'ch3', no: '03', lab: '墙 WALL', ja: '壁' },
    { id: 'idx', no: '04', lab: '索引 INDEX', ja: '目次' },
]

// Ambient leftward drift, independent of scroll — the 5 banners never quite
// fill a screen at native aspect, so they cycle through on their own.
const HERO_SPEED = 30 // px/s

// Parallax: how far the band lags behind the page as the prologue scrolls
// away, and how much the panels zoom in while it recedes.
const HERO_LAG = 0.3
const HERO_ZOOM = 0.09
const HERO_PARALLAX_X_DESKTOP = 12
const HERO_PARALLAX_X_MOBILE = 5

// must track the .wallLightboxClosing animation duration in the stylesheet
const WALL_COLLAPSE_MS = 420
// longest tile transition-delay (widest grid, see WallGrid) plus its flip
const WALL_SETTLE_MS = 2100

const pad2 = n => String(n).padStart(2, '0')

function Img({ entry, eager, variant = 'preview', className, style }) {
    const src = variant === 'full'
        ? getCdnFullUrl(entry.p)
        : variant === 'thumb'
            ? getCdnThumbUrl(entry.p)
            : getCdnPreviewUrl(entry.p)

    return (
        <DeferredImage
            src={src}
            alt={entry.cat || ''}
            eager={eager}
            draggable={false}
            className={className}
            style={style}
        />
    )
}

/**
 * A self-advancing film row. Crawls leftward on its own, can be grabbed and
 * dragged with pointer/touch (with momentum), and a real click still opens
 * the lightbox — drags are told apart by travel distance. Its frames hold a
 * vertical parallax (`data-par`, in % of the frame height) fed by the page's
 * scroll engine.
 */
const ROW_SIZE_CLASS = { tall: 'mrowTall', mid: 'mrowMid', short: 'mrowShort', city: 'mrowCity' }
const ROW_PARALLAX = { tall: 9, mid: 7.5, short: 6, city: 4.5 }

const FilmRow = memo(function FilmRow({ photos, cats, speed, start = 0, size = 'short', frameBase, flat, scrollVelRef }) {
    const wrapRef = useRef(null)
    const trackRef = useRef(null)
    const COPIES = flat ? 1 : 3

    useMarquee({
        wrapRef,
        trackRef,
        speed,
        start,
        enabled: !flat,
        scrollVelRef,
        grabbingClass: s.grabbing,
    })

    const zhOf = cat => (cats.find(c => c.name === cat) || {}).zh || cat

    // Only the first copy registers PhotoViews (keeps the lightbox free of
    // duplicates); clicks on the looped copies are forwarded to it.
    const openFrom = i => {
        const first = trackRef.current && trackRef.current.children[0]
        const phs = first ? first.querySelectorAll(`.${s.ph}`) : []
        if (phs[i]) phs[i].click()
    }

    const frameShell = (p, i, ci) => {
        const ph = (
            <div
                className={s.ph}
                style={{ aspectRatio: p.w && p.h ? `${p.w}/${p.h}` : '2/3' }}
                {...(ci > 0 ? { onClick: () => openFrom(i) } : {})}
            >
                <Img entry={p} />
            </div>
        )
        return (
            <div key={`${ci}-${p.p}`} className={s.frame}>
                {ci === 0 ? <PhotoView src={getCdnFullUrl(p.p)}>{ph}</PhotoView> : ph}
                <span className={s.fno}>TP-{frameBase + i} ▸ {20 + i}A</span>
                <span className={s.peoplecap}>{zhOf(p.cat)} · {p.cat.toUpperCase()}</span>
            </div>
        )
    }

    return (
        <div ref={wrapRef} className={`${s.mrow} ${s[ROW_SIZE_CLASS[size]]}`} data-par={ROW_PARALLAX[size]}>
            <div ref={trackRef} className={s.mtrack}>
                {Array.from({ length: COPIES }, (_, ci) => (
                    <div key={ci} className={s.film} aria-hidden={ci > 0}>
                        {photos.map((p, i) => frameShell(p, i, ci))}
                    </div>
                ))}
            </div>
        </div>
    )
})

/** CITY now uses the same physical contact-roll treatment as PEOPLE. */
const CITY_SPEED = [24, 31, 18]
const CITY_START = [0, 260, 120]

const CityRow = memo(function CityRow({ row, ri, cats, flat, scrollVelRef }) {
    return (
        <FilmRow
            photos={row}
            cats={cats}
            speed={CITY_SPEED[ri % CITY_SPEED.length]}
            start={CITY_START[ri % CITY_START.length]}
            size="city"
            frameBase={40 + ri * 10}
            flat={flat}
            scrollVelRef={scrollVelRef}
        />
    )
})

/**
 * The wall of square prints, pinned face-down and flipped over by the scroll.
 *
 * Kept in its own memoised component: the page is ~1500 nodes and opening a
 * print used to re-render all of them, which cost a 60ms+ frame right as the
 * card started to move. Now only the wall reconciles, and only when a print is
 * actually picked up.
 *
 * The wall is square on a wide screen. Narrow screens fit fewer columns, and
 * squaring off there would leave far too few prints (4×4 = 16), so below the
 * tablet break the wall runs twice as tall as it is wide. The cascade's
 * diagonal delay reads `cols` rather than a hard-coded 8.
 */
const WALL_GRID_BY_WIDTH = [
    // [min viewport width, columns, rows]
    [1280, 8, 8],
    [1024, 7, 7],
    [820, 6, 6],
    [560, 5, 10],
    [0, 4, 8],
]
const WALL_GRID_FALLBACK = [0, 4, 8]
const wallGridFor = width => {
    const [, cols, rows] = WALL_GRID_BY_WIDTH.find(([min]) => width >= min) || WALL_GRID_FALLBACK
    return { cols, rows }
}

const WallGrid = memo(function WallGrid({ tiles, cols, flipped, settled, sourcePath, onOpen }) {
    return (
        <div
            className={`${s.wallGrid} ${flipped ? s.wallFlipped : ''} ${settled ? s.wallSettled : ''}`}
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
            {tiles.map((p, i) => (
                <div key={p.p} className={`${s.wtile} ${sourcePath === p.p ? s.wallPreviewSource : ''}`}>
                    <div
                        className={s.wflip}
                        style={{ transitionDelay: `${70 + (i % cols) * 65 + Math.floor(i / cols) * 100}ms` }}
                    >
                        <div
                            className={s.wface}
                            role="button"
                            tabIndex={0}
                            aria-label={`Open print ${i + 1}`}
                            onClick={event => onOpen(event, p)}
                            onKeyDown={event => {
                                if (event.key === 'Enter' || event.key === ' ') onOpen(event, p)
                            }}
                        >
                            <Img entry={p} variant="thumb" />
                        </div>
                        {/* bare white paper — nothing printed on the back */}
                        <div className={s.wback} aria-hidden="true" />
                    </div>
                </div>
            ))}
        </div>
    )
})

/**
 * The archive rows — one line per category with thumbs and counts. Rendered
 * twice: inline as the closing INDEX chapter, and inside the INDEX overlay.
 */
const CatRows = memo(function CatRows({ cats }) {
    return (
        <div>
            {cats.map((c, i) => (
                <Link key={c.name} className={s.ovRow} href={c.href}>
                    <span className={s.ovNo}>{pad2(i + 1)}</span>
                    <span className={s.ovName}>
                        {c.name}
                        <span className={s.zh}>{c.zh}</span>
                        <span className={s.ja}>{c.ja}</span>
                    </span>
                    <span className={s.ovThumbs}>
                        {c.thumbs.map(t => (
                            <span key={t} className={s.th}>
                                <DeferredImage src={getCdnThumbUrl(t)} alt="" />
                            </span>
                        ))}
                    </span>
                    <span className={s.ovCount}>
                        <b>{c.count}</b> 张
                    </span>
                    <span className={s.ovArr}>→</span>
                </Link>
            ))}
        </div>
    )
})

export default function DarkroomHome({ data }) {
    const { hero, stripA, stripB, stripC, cityRows, wall, cats, counts } = data

    const [overlayOpen, setOverlayOpen] = useState(false)
    const [flat, setFlat] = useState(false)
    const [heroDev, setHeroDev] = useState(false)
    const [wallInView, setWallInView] = useState(false)
    const [wallFlipped, setWallFlipped] = useState(false)
    const [wallSettled, setWallSettled] = useState(false)
    const [wallPreview, setWallPreview] = useState(null)
    const [previewArmed, setPreviewArmed] = useState(false)
    const [previewClosing, setPreviewClosing] = useState(false)
    const [locale, setLocale] = useLocale()
    const [narrowViewport, setNarrowViewport] = useState(false)
    // SSR renders the widest grid; the effect below narrows it after mount
    const [wallGrid, setWallGrid] = useState(() => wallGridFor(1280))
    const heroParallaxX = narrowViewport ? HERO_PARALLAX_X_MOBILE : HERO_PARALLAX_X_DESKTOP
    const wallTiles = useMemo(
        () => wall.slice(0, wallGrid.cols * wallGrid.rows),
        [wall, wallGrid.cols, wallGrid.rows]
    )

    const rootRef = useRef(null)
    const threadRef = useRef(null)
    const railRef = useRef(null)
    const safelightRef = useRef(null)
    const heroBandRef = useRef(null)
    const heroTrackRef = useRef(null)
    const scrollVelRef = useRef(0)
    const wallViewportRef = useRef(null)
    const ticksRef = useRef([])
    const activeRailIndexRef = useRef(0)
    const railExpandedRef = useRef(false)

    useEffect(() => {
        const media = window.matchMedia('(max-width: 900px)')
        const syncViewport = () => setNarrowViewport(media.matches)
        syncViewport()
        media.addEventListener('change', syncViewport)
        return () => media.removeEventListener('change', syncViewport)
    }, [])

    useEffect(() => {
        const syncGrid = () =>
            setWallGrid(prev => {
                const next = wallGridFor(window.innerWidth)
                // keep the identity stable so WallGrid can bail out of re-rendering
                return prev.cols === next.cols && prev.rows === next.rows ? prev : next
            })
        syncGrid()
        window.addEventListener('resize', syncGrid)
        return () => window.removeEventListener('resize', syncGrid)
    }, [])

    // 展开目录时，以当前章节为峰值绘制文字的尺寸和透明度分布；
    // 直接写 CSS 变量，避免滚动时触发 React 重渲染。
    const paintRailLabels = useCallback((activeIndex, expanded) => {
        ticksRef.current.forEach((tick, index) => {
            const label = tick?.querySelector(`.${s.lab}`)
            if (!label) return

            const peak = Math.exp(-((index - activeIndex) ** 2) / 1.45)
            const opacity = expanded ? 0.24 + peak * 0.76 : index === activeIndex ? 1 : 0
            const scale = expanded ? 0.78 + peak * 0.36 : index === activeIndex ? 1.14 : 0.84
            const offset = expanded ? (1 - peak) * 4 : index === activeIndex ? 0 : 10
            const haze = expanded ? 0.18 + peak * 0.46 : 0

            label.style.setProperty('--rail-label-opacity', opacity.toFixed(3))
            label.style.setProperty('--rail-label-scale', scale.toFixed(3))
            label.style.setProperty('--rail-label-offset', `${offset.toFixed(1)}px`)
            tick.style.setProperty('--rail-haze-opacity', haze.toFixed(3))
        })
    }, [])

    const setRailExpanded = useCallback((expanded) => {
        railExpandedRef.current = expanded
        railRef.current?.classList.toggle(s.railExpanded, expanded)
        paintRailLabels(activeRailIndexRef.current, expanded)
    }, [paintRailLabels])

    // QA hook (?flat=1): everything visible, no scroll choreography.
    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.search.includes('flat=1')) {
            setFlat(true)
            setHeroDev(true)
        }
    }, [])

    // prologue develops right after mount
    useEffect(() => {
        const t = setTimeout(() => setHeroDev(true), 120)
        return () => clearTimeout(t)
    }, [])

    // hero band: ambient leftward drift, sped up/reversed by scroll velocity,
    // and grabbable — same drag+momentum feel as the people film rows. The
    // band's own transform is left to the scroll engine's parallax pass.
    useMarquee({
        wrapRef: heroBandRef,
        trackRef: heroTrackRef,
        speed: HERO_SPEED,
        enabled: !flat,
        scrollVelRef,
        grabbingClass: s.grabbing,
    })

    // tracks page scroll speed and decays it to 0 at rest; the people film
    // rows read this to cruise faster while you scroll and ease back after
    useEffect(() => {
        if (flat) return
        const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (rm) return
        let lastY = window.scrollY
        let lastT = 0
        let raf = null

        const tick = now => {
            const dt = Math.max(1, now - (lastT || now))
            const y = window.scrollY
            const raw = ((y - lastY) / dt) * 1000
            lastY = y
            lastT = now
            scrollVelRef.current += (raw - scrollVelRef.current) * 0.15
            if (Math.abs(scrollVelRef.current) < 0.5 && Math.abs(raw) < 0.5) scrollVelRef.current = 0
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => {
            if (raf) cancelAnimationFrame(raf)
        }
    }, [flat])

    // develop-in reveals
    useEffect(() => {
        const root = rootRef.current
        if (!root) return
        const els = root.querySelectorAll('[data-devable]')
        const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (flat || rm) {
            els.forEach(el => el.classList.add(s.dev))
            return
        }
        const io = new IntersectionObserver(
            entries => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        e.target.classList.add(s.dev)
                        io.unobserve(e.target)
                    }
                })
            },
            { threshold: 0.18, rootMargin: '0px 0px -5% 0px' }
        )
        els.forEach(el => io.observe(el))
        return () => io.disconnect()
    }, [flat])

    // CH.03 is reversible: entering the wall develops the current contact
    // sheet, and leaving it returns every print to its paper back. Therefore
    // scrolling back through the chapter always gives the viewer a new flip.
    useEffect(() => {
        if (flat) {
            setWallInView(true)
            return undefined
        }
        const viewport = wallViewportRef.current
        if (!viewport) return undefined
        const io = new IntersectionObserver(
            ([e]) => {
                setWallInView(e.isIntersecting)
            },
            { threshold: 0.16, rootMargin: '-8% 0px -12% 0px' }
        )
        io.observe(viewport)
        return () => io.disconnect()
    }, [flat])

    // Reset one frame before developing the fixed contact wall. Toggling the
    // class, rather than using a one-shot observer, makes it work in both
    // scroll directions.
    useEffect(() => {
        if (flat) {
            setWallFlipped(true)
            setWallSettled(true)
            return undefined
        }
        if (!wallInView) {
            setWallFlipped(false)
            setWallSettled(false)
            return undefined
        }
        setWallFlipped(false)
        setWallSettled(false)
        const raf = requestAnimationFrame(() => setWallFlipped(true))
        // give the tiles their compositing layers back once the cascade lands
        const settle = window.setTimeout(() => setWallSettled(true), WALL_SETTLE_MS)
        return () => {
            cancelAnimationFrame(raf)
            window.clearTimeout(settle)
        }
    }, [flat, wallInView])

    // scroll engine: lerp + parallax + rail + safelight
    useEffect(() => {
        if (flat) return
        const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const root = rootRef.current
        // every [data-par] row drifts its photos against the page; the value is
        // the one-way travel in % of each photo's own height (see the --pz
        // zoom in the stylesheet, which is what buys the travel its headroom)
        const parEls = root ? [...root.querySelectorAll('[data-par]')] : []
        const people = document.getElementById('ch1')
        const heroSec = document.getElementById('top')
        const secs = RAIL_TICKS.map(t => document.getElementById(t.id)).filter(Boolean)
        let vh = window.innerHeight
        let pars = []
        let peopleTop = 0
        let peopleH = 1
        let heroH = 1
        let docH = 1
        let railH = 0
        let target = window.scrollY
        let cur = target
        let raf = null

        const measure = () => {
            vh = window.innerHeight
            const parallaxScale = window.innerWidth <= 900 ? 0.55 : 1
            pars = parEls.map(el => {
                const r = el.getBoundingClientRect()
                return {
                    el,
                    top: r.top + window.scrollY,
                    h: Math.max(1, r.height),
                    amp: (parseFloat(el.dataset.par) || 0) * parallaxScale,
                }
            })
            if (people) {
                peopleTop = people.offsetTop
                peopleH = Math.max(1, people.offsetHeight)
            }
            heroH = Math.max(1, heroSec ? heroSec.offsetHeight : vh)
            docH = document.documentElement.scrollHeight - vh
            railH = railRef.current ? railRef.current.offsetHeight + 60 : 0
        }

        const render = y => {
            if (!rm) {
                // the prologue band sinks slower than the page and zooms in as
                // it goes; it never uncovers its own top edge because it lags
                // by less than the page has already scrolled
                const band = heroBandRef.current
                if (band) {
                    const hp = Math.min(1, Math.max(0, y / heroH))
                    band.style.transform = `translate3d(0,${(hp * heroH * HERO_LAG).toFixed(1)}px,0)`
                    band.style.setProperty('--hz', (1 + hp * HERO_ZOOM).toFixed(4))
                }
                pars.forEach(p => {
                    const t = Math.min(1, Math.max(0, (y + vh - p.top) / (p.h + vh)))
                    p.el.style.setProperty('--py', `${((0.5 - t) * 2 * p.amp).toFixed(2)}%`)
                })
            }
            if (safelightRef.current && people) {
                const pr = Math.min(1, Math.max(0, (y + vh * 0.6 - peopleTop) / peopleH))
                const d = Math.abs(pr - 0.5) * 2
                safelightRef.current.style.opacity = String(Math.max(0, 1 - d) * 0.4)
            }
            if (threadRef.current && docH > 0) {
                threadRef.current.style.height = `${Math.min(1, y / docH) * railH}px`
            }
            const yMid = y + vh * 0.42
            let act = 0
            secs.forEach((sec, i) => {
                if (yMid >= sec.offsetTop) act = i
            })
            ticksRef.current.forEach((tk, j) => {
                if (tk) tk.classList.toggle(s.tickOn, j === act)
            })
            activeRailIndexRef.current = act
            paintRailLabels(act, railExpandedRef.current)
        }

        const frame = () => {
            cur += (target - cur) * (rm ? 1 : 0.14)
            if (Math.abs(target - cur) < 0.15) cur = target
            render(cur)
            raf = cur === target ? null : requestAnimationFrame(frame)
        }
        const onScroll = () => {
            target = window.scrollY
            if (!raf) raf = requestAnimationFrame(frame)
        }
        const onResize = () => {
            measure()
            render(target)
        }

        measure()
        render(window.scrollY)
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onResize)
        window.addEventListener('load', onResize)
        return () => {
            window.removeEventListener('scroll', onScroll)
            window.removeEventListener('resize', onResize)
            window.removeEventListener('load', onResize)
            if (raf) cancelAnimationFrame(raf)
        }
    }, [flat, paintRailLabels])

    // The card mounts holding its start transform and only then begins to fly.
    // That first paint is expensive — a near-full-width print plus a wide,
    // blurred drop shadow — and if it lands on the animation's opening frame
    // the flip visibly stutters as it leaves the wall. Two frames of stillness
    // buy the rasterised layer; after that the flight is pure compositing.
    useEffect(() => {
        if (!wallPreview) {
            setPreviewArmed(false)
            return undefined
        }
        let inner = 0
        const outer = requestAnimationFrame(() => {
            inner = requestAnimationFrame(() => setPreviewArmed(true))
        })
        return () => {
            cancelAnimationFrame(outer)
            cancelAnimationFrame(inner)
        }
    }, [wallPreview])

    const closeWallPreview = useCallback(() => {
        if (!wallPreview || previewClosing) return
        setPreviewClosing(true)
        window.setTimeout(() => {
            setWallPreview(null)
            setPreviewClosing(false)
        }, WALL_COLLAPSE_MS)
    }, [wallPreview, previewClosing])

    // Overlay and wall preview both own the scroll lock and Escape key.
    useEffect(() => {
        if (!overlayOpen && !wallPreview) return undefined
        document.body.style.overflow = 'hidden'
        const onKey = e => {
            if (e.key !== 'Escape') return
            if (wallPreview) closeWallPreview()
            else setOverlayOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = ''
            window.removeEventListener('keydown', onKey)
        }
    }, [overlayOpen, wallPreview, closeWallPreview])

    const goTo = useCallback(id => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, [])

    // duplicated hero copies (for the seamless loop) forward clicks to the
    // first copy's PhotoView so the lightbox never gets duplicate entries
    const openHeroFrom = i => {
        const first = heroTrackRef.current && heroTrackRef.current.children[0]
        const clicks = first ? first.querySelectorAll(`.${s.panelClick}`) : []
        if (clicks[i]) clicks[i].click()
    }

    // CH.01 is the Portrait index alone — no other people categories mixed in
    const peopleCounts = cats.filter(c => c.name === 'Portrait')
    const cityCounts = cats.filter(c => ['HK', 'City'].includes(c.name))
    const fmtCounts = list => list.map(c => `${c.name.toUpperCase()} ${c.count}`).join(' · ')

    const HERO_COPIES = flat ? 1 : 3
    // The card is laid out at the viewport centre and animated back to the
    // tile with transform alone — dx/dy are the tile's offset from that
    // centre, so no frame of the flight touches layout.
    const openWallPreview = useCallback((event, entry) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const ratio = entry.w && entry.h ? entry.w / entry.h : 1
        const finalWidth = Math.min(window.innerWidth * 0.86, window.innerHeight * 0.78 * ratio)
        setPreviewClosing(false)
        setWallPreview({
            entry,
            scale: Math.max(0.05, rect.width / Math.max(finalWidth, 1)),
            width: finalWidth,
            dx: rect.left + rect.width / 2 - window.innerWidth / 2,
            dy: rect.top + rect.height / 2 - window.innerHeight / 2,
        })
    }, [])

    return (
        <div ref={rootRef} className={`${s.root} ${flat ? s.flat : ''}`} data-lang={locale}>
            <ParallaxProvider isDisabled={flat}>
            <PhotoProvider maskOpacity={0.96} pullClosable>
                {/* fixed chrome */}
                <div className={`${s.chrome} ${s.chromeTl}`}>
                    <b>TP</b> — <span>{locale === 'zh' ? '暗房' : locale === 'ja' ? '暗室' : 'DARKROOM'}</span>
                </div>
                <div className={`${s.chrome} ${s.chromeTr}`}>
                    <button className={s.idxBtn} onClick={() => setOverlayOpen(true)} aria-haspopup="dialog">
                        {locale === 'zh' ? '索引' : locale === 'ja' ? '目次' : 'INDEX'} <span className={s.idxN}>{counts.cats}</span>
                    </button>
                    <LangSwitch locale={locale} onChange={setLocale} embedded />
                </div>

                <nav
                    ref={railRef}
                    className={s.rail}
                    aria-label="chapters"
                    onPointerEnter={() => setRailExpanded(true)}
                    onPointerLeave={() => setRailExpanded(false)}
                >
                    <div ref={threadRef} className={s.thread} />
                    {RAIL_TICKS.map((t, i) => (
                        <button
                            key={t.id}
                            ref={el => (ticksRef.current[i] = el)}
                            className={s.tick}
                            onClick={() => goTo(t.id)}
                        >
                            <span className={s.lab}>{locale === 'ja' ? t.ja : t.lab}</span>
                            <span className={s.no}>{t.no}</span>
                            <span className={s.dot} />
                        </button>
                    ))}
                </nav>

                <div ref={safelightRef} className={s.safelight} />

                {/* ———— prologue: photo band with text floating on top ———— */}
                <section className={`${s.hero} ${heroDev ? s.heroDeveloped : ''}`} id="top">
                    <div ref={heroBandRef} className={s.heroBand}>
                        <div ref={heroTrackRef} className={s.heroTrack}>
                            {Array.from({ length: HERO_COPIES }, (_, ci) => (
                                <div key={ci} className={s.heroSet} aria-hidden={ci > 0}>
                                    {hero.map((p, i) => (
                                        <div key={`${ci}-${p.p}`} className={s.panel} style={{ '--fw': p.fw }}>
                                            {ci === 0 ? (
                                                <PhotoView src={getCdnFullUrl(p.p)}>
                                                    <div className={s.panelClick}>
                                                        <Parallax
                                                            className={s.panelParallax}
                                                            translateX={[`${-heroParallaxX}%`, `${heroParallaxX}%`]}
                                                        >
                                                            <Img entry={{ ...p, cat: 'BANNER' }} eager={ci === 0 && i < 2} />
                                                        </Parallax>
                                                    </div>
                                                </PhotoView>
                                            ) : (
                                                <div className={s.panelClick} onClick={() => openHeroFrom(i)}>
                                                    <Parallax
                                                        className={s.panelParallax}
                                                        translateX={[`${-heroParallaxX}%`, `${heroParallaxX}%`]}
                                                    >
                                                        <Img entry={{ ...p, cat: 'BANNER' }} />
                                                    </Parallax>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={s.heroShade} />
                    <div className={s.heroBody}>
                        <div className={`${s.book} ${s.heroBook}`}>
                            <div className={s.where}>
                                <span className={s.zh}>常驻南京 · 东南大学 SEU.EDU.CN</span>
                                <span className={s.en}>BASED IN NANJING · SEU.EDU.CN</span>
                                <span className={s.ja}>南京在住 · 東南大学 SEU.EDU.CN</span>
                            </div>
                            <Link className={s.cta} href="/photographer/order">
                                <span className={`${s.ctaZh} ${s.zh}`}>预约拍摄</span>
                                <span className={`${s.ctaEn} ${s.en}`}>BOOK A SESSION</span>
                                <span className={`${s.ctaZh} ${s.ja}`}>予約する</span>
                                <span className={s.ctaArr}>→</span>
                            </Link>
                        </div>
                        <h1 className={s.h1}>
                            TAITAN<span className={s.u}>_</span>PASCAL
                        </h1>
                        <div className={s.heroSub}>
                            <span className={s.zh}>把光留在相纸上。</span>
                            <span className={s.en}>LIGHT, KEPT ON PAPER — 摄影</span>
                            <span className={s.ja}>光を、印画紙に焼き付ける。</span>
                            <span className={s.heroMeta}>
                                ARCHIVE <b>{counts.total}</b> · CATEGORIES <b>{counts.cats}</b> · BASE <b>NANJING</b> ·{' '}
                                <b>{locale === 'en' ? 'BOOKING OPEN' : locale === 'ja' ? '予約受付中' : '接受预约'}</b>
                            </span>
                        </div>
                    </div>
                    <div className={s.scrollcue}>
                        <span>{locale === 'ja' ? '下にスクロールして現像開始' : '向下卷动 · 开始显影 SCROLL TO DEVELOP'}</span>
                        <span className={s.line} />
                    </div>
                </section>

                <div className={s.divider}>CH.01 ▸ 装片 LOADING FILM — 人 PEOPLE</div>

                {/* ———— CH.01 people / double film marquee ———— */}
                <section className={s.reel} id="ch1">
                    <div className={s.reelHead}>
                        <div>
                            <div className={s.chEyebrow}>
                                <span className={s.safeOn}>{locale === 'ja' ? '● セーフライト点灯' : '● SAFELIGHT ON 安全灯'}</span>
                            </div>
                            <div className={s.reelTitle}>
                                PEOPLE<span className={s.zh}>人</span><span className={s.ja}>人物</span>
                            </div>
                        </div>
                        <div className={s.reelMeta}>
                            <div>{fmtCounts(peopleCounts)}</div>
                            <div className={s.note}>
                                {locale === 'en' ? 'Three rolls, developing together · drag the film to browse'
                                    : locale === 'ja' ? '3本同時現像・フィルムをドラッグして操作できます'
                                    : '三卷同显 · 抓住胶片可以拖动'}
                            </div>
                        </div>
                    </div>
                    <FilmRow
                        photos={stripA}
                        cats={cats}
                        speed={34}
                        size="tall"
                        frameBase={4}
                        flat={flat}
                        scrollVelRef={scrollVelRef}
                    />
                    <FilmRow
                        photos={stripB}
                        cats={cats}
                        speed={20}
                        start={420}
                        size="mid"
                        frameBase={12}
                        flat={flat}
                        scrollVelRef={scrollVelRef}
                    />
                    <FilmRow
                        photos={stripC}
                        cats={cats}
                        speed={10}
                        start={160}
                        size="short"
                        frameBase={24}
                        flat={flat}
                        scrollVelRef={scrollVelRef}
                    />
                    <div className={s.reelFoot}>
                        <span>TP-5063 PAN 400 · 24EXP × 3</span>
                        <span>
                            <span className={s.cur}>DRAG 拖拽浏览</span> · CLICK 点开放大 · ALL {counts.people} IN INDEX
                        </span>
                    </div>
                </section>

                <div className={s.divider}>CH.02 ▸ 显影中 DEVELOPING — 城市 CITY</div>

                {/* ———— CH.02 city / drifting layers ———— */}
                <section id="ch2">
                    <div className={s.chHead}>
                        <div className={s.chEyebrow}>
                            <span>CH.02 — 显影中 DEVELOPING</span>
                            <span className={s.dim}>
                                {fmtCounts(cityCounts)} ·{' '}
                                {locale === 'en' ? 'DRAG THE LAYERS' : locale === 'ja' ? 'ドラッグできます' : 'DRAG 可拖动'}
                            </span>
                        </div>
                        <h2 className={s.h2}>
                            CITY<span className={s.zh}>城市</span><span className={s.ja}>街</span>
                        </h2>
                        <p className={s.chLine}>
                            <span className={s.zh}>霓虹与骑楼之间，快门比脚步诚实。</span>
                            <span className={s.en}>BETWEEN NEON AND ARCADES, THE SHUTTER IS MORE HONEST THAN FOOTSTEPS.</span>
                            <span className={s.ja}>ネオンとアーケードの間、シャッターは足取りより正直だ。</span>
                        </p>
                    </div>
                    <div className={s.cityRows}>
                        {cityRows.map((row, ri) => (
                            <CityRow
                                key={ri}
                                row={row}
                                ri={ri}
                                cats={cats}
                                flat={flat}
                                scrollVelRef={scrollVelRef}
                            />
                        ))}
                    </div>
                </section>

                <div className={s.divider}>CH.03 ▸ 上墙 ON THE WALL — 白边方片</div>

                {/* ———— CH.03 the matte wall ———— */}
                <section id="ch3">
                    <div className={s.chHead}>
                        <div className={s.chEyebrow}>
                            <span>CH.03 — 白边方片 SQUARE PRINTS</span>
                            <span className={s.dim}>{wallTiles.length} PRINTS · WHITE MATTE · 4 CATEGORIES</span>
                        </div>
                        <h2 className={s.h2}>
                            WALL<span className={s.zh}>墙</span><span className={s.ja}>壁</span>
                        </h2>
                        <p className={s.chLine}>
                            <span className={s.zh}>这些年攒下的白边方片，背面朝外钉了一墙 —— 走到这里，它们自己哗啦一片翻过来。</span>
                            <span className={s.en}>YEARS OF SQUARE PRINTS, PINNED FACE-DOWN — REACH THE WALL AND THEY TURN THEMSELVES OVER.</span>
                            <span className={s.ja}>長年撮り溜めた白フチ写真を裏返しに貼った —— ここまで来ると、ひとりでに一斉にめくれていく。</span>
                        </p>
                    </div>
                    <div className={s.wallWrap}>
                        <div ref={wallViewportRef} className={s.wallViewport}>
                            <WallGrid
                                tiles={wallTiles}
                                cols={wallGrid.cols}
                                flipped={wallFlipped}
                                settled={wallSettled}
                                sourcePath={wallPreview ? wallPreview.entry.p : null}
                                onOpen={openWallPreview}
                            />
                        </div>
                        <div className={s.wallFoot}>
                            <span>WALL №.01 — {wallTiles.length} PRINTS · 每张都可翻开</span>
                            <span>TAITAN_PASCAL · UTOPIA ARCHIVE</span>
                        </div>
                    </div>
                </section>

                <div className={s.divider}>CH.04 ▸ 归档 THE ARCHIVE — 索引 INDEX</div>

                {/* ———— closing chapter: the index, inline ———— */}
                <section className={s.idxSec} id="idx">
                    <div className={s.chHead}>
                        <div className={s.chEyebrow}>
                            <span>CH.04 — 索引 INDEX</span>
                            <span className={s.dim}>{counts.cats} CATEGORIES · {counts.total} PRINTS</span>
                        </div>
                        <h2 className={s.h2}>
                            INDEX<span className={s.zh}>索引</span><span className={s.ja}>目次</span>
                        </h2>
                        <p className={s.chLine}>
                            <span className={s.zh}>定影完成，归档入册 —— 点开任意一类，看完整画廊。</span>
                            <span className={s.en}>FIXED AND FILED — ENTER ANY CATEGORY FOR THE FULL GALLERY.</span>
                            <span className={s.ja}>定影を終えて、アーカイブへ —— カテゴリーを開くと完全なギャラリーが見られる。</span>
                        </p>
                    </div>
                    <div className={s.idxList}>
                        <CatRows cats={cats} />
                    </div>
                </section>

                <footer className={s.foot}>
                    <span>
                        <b>© 2018–2026 TAITAN_PASCAL</b> · UTOPIA
                    </span>
                    <Link href="/">← UTOPIA BLOG 博客</Link>
                    <span>GAOCHENGZHI.COM · NANJING CHINA</span>
                </footer>

                {/* ———— index overlay ———— */}
                {overlayOpen && (
                    <div className={s.overlay} role="dialog" aria-modal="true" aria-label="category index">
                        <div className={s.ovHead}>
                            <div className={s.t}>
                                INDEX<span className={s.zh}>全部分类</span><span className={s.ja}>全カテゴリー</span>
                            </div>
                            <button className={s.ovClose} onClick={() => setOverlayOpen(false)}>
                                CLOSE ✕
                            </button>
                        </div>
                        <CatRows cats={cats} />
                        <div className={s.ovFoot}>ENTER A CATEGORY TO VIEW THE FULL GALLERY — 点击进入完整画廊</div>
                    </div>
                )}
                {wallPreview && (
                    <div className={s.wallLightbox} role="dialog" aria-modal="true" aria-label="Photo preview" onClick={event => {
                        if (event.target === event.currentTarget) closeWallPreview()
                    }}>
                        <button className={s.wallPreviewClose} onClick={closeWallPreview} aria-label="Close photo preview">CLOSE ✕</button>
                        <div
                            className={`${s.wallLightboxCard} ${
                                previewClosing ? s.wallLightboxClosing : previewArmed ? s.wallLightboxOpening : ''
                            }`}
                            style={{
                                '--wall-dx': `${wallPreview.dx}px`,
                                '--wall-dy': `${wallPreview.dy}px`,
                                '--wall-scale': wallPreview.scale,
                                '--wall-final-width': `${wallPreview.width}px`,
                            }}
                        >
                            <Img entry={wallPreview.entry} variant="full" eager />
                            <span>TP · {wallPreview.entry.cat.toUpperCase()} · ARCHIVE PRINT</span>
                        </div>
                    </div>
                )}
            </PhotoProvider>
            </ParallaxProvider>
        </div>
    )
}
