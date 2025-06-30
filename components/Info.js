import Link from "next/link"
import React from "react"
import ShareLInk from "./ShareLInk"
export function Info({}) {
  return (
    <>
      {/* 社交媒体链接 */}
      <div className="flex justify-center items-center space-x-4 mb-4">
        <ShareLInk />
      </div>
      
      <div className="">
        <div className="flex justify-center items-center rounded-full p-1  border-gray-400 border-dotted border-2 shadow-md">
          <img src="/icon.jpeg" alt="" className="w-28 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col">
        <div className="text-3xl   font-light">@Taitan_Pascal</div>
        <div className="text-gray-400 p-1 mt-2 whitespace-nowrap">
          <div>
            <div className="text-xl  p-0 font-serif">
              <div className="inline m-[-2px] text-purple-600"> C</div>
              <div className="inline m-[-2px] text-orange-600"> l</div>
              <div className="inline m-[-2px] text-yellow-600"> i</div>
              <div className="inline m-[-2px] text-green-600"> c</div>
              <div className="inline m-[-2px] text-blue-600"> k</div>
              <div className="inline text-2xl">👇</div>
            </div>
            <div className="jobs">🌈 瓦梁湖生态观察小队副队长</div>
            <div className="jobs">👨🏻‍💻 Software Engnieer</div>
            <div className="jobs">
              <Link href="/photographer">
                <a className="text-gray-400">📸 Photographer</a>
              </Link>
            </div>
          </div>
          <div className="text-blue-400 mt-2 font-semibold flex flex-wrap max-w-[48rem]">
            <div className="mytag clickable bg-orange-600"> Unix/Linux </div>
            <div className="mytag clickable bg-purple-500"> film shoot </div>
            <div className="mytag clickable bg-sky-500"> React </div>
            <div className="mytag clickable bg-gray-800"> Nextjs </div>
            <div className="mytag clickable bg-green-600"> nvim </div>
          </div>
        </div>
      </div>
    </>
  )
}
