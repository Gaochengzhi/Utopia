import { cataList } from "./cataList"
import Link from "next/link"

const HomeIcon = ({ className }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
)

export function Pnav({ select, categories }) {
  return (
    <div className="pnav w-full myblur fixed top-0 h-[4rem] flex justify-between items-center px-4 border-y border-gray-600 z-50">
      {/* Scrollable navigation */}
      <div 
        className="flex items-end text-gray-400 text-lg space-x-3 overflow-x-auto scrollbar-hide"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <Link href={"/photographer"}>
          <div
            className={
              select == "index"
                ? "text-white flex pr-2 pb-1 pclick text-2xl whitespace-nowrap"
                : "flex pr-2 pclick pb-2 whitespace-nowrap"
            }
          >
            <HomeIcon />
          </div>
        </Link>

        {(categories || cataList).map((o) => (
          <Link key={o.index} href={"/photographer/" + o.title.toLowerCase()}>
            <div
              className={
                o.title.toLowerCase() == select
                  ? "pclick text-3xl font-bold text-white whitespace-nowrap"
                  : "pclick whitespace-nowrap hover:text-gray-200 transition-colors"
              }
            >
              {o.title}
            </div>
          </Link>
        ))}
      </div>

      {/* Right section */}
      <div className="flex text-2xl text-white"></div>
    </div>
  )
}
