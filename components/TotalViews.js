import { useEffect, useState } from 'react'

export default function TotalViews() {
  const [total, setTotal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pageviews?type=total')
      .then(res => res.json())
      .then(data => {
        setTotal(data.total)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching total views:', err)
        setLoading(false)
      })
  }, [])

  if (loading || total === null) {
    return null
  }

  // Format number with commas
  const formattedTotal = total.toLocaleString()

  return (
    <div className="jobs text-gray-600 dark:text-gray-400">
      👁 Total Views: {formattedTotal}
    </div>
  )
}
