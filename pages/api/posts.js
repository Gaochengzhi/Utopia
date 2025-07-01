import fs from "fs"
import matter from "gray-matter"
import { readAllFile } from "../../components/util/readAllfile"
const config = require('../../config.local.js')

export default async function handler(req, res) {
    try {
        const { page = 1, limit = 10 } = req.query
        const pageNum = parseInt(page)
        const limitNum = parseInt(limit)
        
        // 参数验证
        if (pageNum < 1 || limitNum < 1 || limitNum > 50) {
            return res.status(400).json({ 
                error: 'Invalid parameters', 
                message: 'page must be >= 1, limit must be between 1 and 50' 
            })
        }

        let infoArray = await readAllFile("post", (i) => i)
        
        // 按时间排序，最新的在前
        const sortedPosts = infoArray.SortedInfoArray.sort((a, b) => 
            new Date(b.time) - new Date(a.time)
        )

        // 计算分页
        const startIndex = (pageNum - 1) * limitNum
        const endIndex = startIndex + limitNum
        const paginatedPosts = sortedPosts.slice(startIndex, endIndex)

        // 处理文章内容
        const posts = paginatedPosts.map((o) => {
            const fullpath = o.path
            const rawMarkdown = fs
                .readFileSync(fullpath)
                .toString()
                .replace(
                    new RegExp(
                        "(file://)?/Users/kounarushi/mycode/web-blog/public/.pic/",
                        "gm"
                    ),
                    config.IMAGE_SERVER_URL
                )
            const markDownWithoutYarm = matter(rawMarkdown)
            
            // 增加预览内容长度以适应卡片显示
            o.content =
                markDownWithoutYarm.content.length > 1500
                    ? markDownWithoutYarm.content.slice(0, 1500) + "..."
                    : markDownWithoutYarm.content
            return o
        })

        // 返回分页信息
        const totalPosts = sortedPosts.length
        const totalPages = Math.ceil(totalPosts / limitNum)
        const hasNextPage = pageNum < totalPages
        const hasPrevPage = pageNum > 1

        res.status(200).json({
            posts,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalPosts,
                hasNextPage,
                hasPrevPage,
                limit: limitNum
            }
        })

    } catch (error) {
        console.error('API Error:', error)
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to fetch posts'
        })
    }
}