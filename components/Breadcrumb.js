import Link from "next/link"

export default function Breadcrumb({ folderPath, isNavbar = false }) {
  if (!folderPath) return null

  const segments = folderPath.split('/').filter(s => s !== 'post')

  return (
    <div className={`flex items-center min-w-0 ${isNavbar ? 'space-x-2' : 'space-x-2 mb-4'}`}>
      <Link href="/" className={`text-ink hover:text-accent transition-colors font-bold tracking-wide ${isNavbar ? 'text-2xl' : 'text-3xl'}`}>
          Utopi
          <span className="font-extrabold text-accent">
            a
          </span>
      </Link>

      {segments.map((segment, index, arr) => {
        const path = '/post/' + arr.slice(0, index + 1).join('/')
        const isLast = index === arr.length - 1
        return (
          <div key={index} className="flex items-center space-x-2 min-w-0">
            <span className="text-rule font-mono">/</span>
            {isLast ? (
              <span className={`text-ink font-bold truncate ${isNavbar ? 'text-lg' : 'text-2xl'}`}>
                {segment}
              </span>
            ) : (
              <Link href={path} className={`text-ink2 hover:text-ink transition-colors truncate ${isNavbar ? 'text-lg' : 'text-2xl'}`}>
                  {segment}
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
