import Link from "next/link"

export default function FolderList({ folders }) {
    if (!folders || folders.length === 0) {
        return null
    }

    return (
        <div className="w-full mb-8 pt-20">
            <div className="max-w-7xl mx-auto px-8">
                <div className="flex flex-wrap gap-3 justify-start items-center">
                    {folders.map((folder) => (
                        <Link
                            key={folder.path}
                            href={folder.path}
                        >
                            <div className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105  transition-all duration-200">
                                <span className="text-lg">📁</span>
                                <span className="text-base font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                    {folder.name}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
