import { HomeFilled, BarsOutlined } from "@ant-design/icons"
import { cataList } from "./cataList"
import Link from "next/link"
export function Pnav({ select }) {
  return (
    <div className="pnav w-full myblur fixed top-0 h-[4rem] flex justify-between items-center px-4 border-y border-gray-600 z-50">
      {/* left */}

      <div className="flex cursor-pointer justify-center items-end text-gray-400 text-lg space-x-3">
        <Link href={"/photographer"}>
          <div
            className={
              select == "index"
                ? "text-white flex pr-2 pb-1 pclick text-2xl"
                : "flex pr-2 pclick pb-2"
            }
          >
            <HomeFilled />
          </div>
        </Link>

        {cataList.map((o) => (
          <Link key={o.index} href={"/photographer/" + o.title.toLowerCase()}>
            <div
              className={
                o.title.toLowerCase() == select
                  ? "pclick text-3xl font-bold text-white"
                  : "pclick  sm:w-fit overflow-hidden"
              }
            >
              {o.title}
            </div>
          </Link>
        ))}
      </div>
      {/* right */}
      <div className="flex text-2xl text-white">{/* <BarsOutlined /> */}</div>
    </div>
  )
}
