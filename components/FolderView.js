import Link from "next/link"
import Breadcrumb from "/components/Breadcrumb"
import { Footer } from "/components/footer"

export default function FolderView({ folderPath, folderContents }) {
    return (
        <div className="flex-1 max-w-7xl mx-auto p-4">
            <div className="lg:max-w-6xl mx-auto mt-10">
                <Breadcrumb folderPath={folderPath} isNavbar={false} />
                <div className="flex flex-wrap gap-3">
                    {folderContents && folderContents.map((item) => (
                        <Link
                            key={item.path}
                            href={item.path}
                        >
                            <div className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 hover:-translate-y-1 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200">
                                {item.isFolder ? (
                                    <span className="text-lg">📁</span>
                                ) : (
                                    <span className="text-lg">📄</span>
                                )}
                                <span className="text-base font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                    {item.name}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
                <div className="pb-10 mt-10">
                    <Footer />
                </div>
            </div>
        </div>
    )
}
