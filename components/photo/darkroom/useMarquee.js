/**
 * The darkroom's horizontal marquee: a track that crawls leftward forever,
 * speeds up (or reverses) with page scroll, and can be grabbed and flung.
 *
 * `trackRef` must hold `copies` identical children side by side — the offset
 * wraps at one copy's width, so the loop is seamless. `wrapRef` is the
 * clipping box and the drag surface; it keeps its own transform free, so
 * callers can layer a vertical parallax on it.
 */
import { useEffect } from 'react'

// extra px/s of drift added per px/s of page scroll, clamped so a fast flick
// doesn't send the strip flying off-screen
const SCROLL_BOOST = 0.55
const SCROLL_BOOST_MAX = 260

// travel (px) past which a pointer gesture is a drag, not a click
const DRAG_SLOP = 6
// a pointer that rested this long (ms) before release isn't a flick
const FLICK_WINDOW = 90
const FLICK_MAX = 3600 // px/s

// The frame follows the pointer immediately, while the photograph inside it
// lags behind by this much. The lag is capped so the enlarged image never
// exposes its crop edge, then eases back during the release momentum.
const DRAG_PARALLAX_GAIN = 0.7
const DRAG_PARALLAX_MAX = 28
const FLING_PARALLAX_GAIN = 0.012

export function useMarquee({
    wrapRef,
    trackRef,
    speed,
    start = 0,
    copies = 3,
    enabled = true,
    scrollVelRef,
    grabbingClass,
}) {
    useEffect(() => {
        if (!enabled) return
        const wrap = wrapRef.current
        const track = trackRef.current
        if (!wrap || !track) return
        const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        let offset = start
        let unit = 0
        let raf = null
        let last = 0
        let vel = 0
        let dragging = false
        let captured = false
        let pid = null
        let lastX = 0
        let lastT = 0
        let moved = 0
        let visible = false
        let suppressClick = false
        let dragParallax = 0
        let dragParallaxTarget = 0
        let dragParallaxMax = DRAG_PARALLAX_MAX

        const measure = () => {
            unit = track.scrollWidth / copies
            dragParallaxMax = window.innerWidth <= 900 ? 14 : DRAG_PARALLAX_MAX
        }

        const tick = now => {
            raf = null
            const dt = Math.min(64, now - (last || now))
            last = now
            if (!dragging) {
                if (Math.abs(vel) > speed) {
                    // fling: coast, then settle back into the ambient crawl
                    offset += (vel * dt) / 1000
                    vel *= Math.pow(0.92, dt / 16.7)
                    dragParallaxTarget = Math.max(
                        -dragParallaxMax,
                        Math.min(dragParallaxMax, vel * FLING_PARALLAX_GAIN)
                    )
                } else if (!rm) {
                    const raw = scrollVelRef ? scrollVelRef.current * SCROLL_BOOST : 0
                    const boost = Math.max(-SCROLL_BOOST_MAX, Math.min(SCROLL_BOOST_MAX, raw))
                    offset += ((speed + boost) * dt) / 1000
                    dragParallaxTarget = 0
                }
            }
            dragParallax += (dragParallaxTarget - dragParallax) * (dragging ? 0.34 : 0.14)
            if (unit > 0) offset = ((offset % unit) + unit) % unit
            track.style.transform = `translate3d(${-offset}px,0,0)`
            wrap.style.setProperty('--drag-parallax-x', `${dragParallax.toFixed(2)}px`)
            const idle = !dragging && Math.abs(vel) <= speed
            if (visible && !(rm && idle)) raf = requestAnimationFrame(tick)
        }
        const run = () => {
            if (!raf && visible) {
                last = 0
                raf = requestAnimationFrame(tick)
            }
        }

        const io = new IntersectionObserver(
            ([e]) => {
                visible = e.isIntersecting
                if (visible) run()
            },
            { rootMargin: '160px 0px' }
        )
        io.observe(wrap)

        const down = e => {
            if (e.button > 0) return
            if (e.target.closest && e.target.closest('a,button')) return
            dragging = true
            captured = false
            moved = 0
            vel = 0
            // a previous gesture that never produced a click must not leave the
            // guard armed and swallow this one
            suppressClick = false
            pid = e.pointerId
            lastX = e.clientX
            lastT = e.timeStamp
            if (grabbingClass) wrap.classList.add(grabbingClass)
            run()
        }
        const move = e => {
            if (!dragging) return
            const dx = e.clientX - lastX
            const dt = Math.max(1, e.timeStamp - lastT)
            lastX = e.clientX
            lastT = e.timeStamp
            offset -= dx
            moved += Math.abs(dx)
            dragParallaxTarget = Math.max(
                -dragParallaxMax,
                Math.min(dragParallaxMax, dragParallaxTarget * 0.72 - dx * DRAG_PARALLAX_GAIN)
            )
            // Capture only once this is unmistakably a drag. Capturing on
            // pointerdown would retarget the click to the wrap, and the photo
            // under the cursor would never open its lightbox.
            if (!captured && moved > DRAG_SLOP) {
                try {
                    wrap.setPointerCapture(pid)
                    captured = true
                } catch {
                    /* not fatal: the drag just ends when the pointer leaves */
                }
            }
            const inst = (-dx / dt) * 1000
            vel = Math.max(-FLICK_MAX, Math.min(FLICK_MAX, vel * 0.55 + inst * 0.45))
            run()
        }
        const up = e => {
            if (!dragging) return
            dragging = false
            if (grabbingClass) wrap.classList.remove(grabbingClass)
            // released after a pause: let go, don't fling
            if (e && e.timeStamp - lastT > FLICK_WINDOW) vel = 0
            if (moved > DRAG_SLOP) suppressClick = true
            dragParallaxTarget = Math.max(
                -dragParallaxMax,
                Math.min(dragParallaxMax, vel * FLING_PARALLAX_GAIN)
            )
            run()
        }
        // a drag that ends over a photo must not also open the lightbox
        const clickCapture = e => {
            if (suppressClick) {
                e.preventDefault()
                e.stopPropagation()
                suppressClick = false
            }
        }

        const noDrag = e => e.preventDefault()
        // below the slop there is no pointer capture yet, so a pointer that
        // slips off the row would otherwise leave the drag stuck on
        const leave = e => {
            if (dragging && !captured) up(e)
        }

        wrap.addEventListener('pointerdown', down)
        wrap.addEventListener('pointermove', move)
        wrap.addEventListener('pointerup', up)
        wrap.addEventListener('pointercancel', up)
        wrap.addEventListener('pointerleave', leave)
        wrap.addEventListener('click', clickCapture, true)
        wrap.addEventListener('dragstart', noDrag)
        window.addEventListener('resize', measure)

        const ro = new ResizeObserver(measure)
        ro.observe(track)

        measure()
        run()

        return () => {
            io.disconnect()
            ro.disconnect()
            if (raf) cancelAnimationFrame(raf)
            wrap.removeEventListener('pointerdown', down)
            wrap.removeEventListener('pointermove', move)
            wrap.removeEventListener('pointerup', up)
            wrap.removeEventListener('pointercancel', up)
            wrap.removeEventListener('pointerleave', leave)
            wrap.removeEventListener('click', clickCapture, true)
            wrap.removeEventListener('dragstart', noDrag)
            window.removeEventListener('resize', measure)
            wrap.style.removeProperty('--drag-parallax-x')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, speed, start, copies])
}
