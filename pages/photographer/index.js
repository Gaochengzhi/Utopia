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
        <div className="bg-black">
            <Pnav select="index" />
            <div className="max-w-5xl mx-auto">
                <Banner />
                {/* Divider */}
                <div className="w-full pt-3 flex flex-col justify-center items-center">
                    <Footer />
                    <div className="text-xl flex flex-col border-t-2 p-3 w-full mx-6  border-dashed justify-center -mt-7 items-center max-w-xl">
                        <div className="font-serif text-white text-lg ">Latest Work</div>
                        <div className="text-white font-serif text-base m-2">
                            {formateTime(path[0].time)}
                        </div>
                    </div>
                    <Walls path={path} />
                    <div className="h-4"></div>
                    <Footer />
                    <div className="text-xl flex flex-col border-t-2 p-3 w-full mx-6  border-dashed justify-center -mt-7 items-center max-w-xl">
                        <div className="text-white m-3 font-serif text-lg">More...</div>
                    </div>
                    <div className="flex flex-col justify-center items-center text-white w-full">
                        <CataContainer />
                    </div>
                    <div className="text-white mt-9 w-full">
                        <div className="flex justify-center text-lg font-serif mt-6 p-4 ">
                            End
                        </div>
                        <Footer />
                        <div className="text-lg font-thin font-serif flex flex-col h-56"></div>
                    </div>
                </div>
                {/* latest work */}
            </div>
        </div>
    )
}

export const getStaticProps = async () => {
    let infoArray = await readAllFile("public/photography", (i) =>
        i.replace("public", "")
    )
    let picLists = infoArray.SortedInfoArray.slice(0, 9)

    return {
        props: {
            path: picLists,
        },
        revalidate: 1,
    }
}
