import { useEffect } from "react"
import Cookies from "js-cookie"
import Image from "next/image"

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
            <Image src="/fake.jpg" alt="fake" width={1920} height={1080} className="w-full h-auto" />
        </div>
    )
}

// Simplified: removed useless readAllFile call (path prop was never used in component)
export const getStaticProps = async () => {
    return {
        props: {
            path: [],
        },
    }
}
