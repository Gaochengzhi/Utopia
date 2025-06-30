import { useEffect } from "react"
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
        <div className="bg-white">
            {/* insert a picture /fake.jpg  */}
            <img src="/fake.jpg" alt="fake" className="w-full" />

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
