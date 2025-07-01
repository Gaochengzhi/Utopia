import SearchIcon from "./SearchIcon"
import Link from "next/link"
import DarkModeToggle from "./DarkModeToggle"

export default function Navbar({ paths, state }) {
  return (
    <div className="flex justify-between p-[0.60rem] text-2xl border shadow-sm md:py-3 fixed top-0 w-full myblur mynav z-40 bg-white/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-700">
      {/* left logo */}
      <Link href="/">
        <a className="text-black dark:text-white linkable">
          Utopi
          <div className="inline font-extrabold font-sans text-slate-400 dark:text-slate-500">
            a
          </div>
        </a>
      </Link>
      {/* right side */}
      <div className="flex space-x-4 items-center">
        {/* link */}
        <div className="hidden md:flex space-x-4 items-center text-2xl">
          {/* Search icon*/}
          <SearchIcon />
          {/* Dark mode toggle */}
          <DarkModeToggle />
        </div>
        <div className="lg:hidden flex items-center space-x-2">
          <SearchIcon />
          <DarkModeToggle />
        </div>
      </div>
    </div>
  )
}
