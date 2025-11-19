import Link from "next/link"
import ShareLInk from "/components/ShareLInk"

export default function ProfileCard() {
    return (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-center p-4">
                <div className="w-full max-w-lg">
                    {/* Social media links */}
                    <div className="flex justify-center items-center space-x-4 mb-4">
                        <ShareLInk />
                    </div>

                    {/* Avatar and basic info */}
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="flex justify-center items-center rounded-full p-1 border-gray-400 border-dotted border-2 shadow-md">
                            <img src="/icon.jpeg" alt="" className="w-16 h-16 rounded-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                            <div className="text-xl font-light text-gray-900 dark:text-gray-100">@Taitan_Pascal</div>

                            {/* Colorful click prompt */}
                            <div className="text-base font-serif flex items-center mt-1">
                                <div className="inline m-[-1px] text-purple-600 text-sm">C</div>
                                <div className="inline m-[-1px] text-orange-600 text-sm">l</div>
                                <div className="inline m-[-1px] text-yellow-600 text-sm">i</div>
                                <div className="inline m-[-1px] text-green-600 text-sm">c</div>
                                <div className="inline m-[-1px] text-blue-600 text-sm">k</div>
                                <div className="inline text-lg ml-1">👇</div>
                            </div>
                        </div>
                    </div>

                    {/* Job descriptions */}
                    <div className="text-gray-500 dark:text-gray-400 text-sm space-y-1 mb-3">
                        <div className="jobs cursor-pointer">🌈 瓦梁湖生态观察小队副队长</div>
                        <div className="jobs cursor-pointer">👨🏻‍💻 Software Engineer</div>
                        <Link href="/photographer" className="jobs cursor-pointer">📸 Photographer</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
