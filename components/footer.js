import React from "react"
import Image from "next/image"
export function Footer({}) {
  return (
    <>
      <div className="flex flex-col justify-center items-center text-md text-ink2 px-6">
        <div className="relative flex items-center w-full my-4">
          <div className="flex-grow border-t-[3px] border-double border-ink/50"></div>
          <div className="flex-shrink-0 mx-4">
            <div className="max-w-xs svg flex justify-center items-center opacity-70">
              <Image src="/header.svg" alt="" width={180} height={36} className="dark:invert" />
            </div>
          </div>
          <div className="flex-grow border-t-[3px] border-double border-ink/50"></div>
        </div>
        <div className="font-mono text-[0.65rem] tracking-[0.35em] text-ink2/70 pb-2">
          UTOPIA PRESS
        </div>
      </div>
      <div className="flex justify-center items-center text-2xl space-x-3 m-2 p-2">
        {/* <ShareLInk /> */}
      </div>
    </>
  )
}
