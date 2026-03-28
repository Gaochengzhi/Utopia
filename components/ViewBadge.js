export default function ViewBadge({ views }) {
    if (views === null || views === undefined) {
        return null
    }

    return (
        <div className="absolute -top-3 -right-3 z-10">
            <div className="px-2 py-0.5 bg-white dark:bg-gray-700/80 border rounded-full">
                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
                    {views}
                </span>
            </div>
        </div>
    )
}
