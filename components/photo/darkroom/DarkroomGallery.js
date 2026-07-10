/**
 * Darkroom gallery — one category, presented as scanned film rolls.
 *
 * Photos keep their native aspect ratios: each roll is a block of justified
 * rows (equal height per row via flex-grow = aspect ratio) framed by film
 * sprockets and edgeprint, so hierarchy comes from the photographer's own
 * ordering instead of a uniform square grid.
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import 'react-photo-view/dist/react-photo-view.css'
import { getCdnFullUrl, getCdnPreviewUrl } from '/lib/cdnUrl'
import DeferredImage from '/components/photo/darkroom/DeferredImage'
import s from './Gallery.module.css'

const pad2 = n => String(n).padStart(2, '0')
const pad3 = n => String(n).padStart(3, '0')

function Img({ entry, eager }) {
    return (
        <DeferredImage
            src={getCdnPreviewUrl(entry.p)}
            alt={`${entry.cat || ''} ${pad3(entry.n || 0)}`}
            eager={eager}
            draggable={false}
        />
    )
}

export default function DarkroomGallery({ data }) {
    const { name, zh, count, lead, rolls, cats, prev, next } = data

    const rootRef = useRef(null)
    const [flat, setFlat] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.search.includes('flat=1')) setFlat(true)
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
            { threshold: 0.12, rootMargin: '0px 0px -4% 0px' }
        )
        els.forEach(el => io.observe(el))
        return () => io.disconnect()
    }, [flat, name])

    const catIdx = cats.findIndex(c => c.name === name)

    let edge = ''
    for (let i = 0; i < 24; i++) edge += `${name.toUpperCase()} 卷 · TP-5063 PAN 400   ▸▸   TAITAN_PASCAL · UTOPIA   ▸▸   `

    return (
        <div ref={rootRef} className={`${s.root} ${flat ? s.flat : ''}`}>
            <PhotoProvider maskOpacity={0.96} pullClosable>
                {/* top chrome */}
                <div className={s.top}>
                    <Link href="/photographer" className={s.back}>
                        ← 暗房 DARKROOM
                    </Link>
                    <span className={s.pos}>
                        ROLL <b>{pad2(catIdx + 1)}</b> / {pad2(cats.length)}
                    </span>
                </div>

                {/* category strip — the whole archive, one line */}
                <nav className={s.catStrip} aria-label="categories">
                    {cats.map(c => (
                        <Link
                            key={c.name}
                            href={c.href}
                            className={`${s.catLink} ${c.name === name ? s.catOn : ''}`}
                        >
                            {c.name.toUpperCase()}
                            <i>{c.count}</i>
                        </Link>
                    ))}
                </nav>

                {/* head */}
                <header className={s.head}>
                    <div className={s.eyebrow}>
                        <span>CONTACT ROLL — 显影完成 DEVELOPED</span>
                        <span className={s.dim}>{count} FRAMES · NATIVE RATIO 原始画幅</span>
                    </div>
                    <h1 className={s.h1}>
                        {name}
                        <span className={s.zh}>{zh}</span>
                    </h1>
                </header>

                {/* lead print — the photographer's №1 pick */}
                {lead && (
                    <section className={s.leadWrap}>
                        <div
                            className={`${s.lead} ${s.devable}`}
                            data-devable
                            style={{ '--ar': lead.w && lead.h ? lead.w / lead.h : 1.5 }}
                        >
                            <PhotoView src={getCdnFullUrl(lead.p)}>
                                <div className={s.ph} style={{ aspectRatio: lead.w && lead.h ? `${lead.w}/${lead.h}` : '3/2' }}>
                                    <Img entry={lead} eager />
                                </div>
                            </PhotoView>
                            <div className={s.cap}>
                                <span>№ {pad3(1)} — FIRST PRINT · 8×10</span>
                                <span>{zh} · {name.toUpperCase()}</span>
                            </div>
                        </div>
                    </section>
                )}

                {/* film rolls */}
                {rolls.map((roll, ri) => (
                    <section key={ri} className={s.roll}>
                        <div className={s.edgeprint}>{edge}</div>
                        <div className={s.rollNo}>
                            ROLL {pad2(ri + 1)} · {name.toUpperCase()} — TP-5063 PAN 400
                        </div>
                        {roll.map((row, wi) => (
                            <div key={wi} className={s.jrow}>
                                {row.items.map(p => (
                                    <div
                                        key={p.p}
                                        className={`${s.jit} ${s.devable}`}
                                        data-devable
                                        style={{ flexGrow: p.ar }}
                                    >
                                        <PhotoView src={getCdnFullUrl(p.p)}>
                                            <div className={s.ph} style={{ aspectRatio: p.ar }}>
                                                <Img entry={p} />
                                            </div>
                                        </PhotoView>
                                        <span className={s.fno}>{pad3(p.n)}</span>
                                    </div>
                                ))}
                                {row.partial && (
                                    <div
                                        className={s.jpad}
                                        style={{ flexGrow: Math.max(0, row.target - row.items.reduce((a, b) => a + b.ar, 0)) }}
                                    />
                                )}
                            </div>
                        ))}
                    </section>
                ))}

                {/* foot: neighbours + return */}
                <footer className={s.foot}>
                    <div className={s.nextRow}>
                        <Link href={prev.href} className={s.nay}>
                            <span className={s.nayLab}>◂ PREV 上一卷</span>
                            <span className={s.nayName}>
                                {prev.name}
                                <i>{prev.zh} · {prev.count}</i>
                            </span>
                        </Link>
                        <Link href={next.href} className={`${s.nay} ${s.nayR}`}>
                            <span className={s.nayLab}>NEXT 下一卷 ▸</span>
                            <span className={s.nayName}>
                                {next.name}
                                <i>{next.zh} · {next.count}</i>
                            </span>
                        </Link>
                    </div>
                    <div className={s.footBar}>
                        <span>© 2018–2026 TAITAN_PASCAL · UTOPIA</span>
                        <Link href="/photographer">回到暗房 BACK TO DARKROOM</Link>
                        <Link href="/photographer/order">预约拍摄 BOOK →</Link>
                    </div>
                </footer>
            </PhotoProvider>
        </div>
    )
}
