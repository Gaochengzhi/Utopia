import { Footer } from "/components/footer"
import { Pnav } from "/components/photo/Pnav"
import { Walls } from "/components/photo/Wall"
import { useEffect, useState } from "react"
import { firstUpperCase } from "/components/util/treeSort"
import { getCfEnv } from "/lib/cfContext"

// Photography images use /photography/content/... paths with rewrites
// Thumbnails use /photography/thumb/content/... and full uses /photography/full/content/...

export default function Wall({ title, categories }) {
    const [paths, setPaths] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const loadImages = async () => {
        try {
            setLoading(true)
            setError(null)

            const actualTitle = firstUpperCase(title)
            const response = await fetch(`/api/photography/${actualTitle}`)
            const data = await response.json()

            if (data.success && data.images) {
                // Keep /photography/content/... paths as-is
                // Rewrite rules handle serving from R2/local
                setPaths(data.images)
            } else {
                setError(data.error || 'Failed to load images')
            }
        } catch (err) {
            console.error('Error loading images:', err)
            setError('Failed to load images')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (title) {
            loadImages()
        }
    }, [title])

    if (loading) {
        return (
            <div className="bg-black min-h-screen flex items-center justify-center">
                <div className="text-white text-xl">Loading images...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-black min-h-screen flex items-center justify-center">
                <div className="text-red-400 text-xl">Error: {error}</div>
            </div>
        )
    }

    return (
        <div className="bg-black">
            <Pnav select={title} categories={categories} />
            <div className="w-full px-4">
                {paths && paths.length > 0 && (
                    <img
                        src={paths[0].path.replace('/photography/content/', '/photography/full/content/')}
                        alt=""
                        className="md:max-h-[60vh] max-h-[40vh]  w-[97%] object-cover mx-auto"
                    />
                )}
                <div className=" text-white p-3 text-6xl">{firstUpperCase(title)}</div>
                <div></div>
                <Walls path={paths} scrollDirection="vertical" />
                <div className="text-lg font-thin font-serif flex justify-center h-16 m-5 text-white border-b-2 border-gray-400 border-dashed ">
                    End
                </div>
                <Footer />
                <div className="text-lg font-thin font-serif flex flex-col h-5"></div>
            </div>
        </div>
    )
}

export async function getStaticPaths() {
    let categoryPaths = []

    try {
        const env = await getCfEnv()
        const db = env?.DB

        if (db) {
            const { results } = await db.prepare(
                'SELECT DISTINCT category FROM photos ORDER BY category'
            ).all()

            categoryPaths = (results || []).map(row => ({
                params: { slug: row.category.toLowerCase() }
            }))
        }
    } catch (e) {
        console.error('getStaticPaths failed:', e.message)
    }

    return {
        paths: categoryPaths,
        fallback: 'blocking',
    }
}

export async function getStaticProps({ params: { slug } }) {
    let categories = []

    try {
        const env = await getCfEnv()
        const db = env?.DB

        if (db) {
            const { results: catRows } = await db.prepare(
                'SELECT DISTINCT category FROM photos ORDER BY category'
            ).all()

            categories = (catRows || []).map((row, index) => ({
                index: index.toString(),
                title: row.category.toLowerCase(),
                url: `/photographer/${row.category.toLowerCase()}`,
                coverImage: `/photography/cata/${row.category}.jpg`,
            }))

            // Verify this category exists
            const exists = categories.find(c => c.title === slug.toLowerCase())
            if (!exists) return { notFound: true }
        }
    } catch (e) {
        console.error('getStaticProps failed:', e.message)
    }

    return {
        props: {
            title: slug,
            categories,
        },
    }
}
