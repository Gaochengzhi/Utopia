import Link from "next/link"
import React from "react"
import ShareLInk from "./ShareLInk"
import { SkillsList } from "./SkillsTags"
import TotalViews from "./TotalViews"

export function Info({ variant = "desktop", showSkills = true }) {
  // Desktop variant: vertical layout for sidebar
  if (variant === "desktop") {
    return (
      <>
        {/* Social media links */}
        <div className="flex justify-center items-center space-x-4 mb-4">
          <ShareLInk />
        </div>

        <div className="">
          <div className="flex justify-center items-center rounded-full p-1 border-gray-400 dark:border-gray-600 border-dotted border-2 shadow-md">
            <img src="/icon.jpeg" alt="" className="w-28 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="text-3xl font-light text-gray-900 dark:text-gray-100">@Taitan_Pascal</div>
          <div className="text-gray-400 dark:text-gray-500 p-1 mt-2 whitespace-nowrap">
            <div>
              <div className="text-xl p-0 font-serif">
                <div className="inline m-[-2px] text-purple-600"> C</div>
                <div className="inline m-[-2px] text-orange-600"> l</div>
                <div className="inline m-[-2px] text-yellow-600"> i</div>
                <div className="inline m-[-2px] text-green-600"> c</div>
                <div className="inline m-[-2px] text-blue-600"> k</div>
                <div className="inline text-2xl">👇</div>
              </div>
              <div className="jobs text-gray-600 dark:text-gray-400">🌈 瓦梁湖生态观察小队副队长</div>
              <div className="jobs text-gray-600 dark:text-gray-400">👨🏻‍💻 Software Engineer</div>
              <div className="jobs">
                <Link href="/photographer" className="text-gray-400 dark:text-gray-500">
                  📸 Photographer
                </Link>
              </div>
              <TotalViews />
            </div>
            {showSkills && (
              <div className="text-blue-400 dark:text-blue-300 mt-2 font-semibold max-w-[48rem]">
                <SkillsList className="!justify-start !flex-wrap !mx-0 !px-0" />
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  // Mobile variant: horizontal compact layout
  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Social media links */}
          <div className="flex justify-center items-center space-x-4 mb-4">
            <ShareLInk />
          </div>

          {/* Avatar and basic info */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex justify-center items-center rounded-full p-1 border-gray-400 border-dotted border-2 shadow-md">
              <img src="/icon.jpeg" alt="" className="w-16 h-16 rounded-full object-cover" />
            </div>
            <div className="flex flex-col">
              <div className="text-xl font-light text-gray-900 dark:text-gray-100">@Taitan_Pascal</div>

              {/* Colorful click prompt */}
              <div className="text-base font-serif flex items-center mt-1">
                <div className="inline m-[-1px] text-purple-600 text-sm">C</div>
                <div className="inline m-[-1px] text-orange-600 text-sm">l</div>
                <div className="inline m-[-1px] text-yellow-600 text-sm">i</div>
                <div className="inline m-[-1px] text-green-600 text-sm">c</div>
                <div className="inline m-[-1px] text-blue-600 text-sm">k</div>
                <div className="inline text-lg ml-1">👇</div>
              </div>
            </div>
          </div>

          {/* Job descriptions */}
          <div className="text-gray-500 dark:text-gray-400 text-sm space-y-1 mb-3">
            <div className="jobs cursor-pointer">🌈 瓦梁湖生态观察小队副队长</div>
            <div className="jobs cursor-pointer">👨🏻‍💻 Software Engineer</div>
            <Link href="/photographer" className="jobs cursor-pointer">📸 Photographer</Link>
            <TotalViews />
          </div>
        </div>
      </div>
    </div>
  )
}
