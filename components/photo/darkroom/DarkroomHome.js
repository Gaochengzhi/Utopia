/**
 * Darkroom — the photographer homepage.
 *
 * One continuous night in a darkroom: a portrait-collage prologue develops
 * on load, people ride a sticky horizontal film strip, the city surfaces as
 * prints in developer trays, the world sits on a contact sheet, and every
 * white-matte square print ends up pinned on one wall.
 *
 * Navigation: right-edge chapter rail + full-screen INDEX overlay
 * (replaces the old category tag bar).
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import 'react-photo-view/dist/react-photo-view.css'
import { getCdnUrl, handleCdnError } from '/lib/cdnUrl'
import s from './Darkroom.module.css'

const RAIL_TICKS = [
    { id: 'top', no: '00', lab: '序 PROLOGUE' },
    { id: 'ch1', no: '01', lab: '人 PEOPLE' },
    { id: 'ch2', no: '02', lab: '城市 CITY' },
    { id: 'ch3', no: '03', lab: '世界 WORLD' },
    { id: 'ch4', no: '04', lab: '墙 WALL' },
    { id: 'epi', no: '05', lab: '尾声 EPILOGUE' },
]

const pad2 = n => String(n).padStart(2, '0')
const pad3 = n => String(n).padStart(3, '0')

function Img({ entry, eager, className, style }) {
    return (
        <img
            src={getCdnUrl(entry.p)}
            alt={entry.cat || ''}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className={className}
            style={style}
            onError={handleCdnError}
        />
    )
}

/** A darkroom print: bordered frame, develop-in reveal, lightbox on click. */
function Print({ entry, no, right, gridClass, eager }) {
    const ar = entry.w && entry.h ? `${entry.w}/${entry.h}` : '3/2'
    return (
        <div className={`${s.print} ${s.devable} ${gridClass || ''}`} data-devable>
            <PhotoView src={getCdnUrl(entry.p)}>
                <div className={s.ph} style={{ aspectRatio: ar }}>
                    <Img entry={entry} eager={eager} />
                </div>
            </PhotoView>
            <div className={s.cap}>
                <span className={s.no}>{no}</span>
                <span>{right}</span>
            </div>
        </div>
    )
}

