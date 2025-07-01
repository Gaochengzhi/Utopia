import { CataContainer } from "/components/photo/cataContainer"
import { Walls } from "/components/photo/Wall"
import { Banner } from "/components/photo/Banner"
import { Pnav } from "/components/photo/Pnav"
// import { obseverImg } from "/components/util/handleErrorPic"
import { useEffect } from "react"
import { Footer } from "/components/footer"
import { formateTime } from "/components/util/treeSort"
import { readAllFile } from "/components/util/readAllfile"
import Cookies from "js-cookie"
export default function Index({ path }) {
    useEffect(() => {
        Cookies.set("refreshedP", "true", { expires: 1 })
        if (!Cookies.get("refreshedP")) {
            localStorage.setItem("refreshedP", "true")
            setTimeout(() => window.location.reload(), 3000)
        }
    }, [])

    return (
        <div className="bg-black min-h-screen">
            <Pnav select="index" />
            
            {/* Banner section - 限制宽度用于可读性 */}
            <div className="max-w-7xl mx-auto px-4">
                <Banner />
            </div>
            
            {/* 全宽度内容区域 */}
            <div className="w-full">
                {/* Latest Work 分割线 */}
                <div className="w-full pt-8 flex flex-col justify-center items-center">
                    <Footer />
                    <div className="text-xl flex flex-col border-t-2 p-3 w-full mx-6 border-dashed justify-center -mt-7 items-center max-w-xl">
                        <div className="font-serif text-white text-lg">Latest Work</div>
                        <div className="text-white font-serif text-base m-2">
                            {formateTime(path[0].time)}
                        </div>
                    </div>
                </div>
                
                {/* 图片墙 - 全宽度显示 */}
                <div className="w-full px-4 lg:px-8 xl:px-12">
                    <Walls path={path} />
                </div>
                
                {/* More... 分割线 */}
                <div className="w-full pt-8 flex flex-col justify-center items-center">
                    <div className="h-4"></div>
                    <Footer />
                    <div className="text-xl flex flex-col border-t-2 p-3 w-full mx-6 border-dashed justify-center -mt-7 items-center max-w-xl">
                        <div className="text-white m-3 font-serif text-lg">More...</div>
                    </div>
                </div>
                
                {/* 分类容器 - 限制宽度保持可读性 */}
                <div className="w-full flex justify-center">
                    <div className="max-w-6xl w-full">
                        <CataContainer />
                    </div>
                </div>
                
                {/* 页脚区域 */}
                <div className="text-white mt-9 w-full">
                    <div className="flex justify-center text-lg font-serif mt-6 p-4">
                        End
                    </div>
                    <Footer />
                    <div className="text-lg font-thin font-serif flex flex-col h-56"></div>
                </div>
            </div>
        </div>
    )
}

export const getStaticProps = async () => {
    let infoArray = await readAllFile("public/photography", (i) =>
        i.replace("public", "")
    )
    let picLists = infoArray.SortedInfoArray.slice(0, 50)

    return {
        props: {
            path: picLists,
        },
        revalidate: 1,
    }
}
