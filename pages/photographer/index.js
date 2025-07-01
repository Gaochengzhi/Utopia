import { CataContainer } from "/components/photo/cataContainer"
import { Walls } from "/components/photo/Wall"
import { Banner } from "/components/photo/Banner"
import { Pnav } from "/components/photo/Pnav"
import { useEffect } from "react"
import { Footer } from "/components/footer"
import { formateTime } from "/components/util/treeSort"
import { readAllFile } from "/components/util/readAllfile"
import { getCategoryList } from "/components/util/getCategoryList"
import Cookies from "js-cookie"
export default function Index({ path, categories }) {
    useEffect(() => {
        Cookies.set("refreshedP", "true", { expires: 1 })
        if (!Cookies.get("refreshedP")) {
            localStorage.setItem("refreshedP", "true")
            setTimeout(() => window.location.reload(), 3000)
        }
    }, [])

    return (
        <div className="bg-black min-h-screen">
            <Pnav select="index" categories={categories} />

            {/* Banner section - 限制宽度用于可读性 */}
            <div className="max-w-7xl mx-auto px-4">
                <Banner />
            </div>

            {/* 全宽度内容区域 */}
            <div className="w-full">
                {/* Latest Work 分割线 */}
                <div>
                    <div className="flex flex-col justify-center text-lg font-serif p-4">
                        <Footer />
                        <div className="text-white m-3 font-serif text-lg m-auto">Latest Work</div>
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
                </div>

                {/* 分类容器 - 限制宽度保持可读性 */}
                <div className="w-full flex justify-center">
                    <div className="max-w-6xl w-full">
                        <CataContainer categories={categories} />
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

    // 动态获取分类列表
    const categories = getCategoryList()

    return {
        props: {
            path: picLists,
            categories,
        },
        revalidate: 1,
    }
}
