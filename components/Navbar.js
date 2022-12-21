import SearchBar from "./SearchBar"
import ShareLInk from "./ShareLInk"
import { EllipsisOutlined } from "@ant-design/icons"
import { useState } from "react"
import { DrawerView } from "./DrawerView"
import Link from "next/link"

export default function Navbar({ paths, state }) {
  const [visible, setVisible] = useState(false)
  const showDrawer = () => {
    setVisible(true)
  }
  const onClose = () => {
    setVisible(false)
  }
  return (
    <div className="flex justify-between  p-[0.60rem] text-2xl border shadow-sm  md:py-3 fixed top-0 w-full myblur mynav z-40">
      {/* left logo */}
      <Link href="/">
        <a className="text-black linkable">
          Utopi
          <div className="inline font-extrabold font-sans text-slate-400">
            a
          </div>
        </a>
      </Link>
      {/* right side */}
      <div className="flex space-x-4 items-center">
        {/* link */}
        <div className="hidden md:flex space-x-4 items-center text-2xl">
          {/* Search bar*/}
          <SearchBar />
          <ShareLInk />
        </div>
        <div
          className="lg:hidden flex border rounded-lg p-1 "
          onClick={showDrawer}
        >
          <EllipsisOutlined />
        </div>
        <DrawerView
          onClose={onClose}
          paths={paths}
          state={state}
          visible={visible}
        />
      </div>
    </div>
  )
}
