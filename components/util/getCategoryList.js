import fs from 'fs'
import path from 'path'

export function getCategoryList() {
    const contentDir = path.join(process.cwd(), 'public/photography/content')
    
    if (!fs.existsSync(contentDir)) {
        return []
    }
    
    const categories = fs.readdirSync(contentDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .sort()
    
    return categories.map((category, index) => {
        // 首先尝试使用与分类名称对应的封面图片
        const namedCataImagePath = `/photography/cata/${category}.jpg`
        const namedCataExists = fs.existsSync(path.join(process.cwd(), 'public', namedCataImagePath))
        
        let coverImage
        if (namedCataExists) {
            // 如果存在对应名称的封面图片，使用它
            coverImage = namedCataImagePath
        } else {
            // 否则，尝试使用该分类文件夹中的第一张图片作为封面
            const categoryDir = path.join(contentDir, category)
            const images = fs.readdirSync(categoryDir)
                .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
                .sort()
            
            if (images.length > 0) {
                coverImage = `/photography/content/${category}/${images[0]}`
            } else {
                // 最后的fallback，使用按索引的图片（兼容旧格式）
                coverImage = `/photography/cata/${index}.jpg`
            }
        }
        
        return {
            index: index.toString(),
            title: category,
            url: `/photographer/${category.toLowerCase()}`,
            coverImage
        }
    })
}