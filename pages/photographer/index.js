import { CataContainer } from "/components/photo/cataContainer"
import { Walls } from "/components/photo/Wall"
import { Banner } from "/components/photo/Banner"
import { Pnav } from "/components/photo/Pnav"
import { Footer } from "/components/footer"
import { getCfEnv } from "/lib/cfContext"
import { useState, useEffect } from "react"

export default function Index({ path: initialPath, categories: initialCategories }) {
    const [path, setPath] = useState(initialPath || [])
    const [categories, setCategories] = useState(initialCategories || [])
    const [loading, setLoading] = useState(!initialPath || initialPath.length === 0)

    // Client-side fallback: if getStaticProps returned empty data
    // (happens when D1 is not available during build), fetch via API
    useEffect(() => {
        if (path.length > 0 && categories.length > 0) return

        const fetchData = async () => {
            try {
                setLoading(true)

                // Fetch photos
                const photosRes = await fetch('/api/photography/latest')
                if (photosRes.ok) {
                    const photosData = await photosRes.json()
                    if (photosData.images) {
                        setPath(photosData.images)
                    }
                }

                // Fetch categories
                const catsRes = await fetch('/api/photography/categories')
                if (catsRes.ok) {
                    const catsData = await catsRes.json()
                    if (catsData.categories) {
                        setCategories(catsData.categories)
                    }
                }
            } catch (err) {
                console.error('Failed to fetch photography data:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
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
                <div className="w-full  xl:px-12">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
                        </div>
                    ) : path.length > 0 ? (
                        <Walls path={path} />
                    ) : (
                        <div className="text-gray-500 text-center py-20">No photos available</div>
                    )}
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
    let picLists = []
    let categories = []

    try {
        const env = await getCfEnv()
        const db = env?.DB

        if (db) {
            // Get latest 50 photos
            const { results: photos } = await db.prepare(`
                SELECT * FROM photos ORDER BY created_at DESC LIMIT 50
            `).all()

            picLists = (photos || []).map(row => ({
                path: '/' + row.path,
                title: row.filename,
                isLeaf: true,
                type: 'file',
                key: String(Math.floor(Math.random() * 9e9)),
                time: row.created_at,
            }))

            // Get categories
            const { results: catRows } = await db.prepare(`
                SELECT DISTINCT category FROM photos ORDER BY category
            `).all()

            categories = (catRows || []).map((row, index) => ({
                index: index.toString(),
                title: row.category.toLowerCase(),
                url: `/photographer/${row.category.toLowerCase()}`,
                coverImage: `/photography/cata/${row.category}.jpg`,
            }))
        }
    } catch (e) {
        console.error('photographer getStaticProps failed:', e.message)
    }

    return {
        props: {
            path: picLists,
            categories,
        },
    }
}
