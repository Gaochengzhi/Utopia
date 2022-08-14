import { ShareLInk } from "./ShareLInk"
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
    <div className="flex justify-between  p-[0.60rem] text-2xl border shadow-sm md:px-9 md:py-4 fixed top-0 w-full bg-white z-40">
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
        <div className="hidden sm:flex space-x-4 items-center text-2xl">
          <ShareLInk />
        </div>
        <div
          className="sm:hidden flex border rounded-lg p-1 "
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
