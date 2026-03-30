import { useEffect } from "react"
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

// Simplified: removed useless readAllFile call (path prop was never used in component)
export const getStaticProps = async () => {
    return {
        props: {
            path: [],
        },
    }
}
