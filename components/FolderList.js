import Link from "next/link"

const FolderOpenIcon = ({ className }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z" />
    </svg>
)

export default function FolderList({ folders }) {
    if (!folders || folders.length === 0) {
        return null
    }

    return (
        <div className="w-full mb-8 pt-6 lg:pt-20">
            <div className="max-w-7xl mx-auto px-8">
                <div className="flex flex-wrap gap-3 justify-start items-center">
                    {folders.map((folder) => (
                        <Link
                            key={folder.path}
                            href={folder.path}
                        >
                            <div className="group cursor-pointer inline-flex items-center space-x-3 px-5 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 ease-out">
                                <span className="text-xl text-black-800 group-hover:text-blue-600 transition-colors duration-300 flex items-center">
                                    <FolderOpenIcon />
                                </span>
                                <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300 whitespace-nowrap">
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
