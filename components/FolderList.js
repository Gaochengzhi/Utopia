import Link from "next/link"

export default function FolderList({ folders }) {
    if (!folders || folders.length === 0) {
        return null
    }

    return (
        <div className="w-full mb-8 pt-6 lg:pt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <div className="tk-meta mb-3 !text-[0.68rem]">
                    <span>INDEX</span>
                    <span className="tk-leader" />
                    <span>共 {folders.length} 类</span>
                </div>
                <div className="flex flex-wrap gap-2.5 justify-start items-center">
                    {folders.map((folder) => (
                        <Link key={folder.path} href={folder.path}>
                            <span className="tk-tab cursor-pointer">
                                {folder.name}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
