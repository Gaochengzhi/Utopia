import { useEffect, useState } from 'react'

export default function PageView({ slug }) {
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return

    // Increment view count
    fetch(`/api/pageviews?slug=${encodeURIComponent(slug)}`, {
      method: 'POST',
    })
      .then(res => res.json())
      .then(data => {
        setCount(data.count)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error tracking pageview:', err)
        setLoading(false)
      })
  }, [slug])

  if (loading || count === null) {
    return null
  }

  return (
    <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm py-4">
      <span>Viewer: {count}</span>
    </div>
  )
}
