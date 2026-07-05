const CompassIcon = ({ className }) => (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
)

export function TocToggleButton() {
    return (
        <div className="fixed right-4 bottom-9 md:right-10 text-4xl clickable">
            <div className="bg-chip border border-rule text-ink2 hover:text-ink hover:border-ink p-2.5 flex items-center justify-center transition-colors duration-200">
                <CompassIcon />
            </div>
        </div>
    )
}

// Keep backward compatibility alias
export const Float = TocToggleButton