export default function DarkroomHome({ data }) {
    const { hero, strip, cityGrid, sheet, wall, epi, cats, counts } = data

    const [overlayOpen, setOverlayOpen] = useState(false)
    const [flat, setFlat] = useState(false)
    const [heroDev, setHeroDev] = useState(false)

    const rootRef = useRef(null)
    const reelRef = useRef(null)
    const stripRef = useRef(null)
    const threadRef = useRef(null)
    const railRef = useRef(null)
    const safelightRef = useRef(null)
    const frameCurRef = useRef(null)
    const panelsRef = useRef(null)
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

    // scroll engine: lerp + film strip travel + rail + safelight
    useEffect(() => {
        if (flat) return
        const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const reel = reelRef.current
        const strip = stripRef.current
        const panels = panelsRef.current ? [...panelsRef.current.children] : []
        const secs = RAIL_TICKS.map(t => document.getElementById(t.id)).filter(Boolean)
        let vh = window.innerHeight
        let vw = window.innerWidth
        let mobile = vw <= 900
        let stripW = 0
        let reelTop = 0
        let reelRange = 1
        let docH = 1
        let railH = 0
        let target = window.scrollY
        let cur = target
        let raf = null
        const stripFrames = strip ? strip.querySelectorAll(`.${s.frame}`).length : 0

        const measure = () => {
            vh = window.innerHeight
            vw = window.innerWidth
            mobile = vw <= 900
            if (reel && strip && !mobile) {
                strip.style.transform = 'translate3d(0,0,0)'
                stripW = strip.scrollWidth
                const travel = Math.max(0, stripW - vw)
                reel.style.height = `${vh + travel * 1.05}px`
            } else if (reel) {
                reel.style.height = 'auto'
            }
            if (reel) {
                reelTop = reel.getBoundingClientRect().top + window.scrollY
                reelRange = Math.max(1, reel.offsetHeight - vh)
            }
            docH = document.documentElement.scrollHeight - vh
            railH = railRef.current ? railRef.current.offsetHeight + 60 : 0
        }

        const render = y => {
            if (y < vh * 1.4 && panels.length) {
                const factors = [0.05, 0.1, 0.07, 0.12]
                panels.forEach((p, i) => {
                    p.style.transform = `translate3d(0,${y * factors[i % 4]}px,0)`
                })
            }
            if (reel && strip && !mobile) {
                const pr = Math.min(1, Math.max(0, (y - reelTop) / reelRange))
                strip.style.transform = `translate3d(${-pr * Math.max(0, stripW - vw)}px,0,0)`
                if (frameCurRef.current) {
                    const fi = Math.min(stripFrames, Math.max(1, Math.round(pr * stripFrames + 0.5)))
                    frameCurRef.current.textContent = `FRAME ${pad2(fi)}`
                }
                if (safelightRef.current) {
                    const d = Math.abs(pr - 0.5) * 2
                    safelightRef.current.style.opacity = String(Math.max(0, 1 - d) * 0.5 * (pr > 0 && pr < 1 ? 1 : 0))
                }
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
    const cityCounts = cats.filter(c => ['HK', 'City', 'Travel'].includes(c.name))
    const worldCounts = cats.filter(c => ['Nature', 'Ghibli', 'Phone'].includes(c.name))
    const fmtCounts = list => list.map(c => `${c.name.toUpperCase()} ${c.count}`).join(' · ')

    let edge = ''
    for (let i = 0; i < 30; i++) edge += 'TP-5063 PAN 400   ▸▸   TAITAN_PASCAL · UTOPIA   ▸▸   '

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

                {/* ———— prologue: portrait collage ———— */}
                <section className={`${s.hero} ${heroDev ? s.heroDeveloped : ''}`} id="top">
                    <div ref={panelsRef} className={s.heroPanels}>
                        {hero.map((p, i) => (
                            <div key={p.p} className={s.panel}>
                                <Img entry={p} eager />
                            </div>
                        ))}
                    </div>
                    <div className={s.heroShade} />
                    <div className={s.heroBody}>
                        <div className={s.heroEyebrow}>
                            <span className={s.lamp} /> UTOPIA · DARKROOM SESSION — NANJING · 2018→2026
                        </div>
                        <h1 className={s.h1}>
                            <span className={s.row}>
                                TAITAN<span className={s.u}>_</span>
                            </span>
                            <span className={s.row}>PASCAL</span>
                        </h1>
                        <div className={s.heroSub}>
                            <span className={s.zh}>把光留在相纸上。</span>
                            <span className={s.en}>LIGHT, KEPT ON PAPER — 高成志 · 摄影</span>
                        </div>
                        <div className={s.heroMeta}>
                            <span>
                                ARCHIVE <b>{counts.total}</b> FRAMES
                            </span>
                            <span>
                                CATEGORIES <b>{counts.cats}</b>
                            </span>
                            <span>
                                BASE <b>NANJING · SEU</b>
                            </span>
                            <span>
                                STATUS <b>ACCEPTING BOOKINGS 接受预约</b>
                            </span>
                        </div>
                    </div>
                    <div className={s.scrollcue}>
                        <span>向下卷动 · 开始显影 SCROLL TO DEVELOP</span>
                        <span className={s.line} />
                    </div>
                </section>

                <div className={s.divider}>CH.01 ▸ 装片 LOADING FILM — 人 PEOPLE</div>

                {/* ———— CH.01 people / film strip ———— */}
                <section ref={reelRef} className={s.reel} id="ch1">
                    <div className={s.pin}>
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
                                <div className={s.note}>一格一格，把人装进胶片。</div>
                            </div>
                        </div>
                        <div className={s.stripOuter}>
                            <div ref={stripRef} className={s.strip}>
                                <div className={s.film}>
                                    <div className={s.edgeprint}>{edge}</div>
                                    <div className={`${s.frame} ${s.frameLead}`}>
                                        <div className={s.in}>
                                            <div className={s.big}>▸▸ START</div>
                                            CH.01 PEOPLE 人<br />
                                            HANDLE IN SAFELIGHT ONLY
                                            <br />
                                            仅限安全灯下操作
                                        </div>
                                    </div>
                                    {strip.map((p, i) => (
                                        <div key={p.p} className={s.frame}>
                                            <PhotoView src={getCdnUrl(p.p)}>
                                                <div
                                                    className={s.ph}
                                                    style={{ aspectRatio: p.w && p.h ? `${p.w}/${p.h}` : '2/3' }}
                                                >
                                                    <Img entry={p} eager={i < 3} />
                                                </div>
                                            </PhotoView>
                                            <span className={s.fno}>TP-{i + 4} ▸ {20 + i}A</span>
                                            <span className={s.peoplecap}>
                                                {(cats.find(c => c.name === p.cat) || {}).zh || p.cat} · {p.cat.toUpperCase()}
                                            </span>
                                        </div>
                                    ))}
                                    <div className={`${s.frame} ${s.frameLead}`}>
                                        <div className={s.in}>
                                            <div className={s.big}>END ◂◂</div>
                                            REWIND 收卷
                                            <br />
                                            SEE INDEX FOR ALL {counts.people} FRAMES
                                            <br />
                                            其余请见索引
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={s.reelFoot}>
                            <span>TP-5063 PAN 400 · 24EXP</span>
                            <span>
                                <span ref={frameCurRef} className={s.cur}>
                                    FRAME 01
                                </span>{' '}
                                / {pad2(strip.length)}
                            </span>
                        </div>
                    </div>
                </section>

                <div className={s.divider}>CH.02 ▸ 显影中 DEVELOPING — 城市 CITY</div>

                {/* ———— CH.02 city ———— */}
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
                    <div className={s.citygrid}>
                        {cityGrid.map((p, i) => (
                            <Print
                                key={p.p}
                                entry={p}
                                no={`NO.${pad3(i + 11)} · ${p.cat.toUpperCase()}`}
                                right={(cats.find(c => c.name === p.cat) || {}).zh || p.cat}
                                gridClass={[s.gA, s.gB, s.gC, s.gWide, s.gD, s.gE, s.gF][i]}
                                eager={i < 1}
                            />
                        ))}
                    </div>
                </section>

                <div className={s.divider}>CH.03 ▸ 印样 CONTACT SHEET — 世界 WORLD</div>

                {/* ———— CH.03 world / contact sheet ———— */}
                <section id="ch3">
                    <div className={s.chHead}>
                        <div className={s.chEyebrow}>
                            <span>CH.03 — 印样 CONTACT SHEET</span>
                            <span className={s.dim}>{fmtCounts(worldCounts)}</span>
                        </div>
                        <h2 className={s.h2}>
                            WORLD<span className={s.zh}>世界</span>
                        </h2>
                        <p className={s.chLine}>
                            印样上挑一张，放大成世界。
                            <span className={s.en}>PICK ONE FROM THE SHEET; ENLARGE IT INTO A WORLD.</span>
                        </p>
                    </div>
                    <div className={s.sheetWrap}>
                        <div className={s.sheet}>
                            <div className={s.sheetTop}>
                                <span>CONTACT SHEET №.07 — ILFORD MGIV RC · 8×10</span>
                                <span>TAITAN_PASCAL · UTOPIA ARCHIVE</span>
                            </div>
                            <div className={s.sheetGrid}>
                                {sheet.map((p, i) => (
                                    <PhotoView key={p.p} src={getCdnUrl(p.p)}>
                                        <div className={`${s.cell} ${i === 8 ? `${s.picked} ${s.devable}` : ''}`} {...(i === 8 ? { 'data-devable': true } : {})}>
                                            <Img entry={p} />
                                            <span className={s.cno}>
                                                {i + 1}
                                                {i % 2 ? 'A' : ''}
                                            </span>
                                            {i === 8 && (
                                                <>
                                                    <svg className={s.grease} viewBox="0 0 100 100" preserveAspectRatio="none">
                                                        <ellipse cx="50" cy="50" rx="44" ry="40" pathLength="100" transform="rotate(-4 50 50)" />
                                                    </svg>
                                                    <span className={s.greaseNote}>↑ 这张 · 放大 8×10 ENLARGE</span>
                                                </>
                                            )}
                                        </div>
                                    </PhotoView>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <div className={s.divider}>CH.04 ▸ 上墙 ON THE WALL — 白边方片</div>

                {/* ———— CH.04 the matte wall ———— */}
                <section id="ch4">
                    <div className={s.chHead}>
                        <div className={s.chEyebrow}>
                            <span>CH.04 — 白边方片 SQUARE PRINTS</span>
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
                                <PhotoView key={p.p} src={getCdnUrl(p.p)}>
                                    <div
                                        className={`${s.wtile} ${s.devable} ${i === wallPicked ? s.picked : ''}`}
                                        data-devable
                                    >
                                        <Img entry={p} style={{ transitionDelay: `${(i % 10) * 50}ms` }} />
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

                {/* ———— epilogue ———— */}
                <section className={s.epi} id="epi">
                    <div className={`${s.print} ${s.devable}`} data-devable>
                        <PhotoView src={getCdnUrl(epi.p)}>
                            <div className={s.ph} style={{ aspectRatio: epi.w && epi.h ? `${epi.w}/${epi.h}` : '3/2' }}>
                                <Img entry={epi} />
                            </div>
                        </PhotoView>
                        <div className={s.cap}>
                            <span className={s.no}>FINAL PRINT · 8×10 FIBER</span>
                            <span>{(cats.find(c => c.name === epi.cat) || {}).zh || epi.cat} — 定影完成</span>
                        </div>
                    </div>
                    <div className={s.epiTxt}>
                        <p className={s.zhBig}>
                            定影完成，
                            <br />
                            挂起来晾干。
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
                                <span>预约拍摄 BOOK A SESSION</span>
                                <span>→</span>
                            </Link>
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
                                                <img src={getCdnUrl(t)} alt="" loading="lazy" onError={handleCdnError} />
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
