import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"

// ── Icons ────────────────────────────────────────────────────────────────────

const HomeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
)

// Simple right-facing chevron (desktop overflow arrow)
const ChevronRight = ({ open }) => (
    <svg
        width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{
            transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            display: "block",
        }}
    >
        <polyline points="9 18 15 12 9 6" />
    </svg>
)

// Animated 3-line / X icon (pure, no background)
const HamburgerIcon = ({ open }) => (
    <div style={{ width: 20, height: 14, position: "relative", flexShrink: 0 }}>
        {[0, 1, 2].map((i) => {
            const isTop = i === 0
            const isMid = i === 1
            const isBot = i === 2
            return (
                <span
                    key={i}
                    style={{
                        display: "block",
                        position: "absolute",
                        height: 2,
                        width: "100%",
                        background: "rgba(209,213,219,0.9)",
                        borderRadius: 2,
                        left: 0,
                        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        top: isTop
                            ? open ? "50%" : 0
                            : isMid
                                ? "50%"
                                : open ? "50%" : "100%",
                        transform: open
                            ? isTop ? "translateY(-50%) rotate(45deg)"
                            : isMid ? "translateY(-50%) scaleX(0)"
                            : "translateY(-50%) rotate(-45deg)"
                            : isMid ? "translateY(-50%)" : "none",
                        opacity: open && isMid ? 0 : 1,
                    }}
                />
            )
        })}
    </div>
)

// Count badge (small circle)
const CountBadge = ({ count }) => {
    if (!count) return null
    return (
        <span className="pnav-count-badge">
            {count > 99 ? "99+" : count}
        </span>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

export function Pnav({ select, categories }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [showOverflowBtn, setShowOverflowBtn] = useState(false)

    const navRef = useRef(null)
    const tagsRef = useRef(null)       // desktop tags container
    const overflowBtnRef = useRef(null)

    // Normalize categories
    const normalizedCategories = Array.isArray(categories)
        ? categories
            .map((item, index) => {
                const title = typeof item?.title === "string" ? item.title.trim().toLowerCase() : ""
                if (!title) return null
                return {
                    key: item?.index != null ? String(item.index) : String(index),
                    title,
                    count: item?.count ?? 0,
                }
            })
            .filter(Boolean)
        : []

    // ── Responsive: isMobile ──────────────────────────────────────────────────
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768)
        check()
        window.addEventListener("resize", check)
        return () => window.removeEventListener("resize", check)
    }, [])

    // ── Desktop overflow detection ────────────────────────────────────────────
    const checkOverflow = useCallback(() => {
        if (isMobile) {
            setShowOverflowBtn(false)
            return
        }
        const el = tagsRef.current
        if (!el) return
        const overflow = el.scrollWidth > el.clientWidth + 4
        setShowOverflowBtn(overflow)
    }, [isMobile])

    useEffect(() => {
        checkOverflow()
    }, [checkOverflow, normalizedCategories.length])

    useEffect(() => {
        window.addEventListener("resize", checkOverflow)
        return () => window.removeEventListener("resize", checkOverflow)
    }, [checkOverflow])

    // ── Close on outside click ────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (navRef.current && !navRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        document.addEventListener("touchstart", handler)
        return () => {
            document.removeEventListener("mousedown", handler)
            document.removeEventListener("touchstart", handler)
        }
    }, [])

    // Close on Escape
    useEffect(() => {
        const handleKey = (e) => { if (e.key === "Escape") setIsOpen(false) }
        window.addEventListener("keydown", handleKey)
        return () => window.removeEventListener("keydown", handleKey)
    }, [])

    const close = () => setIsOpen(false)

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            ref={navRef}
            className="pnav w-full myblur fixed top-0 h-[4rem] flex justify-between items-center px-4 border-y border-gray-600/40 z-50"
        >
            {/* LEFT: Home + tags (desktop) or home + current label (mobile) */}
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                {/* Home */}
                <Link href="/photographer" onClick={close}>
                    <span
                        className={`pnav-text-item ${select === "index" ? "pnav-text-item--active" : ""}`}
                        title="Photography Home"
                    >
                        <HomeIcon />
                    </span>
                </Link>

                <div className="h-4 w-px bg-gray-600/50 flex-shrink-0" />

                {/* Desktop: flat text tags */}
                {!isMobile && (
                    <div
                        ref={tagsRef}
                        className="pnav-tags-row"
                        style={{
                            // If overflow detected, clip. Items will be hidden by overflow: hidden.
                            // We cut off early to save space for the overflow btn
                            paddingRight: showOverflowBtn ? "0px" : "0px",
                        }}
                    >
                        {normalizedCategories.map((o) => (
                            <Link key={o.key} href={"/photographer/" + o.title} onClick={close}>
                                <span
                                    className={`pnav-text-item ${o.title === select ? "pnav-text-item--active" : ""}`}
                                >
                                    {o.title}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Mobile: show current category label (hidden on homepage) */}
                {isMobile && select !== "index" && (
                    <span className="text-gray-400 text-sm truncate max-w-[140px] ml-1">
                        {select}
                    </span>
                )}
            </div>

            {/* RIGHT: overflow arrow (desktop) or hamburger (mobile) */}
            {(showOverflowBtn || isMobile) && (
                <button
                    className={isMobile ? "pnav-hamburger-btn" : "pnav-overflow-btn"}
                    onClick={() => setIsOpen((v) => !v)}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "Close" : "Open categories"}
                >
                    {isMobile
                        ? <HamburgerIcon open={isOpen} />
                        : <ChevronRight open={isOpen} />
                    }
                </button>
            )}

            {/* DROPDOWN PANEL */}
            <div
                className="pnav-dropdown"
                style={{
                    maxHeight: isOpen ? "480px" : "0px",
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? "auto" : "none",
                    transform: isOpen
                        ? "translateY(0) scaleY(1)"
                        : "translateY(-6px) scaleY(0.96)",
                    paddingTop: isOpen ? "12px" : "0px",
                    paddingBottom: isOpen ? "14px" : "0px",
                }}
                aria-hidden={!isOpen}
            >
                {/* Home item in dropdown */}
                <Link href="/photographer" onClick={close}>
                    <div className={`pnav-dropdown-item ${select === "index" ? "pnav-dropdown-item--active" : ""}`}>
                        <HomeIcon />
                        <span>home</span>
                    </div>
                </Link>

                {normalizedCategories.map((o) => (
                    <Link key={o.key} href={"/photographer/" + o.title} onClick={close}>
                        <div className={`pnav-dropdown-item ${o.title === select ? "pnav-dropdown-item--active" : ""}`}>
                            <span>{o.title}</span>
                            <CountBadge count={o.count} />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
