import { Footer } from "/components/footer"
import { Pnav } from "/components/photo/Pnav"
import { Walls } from "/components/photo/Wall"
import { useCallback, useEffect, useState } from "react"
import { firstUpperCase } from "/components/util/treeSort"
import { getCfEnv } from "/lib/cfContext"
import { getCdnFullUrl, handleCdnError } from "/lib/cdnUrl"
import { normalizeCategoryName } from "/lib/photoUtils"
import { getPhotoCategories, getPhotosByCategory } from "/lib/data/photos"

export default function Wall({ title, categories: initialCategories, initialImages }) {
    const [paths, setPaths] = useState(initialImages || [])
    const [loading, setLoading] = useState(!initialImages || initialImages.length === 0)
    const [error, setError] = useState(null)
    const [categories, setCategories] = useState(initialCategories || [])

    // Sync state when navigating between category pages (Next.js reuses the component)
    useEffect(() => {
        if (initialImages && initialImages.length > 0) {
            setPaths(initialImages)
            setLoading(false)
            setError(null)
        } else {
            // No SSG data — trigger client-side fetch
            setPaths([])
            setLoading(true)
        }
    }, [title]) // title changes = new category page

    // Sync categories on navigation
    useEffect(() => {
        if (initialCategories && initialCategories.length > 0) {
            setCategories(initialCategories)
        }
    }, [title])

    // Fetch categories client-side if getStaticProps returned empty (D1 unavailable at build)
    useEffect(() => {
        if (categories.length > 0) return
        fetch('/api/photography/categories')
            .then(r => r.json())
            .then(data => {
                if (data.categories) setCategories(data.categories)
            })
            .catch(err => console.error('Failed to fetch categories:', err))
    }, [categories.length])

    const loadImages = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const actualTitle = firstUpperCase(title)
            const response = await fetch(`/api/photography/${actualTitle}`)
            const data = await response.json()

            if (data.success && data.images) {
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
    }, [title])

    useEffect(() => {
        if (title && paths.length === 0) {
            loadImages()
        }
    }, [title, loadImages, paths.length])

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
                        src={getCdnFullUrl(paths[0].path)}
                        alt=""
                        loading="eager"
                        decoding="async"
                        fetchpriority="high"
                        className="md:max-h-[60vh] max-h-[40vh]  w-[97%] object-cover mx-auto"
                        onError={handleCdnError}
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
            const { results } = await db.prepare(`
                SELECT DISTINCT category
                FROM photos
                WHERE category IS NOT NULL AND TRIM(category) != ''
                ORDER BY category
            `).all()

            categoryPaths = (results || [])
                .map(row => normalizeCategoryName(row.category))
                .filter(Boolean)
                .map(category => ({
                    params: { slug: category.toLowerCase() }
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
    let initialImages = []

    try {
        const env = await getCfEnv()
        const db = env?.DB

        if (db) {
            categories = await getPhotoCategories(db)

            // Verify this category exists
            const exists = categories.find(c => c.title === slug.toLowerCase())
            if (!exists) return { notFound: true }

            // Pre-fetch images for this category (SSG — no client waterfall!)
            const { images } = await getPhotosByCategory(db, slug)
            initialImages = images
        }
    } catch (e) {
        console.error('getStaticProps failed:', e.message)
    }

    return {
        props: {
            title: slug,
            categories,
            initialImages,
        },
    }
}
