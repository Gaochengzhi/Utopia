const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

export function SearchBox({}) {
  return (
    <>
      <div className="relative flex items-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 px-3 py-1.5">
        <SearchIcon />
        <input
          type="text"
          placeholder="command k to search"
          className="ml-2 bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 w-full"
          readOnly
        />
      </div>
    </>
  )
}
