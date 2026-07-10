import Head from 'next/head'
import RecentArchive from '/components/photo/darkroom/RecentArchive'
import { getCfEnv } from '/lib/cfContext'
import { getRecentPhotosPage } from '/lib/data/recentPhotos'

export default function RecentArchivePage({ initialPage }) {
  return (
    <>
      <Head>
        <title>Recent Prints — 暗房 · Utopia Photography</title>
        <meta name="description" content="Taitan Pascal 摄影档案：按最新上传时间连续浏览。" />
        <meta name="theme-color" content="#0e0d0b" />
        <link rel="preconnect" href="https://cdn.gaochengzhi.com" />
      </Head>
      <RecentArchive initialPage={initialPage} />
    </>
  )
}

export async function getStaticProps() {
  let db = null
  try {
    const env = await getCfEnv()
    db = env?.DB || null
  } catch (error) {
    console.error('recent archive getStaticProps: no Cloudflare env:', error.message)
  }

  const initialPage = await getRecentPhotosPage(db, { limit: 18 })
  return { props: { initialPage }, revalidate: 60 }
}
