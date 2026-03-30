import { Footer } from "/components/footer"
import { Pnav } from "/components/photo/Pnav"
import { Walls } from "/components/photo/Wall"
import { useCallback, useEffect, useState } from "react"
import { firstUpperCase } from "/components/util/treeSort"
import { getCfEnv } from "/lib/cfContext"
import { getCdnFullUrl, handleCdnError } from "/lib/cdnUrl"

// Photography images use /photography/content/... paths with rewrites
// Thumbnails use /photography/thumb/... and full uses /photography/full/...

function normalizePhotoKey(rawPath, category, filename) {
    const fallback = category && filename ? `photography/content/${category}/${filename}` : null
    if (!rawPath) return fallback

    let key = String(rawPath).trim()
    if (!key) return fallback

    key = key.replace(/^https?:\/\/(?:www\.)?gaochengzhi\.com\//i, '')
    key = key.replace(/^\/+/, '')

    if (key.startsWith('photography/')) return key
    if (key.startsWith('content/')) return `photography/${key}`
    if (key.startsWith('.pic/')) return key
    if (key.startsWith('api/images/')) return `.pic/${key.slice('api/images/'.length)}`

    if (category) {
        if (key.includes('/')) return `photography/content/${key}`
        return `photography/content/${category}/${key}`
    }

    return fallback || key
}

function toPublicPath(key) {
    if (!key) return null
    return `/${String(key).replace(/^\/+/, '')}`
}

function normalizeCategoryName(value) {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed || null
}

function findManualCoverPath(category) {
    try {
        const fs = require('fs')
        const path = require('path')
        const base = path.join(process.cwd(), 'public', 'photography', 'cata')
        const exts = ['jpg', 'jpeg', 'webp', 'png']

        for (const ext of exts) {
            const filePath = path.join(base, `${category}.${ext}`)
            if (fs.existsSync(filePath)) {
                return `/photography/cata/${category}.${ext}`
            }
        }
    } catch (e) { }

    return null
}

export default function Wall({ title, categories: initialCategories, initialImages }) {
    const [paths, setPaths] = useState(initialImages || [])
    const [loading, setLoading] = useState(!initialImages || initialImages.length === 0)
    const [error, setError] = useState(null)
    const [categories, setCategories] = useState(initialCategories || [])

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
                        crossOrigin="anonymous"
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
            const { results: catRows } = await db.prepare(`
                SELECT c.category,
                       (
                           SELECT p.path
                           FROM photos p
                           WHERE p.category = c.category
                           ORDER BY p.created_at DESC
                           LIMIT 1
                       ) AS first_path,
                       (
                           SELECT p.filename
                           FROM photos p
                           WHERE p.category = c.category
                           ORDER BY p.created_at DESC
                           LIMIT 1
                       ) AS first_filename
                FROM (
                    SELECT DISTINCT category
                    FROM photos
                    WHERE category IS NOT NULL AND TRIM(category) != ''
                ) c
                ORDER BY c.category
            `).all()

            categories = (catRows || []).map((row, index) => {
                const categoryName = normalizeCategoryName(row.category)
                if (!categoryName) return null

                const manualCover = findManualCoverPath(categoryName)
                const fallbackCover = toPublicPath(normalizePhotoKey(row.first_path, categoryName, row.first_filename))
                const resolvedCover = manualCover || fallbackCover || `/photography/cata/${categoryName}.jpg`

                return {
                    index: index.toString(),
                    title: categoryName.toLowerCase(),
                    url: `/photographer/${categoryName.toLowerCase()}`,
                    coverImage: resolvedCover,
                    fallbackCover: fallbackCover || resolvedCover,
                }
            }).filter(Boolean)

            // Verify this category exists
            const exists = categories.find(c => c.title === slug.toLowerCase())
            if (!exists) return { notFound: true }

            // Pre-fetch images for this category (SSG — no client waterfall!)
            const { results: photoRows } = await db.prepare(`
                SELECT * FROM photos
                WHERE LOWER(category) = LOWER(?)
                ORDER BY sort_order, filename
            `).bind(slug).all()

            initialImages = (photoRows || []).map(row => ({
                path: toPublicPath(normalizePhotoKey(row.path, row.category, row.filename)),
                title: row.filename,
                isLeaf: true,
                type: 'file',
                key: String(Math.floor(Math.random() * 9e9)),
                time: row.created_at,
            }))
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
