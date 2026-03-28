import { Footer } from "./footer"
import { Toc } from "/components/Toc"
import { useEffect } from "react"

export function DrawerView({ onClose, visible, state }) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [visible])

  return (
    <>
      {/* Backdrop */}
      {visible && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[299px] bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">More</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Close drawer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col justify-between p-6 h-[calc(100%-4rem)]">
          {state == "index" ? (
            <div className="h-full flex justify-center items-center text-gray-400">
              Ecce homo
            </div>
          ) : (
            <div className="border-y-2 border-dashed my-6 h-[75vh] overflow-auto">
              <Toc />
            </div>
          )}
          <div className="-mb-8">
            <Footer></Footer>
          </div>
        </div>
      </div>
    </>
  )
}
