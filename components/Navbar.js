import SearchIcon from "./SearchIcon"
import Link from "next/link"
import DarkModeToggle from "./DarkModeToggle"
import Breadcrumb from "./Breadcrumb"

export default function Navbar({ paths, state, folderPath }) {
  return (
    <div className="flex justify-between items-center p-[0.60rem] text-2xl md:py-3 fixed top-0 w-full myblur mynav z-40">
      {/* left logo with breadcrumb */}
      {folderPath ? (
        <Breadcrumb folderPath={folderPath} isNavbar={true} />
      ) : (
        <Link href="/" className="text-ink linkable font-bold tracking-wide">
            Utopi
            <div className="inline font-extrabold text-accent">
              a
            </div>
        </Link>
      )}
      {/* right side */}
      <div className="flex space-x-3 items-center">
        <SearchIcon />
        <DarkModeToggle />
      </div>
    </div>
  )
}
