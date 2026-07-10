/**
 * Darkroom — the photographer homepage.
 *
 * One continuous night in a darkroom: a full-width banner band develops on
 * load and drifts with the scroll, people ride two self-advancing film rows
 * you can grab and drag, the city surfaces as layered strips sliding left,
 * every white-matte square print ends up pinned on one wall, and the session
 * closes on a card floating over liquid gold.
 *
 * Navigation: right-edge chapter rail + full-screen INDEX overlay.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import 'react-photo-view/dist/react-photo-view.css'
import { getCdnFullUrl, getCdnPreviewUrl, getCdnThumbUrl } from '/lib/cdnUrl'
import DeferredImage from '/components/photo/darkroom/DeferredImage'
import { LiquidGoldCanvas } from '/components/photo/LiquidGoldCanvas'
import s from './Darkroom.module.css'

const RAIL_TICKS = [
    { id: 'top', no: '00', lab: '序 PROLOGUE' },
    { id: 'ch1', no: '01', lab: '人 PEOPLE' },
    { id: 'ch2', no: '02', lab: '城市 CITY' },
    { id: 'ch3', no: '03', lab: '墙 WALL' },
    { id: 'epi', no: '04', lab: '尾声 EPILOGUE' },
]

// Per-panel leftward drift factors — staggered so the banners take turns.
const HERO_PAN = [0.035, 0.06, 0.045, 0.075, 0.09]

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
 * the lightbox — drags are told apart by travel distance.
 */
