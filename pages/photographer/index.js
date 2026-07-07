import Head from 'next/head'
import { getCfEnv } from '/lib/cfContext'
import { CDN_BASE } from '/lib/cdnUrl'
import { getDarkroomHomeData } from '/lib/data/darkroom'
import DarkroomHome from '/components/photo/darkroom/DarkroomHome'

export default function Index({ data }) {
    return (
        <>
            <Head>
                <title>Taitan_Pascal — 暗房 · Utopia Photography</title>
                <meta
                    name="description"
                    content="高成志（Taitan_Pascal）摄影档案：人像、情绪、恋人、婚礼、香港与城市街头。常驻南京，接受预约。"
                />
                <meta name="theme-color" content="#0e0d0b" />
                {CDN_BASE && (
                    <>
                        <link rel="preconnect" href={CDN_BASE} />
                        <link rel="dns-prefetch" href={CDN_BASE} />
                    </>
                )}
            </Head>
            <DarkroomHome data={data} />
        </>
    )
}

export const getStaticProps = async () => {
    let db = null
    try {
        const env = await getCfEnv()
        db = env?.DB || null
    } catch (e) {
        console.error('photographer getStaticProps: no Cloudflare env:', e.message)
    }

    // Falls back to the bundled photo manifest when D1 is unavailable
    // (local dev, build machines) — the page always has real content.
    const data = await getDarkroomHomeData(db)

    return {
        props: { data },
        // ISR: photos change rarely; 5 minutes picks up new uploads without a redeploy.
        revalidate: 300,
    }
}
