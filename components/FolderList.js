import Link from "next/link"
import { FolderOpenOutlined } from '@ant-design/icons'

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
                            <div className="group cursor-pointer inline-flex items-center space-x-3 px-5 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 ease-out">
                                <span className="text-xl text-black-800 group-hover:text-blue-600 transition-colors duration-300 flex items-center">
                                    <FolderOpenOutlined />
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
