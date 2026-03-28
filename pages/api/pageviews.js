import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'public', 'pageviews.json')

// Ensure public directory exists
function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Read pageviews data
function readPageviews() {
  ensureDataDir()
  if (!fs.existsSync(DATA_FILE)) {
    return { total: 0 }
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    // Ensure total field exists
    if (!parsed.total) {
      parsed.total = 0
    }
    return parsed
  } catch (err) {
    console.error('Error reading pageviews:', err)
    return { total: 0 }
  }
}

// Write pageviews data
function writePageviews(data) {
  ensureDataDir()
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('Error writing pageviews:', err)
  }
}

// Calculate total views from all articles
function calculateTotal(pageviews) {
  let total = 0
  for (const key in pageviews) {
    if (key !== 'total' && typeof pageviews[key] === 'number') {
      total += pageviews[key]
    }
  }
  return total
}

export default function handler(req, res) {
  const { slug, type, slugs } = req.query

  const pageviews = readPageviews()

  if (req.method === 'GET') {
    // Get total views
    if (type === 'total') {
      const total = calculateTotal(pageviews)
      return res.status(200).json({ total })
    }

    // Get batch views
    if (type === 'batch' && slugs) {
      const slugArray = slugs.split(',')
      const result = {}
      slugArray.forEach(s => {
        result[s] = pageviews[s] || 0
      })
      return res.status(200).json(result)
    }

    // Get single page view count
    if (slug) {
      const count = pageviews[slug] || 0
      return res.status(200).json({ slug, count })
    }

    return res.status(400).json({ error: 'Missing required parameters' })
  } else if (req.method === 'POST') {
    if (!slug) {
      return res.status(400).json({ error: 'Missing slug parameter' })
    }

    // Increment view count
    pageviews[slug] = (pageviews[slug] || 0) + 1

    // Update total
    pageviews.total = calculateTotal(pageviews)

    writePageviews(pageviews)
    return res.status(200).json({ slug, count: pageviews[slug] })
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
