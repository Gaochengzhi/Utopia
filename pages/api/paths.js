import { readAllFile } from "../../components/util/readAllfile"

export default async function handler(req, res) {
    try {
        const infoArray = await readAllFile("post", (i) => i)
        
        res.status(200).json({
            paths: infoArray.paths
        })
    } catch (error) {
        console.error('API Error:', error)
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to fetch paths'
        })
    }
}