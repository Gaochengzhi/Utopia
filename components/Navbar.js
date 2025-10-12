import SearchIcon from "./SearchIcon"
import Link from "next/link"
import DarkModeToggle from "./DarkModeToggle"
import Breadcrumb from "./Breadcrumb"

export default function Navbar({ paths, state, folderPath }) {
  return (
    <div className="flex justify-between p-[0.60rem] text-2xl border shadow-sm md:py-3 fixed top-0 w-full myblur mynav z-40 bg-white/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-700">
      {/* left logo with breadcrumb */}
      {folderPath ? (
        <Breadcrumb folderPath={folderPath} isNavbar={true} />
      ) : (
        <div className="flex items-center space-x-2">
          <Link href="/">
            <a className="text-black dark:text-white linkable">
              Utopi
              <div className="inline font-extrabold font-sans text-slate-400 dark:text-slate-500">
                a
              </div>
            </a>
          </Link>
          <span className="text-gray-400 dark:text-gray-600">·</span>
          <Link href="/post">
            <a className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors text-xl">
              ☰
            </a>
          </Link>
        </div>
      )}
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
