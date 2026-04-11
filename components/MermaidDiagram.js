import { useEffect, useRef, useState, useCallback } from "react"

/**
 * MermaidDiagram — renders a single mermaid code block into an SVG.
 *
 * Uses mermaid's built-in "forest" theme (same style Typora defaults to
 * for attractive green-toned diagrams). Always renders on a white background
 * so it looks identical in both light and dark page modes.
 */

let mermaidInstance = null
let mermaidLoadPromise = null
let diagramCounter = 0

/** Lazily loads and configures mermaid once for the whole page */
async function getMermaid() {
    if (mermaidInstance) return mermaidInstance
    if (mermaidLoadPromise) return mermaidLoadPromise

    mermaidLoadPromise = (async () => {
        const m = await import("mermaid")
        mermaidInstance = m.default

        mermaidInstance.initialize({
            startOnLoad: false,
            // "forest" — the green-toned built-in theme, same as Typora's popular setting
            theme: "forest",
            fontFamily:
                'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontSize: 14,
            flowchart: {
                htmlLabels: true,
                curve: "basis",
                padding: 15,
                useMaxWidth: true,
            },
            sequence: {
                useMaxWidth: true,
                showSequenceNumbers: false,
                actorMargin: 50,
            },
            gantt: { useMaxWidth: true },
            journey: { useMaxWidth: true },
            state: { useMaxWidth: true },
            er: { useMaxWidth: true },
            pie: { useMaxWidth: true },
            suppressErrorRendering: true,
        })

        return mermaidInstance
    })()

    return mermaidLoadPromise
}

export default function MermaidDiagram({ chart }) {
    const containerRef = useRef(null)
    const [error, setError] = useState(null)
    const [rendered, setRendered] = useState(false)
    const idRef = useRef(`mermaid-${++diagramCounter}-${Date.now()}`)

    const renderDiagram = useCallback(async () => {
        if (!containerRef.current || !chart) return

        try {
            const mermaid = await getMermaid()
            await mermaid.parse(chart)

            const { svg } = await mermaid.render(idRef.current, chart)
            if (containerRef.current) {
                containerRef.current.innerHTML = svg

                const svgEl = containerRef.current.querySelector("svg")
                if (svgEl) {
                    svgEl.style.maxWidth = "100%"
                    svgEl.style.height = "auto"
                    svgEl.removeAttribute("height")
                }
            }
            setError(null)
            setRendered(true)
        } catch (err) {
            console.warn("Mermaid render error:", err)
            setError(err.message || "Failed to render diagram")
            setRendered(true)
        }
    }, [chart])

    useEffect(() => {
        renderDiagram()
    }, [renderDiagram])

    if (error) {
        return (
            <div className="mermaid-error">
                <div className="mermaid-error-header">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                            d="M8 1L1 14h14L8 1z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />
                        <path d="M8 6v3M8 11v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>Diagram Syntax Error</span>
                </div>
                <pre className="mermaid-error-code">{chart}</pre>
            </div>
        )
    }

    return (
        <div className="mermaid-container">
            <div ref={containerRef} className="mermaid-svg-wrapper" />
            {!rendered && (
                <div className="mermaid-loading">
                    <div className="mermaid-loading-spinner" />
                    <span>Rendering diagram…</span>
                </div>
            )}
        </div>
    )
}
