import ShareLInk from "/components/ShareLInk"
import React from "react"
export function Footer({}) {
  return (
    <>
      <div className="flex flex-col justify-center items-center text-md text-gray-400 dark:text-gray-500 px-6">
        <div className="relative flex items-center w-full my-4">
          <div className="flex-grow border-t border-gray-200 dark:border-gray-600"></div>
          <div className="flex-shrink-0 mx-4">
            <div className="max-w-xs svg flex justify-center items-center">
              <img src="/header.svg" alt="" className="dark:invert" />
            </div>
          </div>
          <div className="flex-grow border-t border-gray-200 dark:border-gray-600"></div>
        </div>
      </div>
      <div className="flex justify-center items-center text-2xl space-x-3 m-2 p-2">
        {/* <ShareLInk /> */}
      </div>
    </>
  )
}
