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
import { useLocale } from '/lib/i18n/useLocale'
import LangSwitch from '/components/photo/darkroom/LangSwitch'
import DeferredImage from '/components/photo/darkroom/DeferredImage'
import s from './Gallery.module.css'

const pad2 = n => String(n).padStart(2, '0')
const pad3 = n => String(n).padStart(3, '0')
const filmDate = value => {
    const date = new Date(Number(value))
    if (!value || Number.isNaN(date.getTime())) return 'DATE —'
    return `DATE ${date.getUTCFullYear()}.${pad2(date.getUTCMonth() + 1)}.${pad2(date.getUTCDate())}`
}

function FilmCode({ entry }) {
    return (
        <span className={s.fno} aria-label={`Film frame ${pad3(entry.n)}`}>
            <span>TP-5063</span>
            <span>ISO 400</span>
            <span className={s.filmDate}>{filmDate(entry.createdAt)}</span>
            <span>F {pad3(entry.n)}</span>
        </span>
    )
}

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
    const { name, zh, ja, count, leadRow, rolls, cats, prev, next } = data

    const rootRef = useRef(null)
    const [flat, setFlat] = useState(false)
    const [locale, setLocale] = useLocale()

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
        <div ref={rootRef} className={`${s.root} ${flat ? s.flat : ''}`} data-lang={locale}>
            <PhotoProvider maskOpacity={0.96} pullClosable>
                {/* top chrome */}
                <div className={s.top}>
                    <Link href="/photographer" className={s.back}>
                        <svg className={s.backMark} viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M13 2.5 4 8l9 5.5Z" />
                        </svg>
                        <span>{locale === 'ja' ? '暗室' : '暗房 DARKROOM'}</span>
                    </Link>
                    <span className={s.pos}>
                        ROLL <b>{pad2(catIdx + 1)}</b> / {pad2(cats.length)}
                    </span>
                    <LangSwitch locale={locale} onChange={setLocale} />
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
                        <span>{locale === 'ja' ? 'コンタクトロール — 現像済み' : 'CONTACT ROLL — 显影完成 DEVELOPED'}</span>
                        <span className={s.dim}>{locale === 'ja' ? `${count} 枚 · オリジナル比率` : `${count} FRAMES · NATIVE RATIO 原始画幅`}</span>
                    </div>
                    <h1 className={s.h1}>
                        {name}
                        <span className={s.zh}>{zh}</span>
                        <span className={s.ja}>{ja}</span>
                    </h1>
                </header>

                {/* lead row — the photographer's top prints, full-bleed */}
                {leadRow && leadRow.items.length > 0 && (
                    <section className={s.leadWrap}>
                        <div className={`${s.jrow} ${s.leadRow}`}>
                            {leadRow.items.map(p => (
                                <div
                                    key={p.p}
                                    className={`${s.jit} ${s.devable}`}
                                    data-devable
                                    style={{ flexGrow: p.ar }}
                                >
                                    <PhotoView src={getCdnFullUrl(p.p)}>
                                        <div className={s.ph} style={{ aspectRatio: p.ar }}>
                                            <Img entry={p} eager />
                                        </div>
                                    </PhotoView>
                                    <FilmCode entry={p} />
                                </div>
                            ))}
                        </div>
                        <div className={s.leadCap}>
                            <span>FIRST PRINTS 头版 · 8×10</span>
                            <span>{(locale === 'ja' ? ja : zh)} · {name.toUpperCase()}</span>
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
                                        <FilmCode entry={p} />
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
                            <span className={s.nayLab}>{locale === 'ja' ? '◂ 前のロール' : '◂ PREV 上一卷'}</span>
                            <span className={s.nayName}>
                                {prev.name}
                                <i>{(locale === 'ja' ? prev.ja : prev.zh)} · {prev.count}</i>
                            </span>
                        </Link>
                        <Link href={next.href} className={`${s.nay} ${s.nayR}`}>
                            <span className={s.nayLab}>{locale === 'ja' ? '次のロール ▸' : 'NEXT 下一卷 ▸'}</span>
                            <span className={s.nayName}>
                                {next.name}
                                <i>{(locale === 'ja' ? next.ja : next.zh)} · {next.count}</i>
                            </span>
                        </Link>
                    </div>
                    <div className={s.footBar}>
                        <span>© 2018–2026 TAITAN_PASCAL · UTOPIA</span>
                        <Link href="/photographer">{locale === 'ja' ? '暗室に戻る' : '回到暗房 BACK TO DARKROOM'}</Link>
                        <Link href="/photographer/order">{locale === 'ja' ? '撮影を予約 →' : '预约拍摄 BOOK →'}</Link>
                    </div>
                </footer>
            </PhotoProvider>
        </div>
    )
}
