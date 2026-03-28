import SearchIcon from "./SearchIcon"
import Link from "next/link"
import DarkModeToggle from "./DarkModeToggle"
import Breadcrumb from "./Breadcrumb"

export default function Navbar({ paths, state, folderPath }) {
  return (
    <div className="flex justify-between p-[0.60rem] text-2xl md:py-3 fixed top-0 w-full myblur mynav z-40">
      {/* left logo with breadcrumb */}
      {folderPath ? (
        <Breadcrumb folderPath={folderPath} isNavbar={true} />
      ) : (
        <Link href="/">
          <a className="text-black dark:text-white linkable">
            Utopi
            <div className="inline font-extrabold font-sans text-slate-400 dark:text-slate-500">
              a
            </div>
          </a>
        </Link>
      )}
      {/* right side */}
      <div className="flex space-x-4 items-center">
        <SearchIcon />
        <DarkModeToggle />
      </div>
    </div>
  )
}
