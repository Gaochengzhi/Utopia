import Link from "next/link"

export default function Breadcrumb({ folderPath, isNavbar = false }) {
  if (!folderPath) return null

  const segments = folderPath.split('/').filter(s => s !== 'post')

  return (
    <div className={`flex items-center ${isNavbar ? 'space-x-2' : 'space-x-2 mb-4'}`}>
      <Link href="/">
        <a className={`text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors ${isNavbar ? 'text-2xl' : 'text-3xl font-bold'}`}>
          {isNavbar ? 'Utopi' : 'Utopi'}
          <span className={`font-extrabold font-sans ${isNavbar ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'}`}>
            a
          </span>
        </a>
      </Link>

      {segments.length > 0 && (
        <>
          <span className="text-gray-400 dark:text-gray-600">·</span>
          <Link href="/post">
            <a className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors text-xl">
              ☰
            </a>
          </Link>
        </>
      )}

      {segments.map((segment, index, arr) => {
        const path = '/post/' + arr.slice(0, index + 1).join('/')
        const isLast = index === arr.length - 1
        return (
          <div key={index} className="flex items-center space-x-2">
            <span className="text-gray-400 dark:text-gray-600">·</span>
            {isLast ? (
              <span className={`text-gray-900 dark:text-gray-100 font-bold ${isNavbar ? 'text-lg' : 'text-2xl'}`}>
                {segment}
              </span>
            ) : (
              <Link href={path}>
                <a className={`text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors ${isNavbar ? 'text-lg' : 'text-2xl'}`}>
                  {segment}
                </a>
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
