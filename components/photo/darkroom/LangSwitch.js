const LABELS = {
  zh: { compact: '中', full: '中文', name: 'Chinese' },
  ja: { compact: '日', full: '日本語', name: 'Japanese' },
  en: { compact: 'EN', full: 'EN', name: 'English' },
}
const ORDER = ['zh', 'ja', 'en']

// A compact mode label keeps the control usable on phones. At md and above it
// spells out Chinese and Japanese so the current language is self-explanatory.
// The shared dark, square chrome lets it sit beside the darkroom's glass plates.
export default function LangSwitch({ locale, onChange, className = '', embedded = false }) {
  return (
    <div
      className={`inline-flex items-center overflow-hidden text-[11px] tracking-wide ${
        embedded
          ? ''
          : 'border border-[rgba(217,212,203,0.12)] bg-[rgba(18,16,13,0.45)] shadow-[0_1px_3px_rgba(0,0,0,0.28)] backdrop-blur-[14px] backdrop-saturate-[1.3]'
      } ${className}`}
      role="group"
      aria-label="language"
    >
      {ORDER.map(l => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          aria-pressed={locale === l}
          aria-label={LABELS[l].name}
          className={`flex h-[31px] w-6 items-center justify-center font-medium transition-colors md:w-11 ${
            locale === l
              ? 'bg-[#e5e1d8] text-[#171510]'
              : 'text-[rgba(217,212,203,0.72)] [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] hover:bg-white/10 hover:text-[#e5e1d8]'
          }`}
        >
          <span className="md:hidden">{LABELS[l].compact}</span>
          <span className="hidden md:inline">{LABELS[l].full}</span>
        </button>
      ))}
    </div>
  )
}
