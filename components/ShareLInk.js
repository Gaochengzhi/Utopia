import { useState, useEffect } from "react"

// Inline SVG icons to replace @ant-design/icons
const TwitterIcon = ({ onClick, className }) => (
    <svg onClick={onClick} className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
    </svg>
)

const GithubIcon = ({ onClick, className }) => (
    <svg onClick={onClick} className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
)

const WeiboIcon = ({ onClick, className }) => (
    <svg onClick={onClick} className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M20.194 14.197c0 3.362-4.53 6.424-9.926 6.424C5.318 20.62 1 18.189 1 14.534c0-1.947 1.18-4.087 3.24-6.088 2.832-2.746 6.229-4.033 7.858-2.448.498.482.723 1.122.719 1.858 1.975-.576 3.65-.404 4.483.752.449.623.532 1.38.326 2.207 1.511.61 2.568 1.77 2.568 3.382zm-4.44-2.07c-.386-.41-.4-.92-.198-1.41.208-.508.213-.812.12-.94-.264-.368-1.533-.363-3.194.311a2.043 2.043 0 0 1-.509.14c-.344.046-.671.001-.983-.265-.419-.359-.474-.855-.322-1.316.215-.67.18-1.076.037-1.215-.186-.18-.777-.191-1.659.143-1.069.405-2.298 1.224-3.414 2.306C3.925 11.54 3 13.218 3 14.534c0 2.242 3.276 4.087 7.268 4.087 4.42 0 7.926-2.37 7.926-4.424 0-.738-.637-1.339-1.673-1.652-.394-.113-.536-.171-.767-.417zm7.054-1.617a1 1 0 0 1-1.936-.502 4 4 0 0 0-4.693-4.924 1 1 0 1 1-.407-1.958 6 6 0 0 1 7.036 7.384z"/>
    </svg>
)

const WechatIcon = ({ onClick, className }) => (
    <svg onClick={onClick} className={className} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05a6.092 6.092 0 0 1-.253-1.72c0-3.571 3.354-6.467 7.49-6.467.254 0 .501.023.748.043C16.697 4.862 13.074 2.188 8.691 2.188zm-2.17 4.1c.555 0 1.003.448 1.003 1.003 0 .556-.449 1.004-1.003 1.004-.556 0-1.004-.448-1.004-1.004 0-.555.449-1.003 1.004-1.003zm5.44 0c.555 0 1.003.448 1.003 1.003 0 .556-.448 1.004-1.003 1.004-.556 0-1.004-.448-1.004-1.004 0-.555.448-1.003 1.004-1.003zM15.34 9.47c-3.747 0-6.787 2.624-6.787 5.86 0 3.237 3.04 5.86 6.787 5.86a8.46 8.46 0 0 0 2.347-.334.72.72 0 0 1 .595.082l1.578.923a.27.27 0 0 0 .14.045.244.244 0 0 0 .24-.244c0-.06-.023-.118-.04-.176l-.323-1.228a.49.49 0 0 1 .176-.552C21.573 18.691 22.5 17.013 22.5 15.33c0-3.236-3.04-5.86-6.787-5.86h-.373zm-2.17 3.167c.46 0 .833.373.833.834 0 .46-.373.834-.833.834a.835.835 0 0 1-.834-.834c0-.46.373-.834.834-.834zm4.5 0c.46 0 .833.373.833.834 0 .46-.372.834-.833.834a.835.835 0 0 1-.834-.834c0-.46.374-.834.834-.834z" />
    </svg>
)

// Social links constants (previously from config.local.js)
const SOCIAL_LINKS = {
    twitter: 'https://x.com/taitan_pascal',
    github: 'https://github.com/Gaochengzhi',
    weibo: 'https://m.weibo.cn/profile/5637399935',
    douban: 'https://www.douban.com/people/121879545'
}

export default function ShareLInk() {
    const [isModalVisible, setIsModalVisible] = useState(false)

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isModalVisible) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isModalVisible])

    const handleOk = () => {
        setIsModalVisible(false)
    }

    const handleCancel = () => {
        setIsModalVisible(false)
    }

    function showModal() {
        setIsModalVisible(true)
    }

    const goToUrl = (index) => {
        if (index === 3) {
            showModal()
            return
        }
        const urlList = [
            SOCIAL_LINKS.twitter,
            SOCIAL_LINKS.github,
            SOCIAL_LINKS.weibo,
            "#",
            SOCIAL_LINKS.douban,
        ]
        window.open(urlList[index], "_blank")
    }

    return (
        <>
            {" "}
            <div className="clickable flex justify-center items-center text-2xl cursor-pointer">
                <TwitterIcon onClick={() => goToUrl(0)} className="hover:text-blue-400 transition-colors" />
            </div>
            <div className="clickable flex justify-center items-center text-2xl cursor-pointer">
                <GithubIcon onClick={() => goToUrl(1)} className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
            </div>
            <div className="clickable flex justify-center items-center text-2xl cursor-pointer">
                <WeiboIcon onClick={() => goToUrl(2)} className="hover:text-red-500 transition-colors" />
            </div>
            <div className="clickable flex justify-center items-center text-2xl cursor-pointer">
                <WechatIcon onClick={() => goToUrl(3)} className="hover:text-green-500 transition-colors" />
            </div>

            {/* Custom Modal replacing antd Modal */}
            {isModalVisible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleCancel}>
                    <div className="fixed inset-0 bg-black/50" />
                    <div
                        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-[60%] mx-4 p-6 z-10"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">添加微信</h3>
                            <button
                                onClick={handleCancel}
                                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <img src="/me.jpeg" alt="" className="w-full rounded" />
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={handleOk}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                            >
                                确定
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