function FilmRow({ photos, cats, speed, start = 0, tall, edge, frameBase, flat }) {
    const wrapRef = useRef(null)
    const trackRef = useRef(null)
    const COPIES = flat ? 1 : 3

    useEffect(() => {
        if (flat) return
        const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const wrap = wrapRef.current
        const track = trackRef.current
        if (!wrap || !track) return

        let offset = start
        let unit = 0
        let raf = null
        let last = 0
        let vel = 0
        let dragging = false
        let lastX = 0
        let moved = 0
        let visible = false
        let suppressClick = false

        const measure = () => {
            unit = track.scrollWidth / 3
        }

        const tick = now => {
            raf = null
            const dt = Math.min(64, now - (last || now))
            last = now
            if (!dragging) {
                if (Math.abs(vel) > speed) {
                    offset += (vel * dt) / 1000
                    vel *= Math.pow(0.9, dt / 16.7)
                } else if (!rm) {
                    offset += (speed * dt) / 1000
                }
            }
            if (unit > 0) offset = ((offset % unit) + unit) % unit
            track.style.transform = `translate3d(${-offset}px,0,0)`
            if (visible && !(rm && !dragging && Math.abs(vel) <= speed)) raf = requestAnimationFrame(tick)
        }
        const run = () => {
            if (!raf && visible) {
                last = 0
                raf = requestAnimationFrame(tick)
            }
        }

        const io = new IntersectionObserver(([e]) => {
            visible = e.isIntersecting
            if (visible) run()
        }, { rootMargin: '120px 0px' })
        io.observe(wrap)

        const down = e => {
            dragging = true
            moved = 0
            vel = 0
            lastX = e.clientX
            wrap.setPointerCapture(e.pointerId)
            wrap.classList.add(s.grabbing)
            run()
        }
        const move = e => {
            if (!dragging) return
            const dx = e.clientX - lastX
            lastX = e.clientX
            offset -= dx
            moved += Math.abs(dx)
            vel = -dx * 60 // px/s estimate from the last frame
        }
        const up = () => {
            if (!dragging) return
            dragging = false
            wrap.classList.remove(s.grabbing)
            if (moved > 6) suppressClick = true
            run()
        }
        const clickCapture = e => {
            if (suppressClick) {
                e.preventDefault()
                e.stopPropagation()
                suppressClick = false
            }
        }

        wrap.addEventListener('pointerdown', down)
        wrap.addEventListener('pointermove', move)
        wrap.addEventListener('pointerup', up)
        wrap.addEventListener('pointercancel', up)
        wrap.addEventListener('click', clickCapture, true)
        window.addEventListener('resize', measure)

        measure()
        run()

        return () => {
            io.disconnect()
            if (raf) cancelAnimationFrame(raf)
            wrap.removeEventListener('pointerdown', down)
            wrap.removeEventListener('pointermove', move)
            wrap.removeEventListener('pointerup', up)
            wrap.removeEventListener('pointercancel', up)
            wrap.removeEventListener('click', clickCapture, true)
            window.removeEventListener('resize', measure)
        }
    }, [flat, speed, start])

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
        <div ref={wrapRef} className={`${s.mrow} ${tall ? s.mrowTall : s.mrowShort}`}>
            <div ref={trackRef} className={s.mtrack}>
                {Array.from({ length: COPIES }, (_, ci) => (
                    <div key={ci} className={s.film} aria-hidden={ci > 0}>
                        <div className={s.edgeprint}>{edge}</div>
                        {photos.map((p, i) => frameShell(p, i, ci))}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function DarkroomHome({ data }) {
    const { hero, stripA, stripB, cityRows, wall, epi, cats, counts } = data

    const [overlayOpen, setOverlayOpen] = useState(false)
    const [flat, setFlat] = useState(false)
    const [heroDev, setHeroDev] = useState(false)
    const [goldOn, setGoldOn] = useState(false)

    const rootRef = useRef(null)
    const threadRef = useRef(null)
    const railRef = useRef(null)
    const safelightRef = useRef(null)
    const panelsRef = useRef(null)
    const cityRef = useRef(null)
    const epiRef = useRef(null)
    const ticksRef = useRef([])

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

    // the gold canvas mounts once the epilogue approaches
    useEffect(() => {
        if (flat) return
        const el = epiRef.current
        if (!el) return
        const io = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    setGoldOn(true)
                    io.disconnect()
                }
            },
            { rootMargin: '700px 0px' }
        )
        io.observe(el)
        return () => io.disconnect()
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

    // scroll engine: lerp + hero pan + city drift + rail + safelight
    useEffect(() => {
        if (flat) return
        const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const panels = panelsRef.current ? [...panelsRef.current.children] : []
        const bleeds = panels.map(p => p.firstChild)
        const crows = cityRef.current ? [...cityRef.current.querySelectorAll(`.${s.crow}`)] : []
        const people = document.getElementById('ch1')
        const secs = RAIL_TICKS.map(t => document.getElementById(t.id)).filter(Boolean)
        let vh = window.innerHeight
        let vw = window.innerWidth
        let panelMax = []
        let cityTop = 0
        let cityH = 1
        let cityDrift = []
        let peopleTop = 0
        let peopleH = 1
        let docH = 1
        let railH = 0
        let target = window.scrollY
        let cur = target
        let raf = null

        const measure = () => {
            vh = window.innerHeight
            vw = window.innerWidth
            // .bleed is 16% wider than its panel, centered — 8% hidden per side
            panelMax = panels.map(p => p.offsetWidth * 0.075)
            if (cityRef.current) {
                const r = cityRef.current.getBoundingClientRect()
                cityTop = r.top + window.scrollY
                cityH = Math.max(1, r.height)
                // each row may drift left only as far as it stays full-bleed
                cityDrift = crows.map((row, i) => {
                    const want = vw * [0.14, 0.24, 0.09][i % 3]
                    const avail = Math.max(0, row.scrollWidth - vw - 10)
                    return Math.min(want, avail)
                })
            }
            if (people) {
                peopleTop = people.offsetTop
                peopleH = Math.max(1, people.offsetHeight)
            }
            docH = document.documentElement.scrollHeight - vh
            railH = railRef.current ? railRef.current.offsetHeight + 60 : 0
        }

        const render = y => {
            if (y < vh * 1.5 && bleeds.length) {
                bleeds.forEach((b, i) => {
                    if (!b) return
                    const x = Math.min(y * HERO_PAN[i % HERO_PAN.length], panelMax[i] || 60)
                    b.style.transform = `translate3d(${-x}px,0,0)`
                })
            }
            if (crows.length) {
                const pr = Math.min(1, Math.max(0, (y + vh - cityTop) / (cityH + vh)))
                crows.forEach((row, i) => {
                    row.style.transform = `translate3d(${-pr * (cityDrift[i] || 0)}px,0,0)`
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
    }, [flat])

    // overlay: lock scroll, close on Escape
    useEffect(() => {
        if (!overlayOpen) return
        document.body.style.overflow = 'hidden'
        const onKey = e => {
            if (e.key === 'Escape') setOverlayOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = ''
            window.removeEventListener('keydown', onKey)
        }
    }, [overlayOpen])

    const goTo = useCallback(id => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, [])

    const peopleCounts = cats.filter(c => ['Portrait', 'Emotion', 'Lover', 'Wedding'].includes(c.name))
    const cityCounts = cats.filter(c => ['HK', 'City'].includes(c.name))
    const fmtCounts = list => list.map(c => `${c.name.toUpperCase()} ${c.count}`).join(' · ')

    let edgeA = ''
    for (let i = 0; i < 30; i++) edgeA += 'TP-5063 PAN 400   ▸▸   TAITAN_PASCAL · UTOPIA   ▸▸   '
    let edgeB = ''
    for (let i = 0; i < 30; i++) edgeB += 'HP5 PLUS 400 — 二号卷   ▸▸   PEOPLE · 人   ▸▸   '

    const wallPicked = Math.min(21, Math.max(0, wall.length - 3))

    return (
        <div ref={rootRef} className={`${s.root} ${flat ? s.flat : ''}`}>
            <PhotoProvider maskOpacity={0.96} pullClosable>
                {/* fixed chrome */}
                <div className={`${s.chrome} ${s.chromeTl}`}>
                    <b>TP</b> — UTOPIA <span style={{ color: 'var(--silverFaint)' }}>暗房 DARKROOM</span>
                </div>
                <div className={`${s.chrome} ${s.chromeTr}`}>
                    <button className={s.idxBtn} onClick={() => setOverlayOpen(true)} aria-haspopup="dialog">
                        INDEX 索引 <span className={s.idxN}>{counts.cats}</span>
                    </button>
                </div>

                <nav ref={railRef} className={s.rail} aria-label="chapters">
                    <div ref={threadRef} className={s.thread} />
                    {RAIL_TICKS.map((t, i) => (
                        <button
                            key={t.id}
                            ref={el => (ticksRef.current[i] = el)}
                            className={s.tick}
                            onClick={() => goTo(t.id)}
                        >
                            <span className={s.lab}>{t.lab}</span>
                            <span className={s.no}>{t.no}</span>
                            <span className={s.dot} />
                        </button>
                    ))}
                </nav>

                <div ref={safelightRef} className={s.safelight} />

                {/* ———— prologue: full-width banner band ———— */}
                <section className={`${s.hero} ${heroDev ? s.heroDeveloped : ''}`} id="top">
                    <div className={s.heroBody}>
                        <div className={s.heroEyebrow}>
                            <span className={s.lamp} /> UTOPIA · DARKROOM SESSION — NANJING · 2018→2026
                        </div>
                        <h1 className={s.h1}>
                            TAITAN<span className={s.u}>_</span>PASCAL
                        </h1>
                        <div className={s.heroSub}>
                            <span className={s.zh}>把光留在相纸上。</span>
                            <span className={s.en}>LIGHT, KEPT ON PAPER — 摄影</span>
                            <span className={s.heroMeta}>
                                ARCHIVE <b>{counts.total}</b> · CATEGORIES <b>{counts.cats}</b> · BASE <b>NANJING</b> ·{' '}
                                <b>接受预约</b>
                            </span>
                        </div>
                    </div>
                    <div ref={panelsRef} className={s.heroBand}>
                        {hero.map((p, i) => (
                            <div key={p.p} className={s.panel} style={{ '--fw': p.fw }}>
                                <div className={s.bleed}>
                                    <PhotoView src={getCdnFullUrl(p.p)}>
                                        <Img entry={{ ...p, cat: 'BANNER' }} eager={i < 2} />
                                    </PhotoView>
                                </div>
                            </div>
                        ))}
                        <div className={s.scrollcue}>
                            <span>向下卷动 · 开始显影 SCROLL TO DEVELOP</span>
                            <span className={s.line} />
                        </div>
                    </div>
                </section>

                <div className={s.divider}>CH.01 ▸ 装片 LOADING FILM — 人 PEOPLE</div>

                {/* ———— CH.01 people / double film marquee ———— */}
                <section className={s.reel} id="ch1">
                    <div className={s.reelHead}>
                        <div>
                            <div className={s.chEyebrow}>
                                <span className={s.safeOn}>● SAFELIGHT ON 安全灯</span>
                            </div>
                            <div className={s.reelTitle}>
                                PEOPLE<span className={s.zh}>人</span>
                            </div>
                        </div>
                        <div className={s.reelMeta}>
                            <div>{fmtCounts(peopleCounts)}</div>
                            <div className={s.note}>双卷同显 · 抓住胶片可以拖动</div>
                        </div>
                    </div>
                    <FilmRow
                        photos={stripA}
                        cats={cats}
                        speed={26}
                        tall
                        edge={edgeA}
                        frameBase={4}
                        flat={flat}
                    />
                    <FilmRow
                        photos={stripB}
                        cats={cats}
                        speed={17}
                        start={420}
                        edge={edgeB}
                        frameBase={12}
                        flat={flat}
                    />
                    <div className={s.reelFoot}>
                        <span>TP-5063 PAN 400 · 24EXP × 2</span>
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
                            <span className={s.dim}>{fmtCounts(cityCounts)}</span>
                        </div>
                        <h2 className={s.h2}>
                            CITY<span className={s.zh}>城市</span>
                        </h2>
                        <p className={s.chLine}>
                            霓虹与骑楼之间，快门比脚步诚实。
                            <span className={s.en}>BETWEEN NEON AND ARCADES, THE SHUTTER IS MORE HONEST THAN FOOTSTEPS.</span>
                        </p>
                    </div>
                    <div ref={cityRef} className={s.cityRows}>
                        {cityRows.map((row, ri) => (
                            <div key={ri} className={`${s.crow} ${[s.crowA, s.crowB, s.crowC][ri % 3]}`}>
                                {row.map((p, i) => (
                                    <PhotoView key={p.p} src={getCdnFullUrl(p.p)}>
                                        <div
                                            className={s.citem}
                                            style={{ aspectRatio: p.w && p.h ? `${p.w}/${p.h}` : '3/2' }}
                                        >
                                            <Img entry={p} />
                                            <span className={s.cno}>
                                                №{pad2(ri * 7 + i + 11)} {p.cat.toUpperCase()}
                                            </span>
                                        </div>
                                    </PhotoView>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>

                <div className={s.divider}>CH.03 ▸ 上墙 ON THE WALL — 白边方片</div>

                {/* ———— CH.03 the matte wall ———— */}
                <section id="ch3">
                    <div className={s.chHead}>
                        <div className={s.chEyebrow}>
                            <span>CH.03 — 白边方片 SQUARE PRINTS</span>
                            <span className={s.dim}>{counts.wall} PRINTS · WHITE MATTE · 4 CATEGORIES</span>
                        </div>
                        <h2 className={s.h2}>
                            WALL<span className={s.zh}>墙</span>
                        </h2>
                        <p className={s.chLine}>
                            这些年攒下的白边方片，一次钉成一面墙。
                            <span className={s.en}>YEARS OF SQUARE PRINTS, PINNED INTO ONE WALL.</span>
                        </p>
                    </div>
                    <div className={s.wallWrap}>
                        <div className={s.wallGrid}>
                            {wall.map((p, i) => (
                                <PhotoView key={p.p} src={getCdnFullUrl(p.p)}>
                                    <div
                                        className={`${s.wtile} ${s.devable} ${i === wallPicked ? s.picked : ''}`}
                                        data-devable
                                    >
                                        <Img entry={p} variant="thumb" style={{ transitionDelay: `${(i % 10) * 50}ms` }} />
                                        {i === wallPicked && (
                                            <svg className={s.grease} viewBox="0 0 100 100" preserveAspectRatio="none">
                                                <ellipse cx="50" cy="50" rx="46" ry="44" pathLength="100" transform="rotate(3 50 50)" />
                                            </svg>
                                        )}
                                    </div>
                                </PhotoView>
                            ))}
                        </div>
                        <div className={s.wallFoot}>
                            <span>WALL №.01 — {counts.wall} PRINTS · 每张都可点开</span>
                            <span>TAITAN_PASCAL · UTOPIA ARCHIVE</span>
                        </div>
                    </div>
                </section>

                {/* ———— epilogue: card on liquid gold ———— */}
                <section ref={epiRef} className={s.epi} id="epi">
                    <div className={s.gold}>
                        {goldOn && !flat && <LiquidGoldCanvas className={s.goldCanvas} controls={false} />}
                        <div className={`${s.epiCard} ${s.devable}`} data-devable>
                            <PhotoView src={getCdnFullUrl(epi.p)}>
                                <div
                                    className={s.cardPh}
                                    style={{ aspectRatio: epi.w && epi.h ? `${epi.w}/${epi.h}` : '3/2' }}
                                >
                                    <Img entry={epi} />
                                </div>
                            </PhotoView>
                            <div className={s.cardBody}>
                                <p className={s.zhBig}>
                                    定影完成，挂起来晾干。
                                    <br />
                                    下一卷，从你开始。
                                </p>
                                <p className={s.en}>
                                    FIXED, WASHED, HUNG TO DRY.
                                    <br />
                                    THE NEXT ROLL STARTS WITH YOU.
                                </p>
                                <div className={s.book}>
                                    <div className={s.where}>常驻南京 · 东南大学 SEU.EDU.CN</div>
                                    <div className={s.what}>婚礼 · 情侣 · 人像 · 街头 — 约拍全流程</div>
                                    <Link className={s.cta} href="/photographer/order">
                                        <span className={s.ctaZh}>预约拍摄</span>
                                        <span className={s.ctaEn}>BOOK A SESSION</span>
                                        <span className={s.ctaArr}>→</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
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
                                INDEX<span className={s.zh}>全部分类</span>
                            </div>
                            <button className={s.ovClose} onClick={() => setOverlayOpen(false)}>
                                CLOSE ✕
                            </button>
                        </div>
                        <div>
                            {cats.map((c, i) => (
                                <Link key={c.name} className={s.ovRow} href={c.href}>
                                    <span className={s.ovNo}>{pad2(i + 1)}</span>
                                    <span className={s.ovName}>
                                        {c.name}
                                        <span className={s.zh}>{c.zh}</span>
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
                        <div className={s.ovFoot}>ENTER A CATEGORY TO VIEW THE FULL GALLERY — 点击进入完整画廊</div>
                    </div>
                )}
            </PhotoProvider>
        </div>
    )
}
