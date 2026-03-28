import { cataList } from "/components/photo/cataList"
import { getCategoryList } from "/components/util/getCategoryList"
import { Footer } from "/components/footer"
import { Pnav } from "/components/photo/Pnav"
import { Walls } from "/components/photo/Wall"
import { useEffect, useState } from "react"
import { firstUpperCase } from "/components/util/treeSort"

const IMAGE_SERVER_URL = '/.pic/'

export default function Wall({ title, categories }) {
    const [paths, setPaths] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // 动态获取最新图片列表
    const loadImages = async () => {
        try {
            setLoading(true)
            setError(null)

            // 将slug映射到实际的目录名
            const actualTitle = firstUpperCase(title)
            const response = await fetch(`/api/photography/${actualTitle}`)
            const data = await response.json()

            if (data.success && data.images) {
                // 处理图片路径，根据环境配置替换
                const processedImages = data.images.map(item => ({
                    ...item,
                    path: item.path.replace(/^\/photography\//, IMAGE_SERVER_URL)
                }))
                setPaths(processedImages)
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
        // 加载图片
        if (title) {
            loadImages()
        }
    }, [title])
    // 加载状态
    if (loading) {
        return (
            <div className="bg-black min-h-screen flex items-center justify-center">
                <div className="text-white text-xl">Loading images...</div>
            </div>
        )
    }

    // 错误状态
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
                        src={paths[0].path.replace(IMAGE_SERVER_URL, IMAGE_SERVER_URL + 'full/')}
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
    // 使用动态分类生成路径
    const categories = getCategoryList()
    const categoryData = categories.length > 0 ? categories : cataList

    return {
        paths: categoryData.map((i) => ({
            params: {
                slug: i.title.toLowerCase(),
            },
        })),
        fallback: 'blocking', // 支持新增分类的动态生成
    }
}

export async function getStaticProps({ params: { slug } }) {
    // 获取动态分类列表
    const categories = getCategoryList()

    // 验证分类是否存在
    const categoryExists = categories.find(cat =>
        cat.title.toLowerCase() === slug.toLowerCase()
    )

    if (!categoryExists) {
        return {
            notFound: true
        }
    }

    return {
        props: {
            title: slug,
            categories,
        }, // 图片列表通过客户端动态加载，不在这里返回
        revalidate: 1, // 1秒，快速响应新文件夹
    }
}
