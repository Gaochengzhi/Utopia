/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef } from 'react'
import { handleCdnError } from '/lib/cdnUrl'

const DEFAULT_ROOT_MARGIN = '120% 120%'

/**
 * Keep decoded photographs bounded to the part of the page near the viewport.
 * Native loading="lazy" delays requests, but it never unloads images that the
 * visitor has already scrolled past. Long contact sheets therefore retain
 * hundreds of decoded bitmaps. This component removes src again when a photo
 * is far away, while keeping the element itself in the layout.
 */
export default function DeferredImage({
    src,
    alt = '',
    eager = false,
    rootMargin = DEFAULT_ROOT_MARGIN,
    onLoad,
    onError = handleCdnError,
    ...props
}) {
    const imageRef = useRef(null)

    useEffect(() => {
        if (eager || !src) return undefined

        const image = imageRef.current
        if (!image) return undefined

        const load = () => {
            const resolvedSrc = image.dataset.resolvedSrc || src
            if (image.getAttribute('src') !== resolvedSrc) image.setAttribute('src', resolvedSrc)
        }
        const unload = () => {
            image.removeAttribute('src')
            image.removeAttribute('srcset')
        }

        // Keep the flat QA view deterministic when it is used for full-page
        // screenshots. Production pages use the bounded viewport window.
        if (!('IntersectionObserver' in window) || window.location.search.includes('flat=1')) {
            load()
            return unload
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) load()
                else unload()
            },
            { rootMargin }
        )
        observer.observe(image)

        return () => {
            observer.disconnect()
            unload()
        }
    }, [eager, rootMargin, src])

    const rememberResolvedSource = event => {
        const image = event.currentTarget
        const resolvedSrc = image.getAttribute('src')
        if (resolvedSrc) image.dataset.resolvedSrc = resolvedSrc
        if (onLoad) onLoad(event)
    }

    return (
        <img
            {...props}
            ref={imageRef}
            alt={alt}
            src={eager ? src : undefined}
            data-source={src}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={eager ? 'high' : 'low'}
            onLoad={rememberResolvedSource}
            onError={onError}
        />
    )
}
