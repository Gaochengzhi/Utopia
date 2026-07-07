import Head from "next/head"
import DarkroomGallery from "/components/photo/darkroom/DarkroomGallery"
import { getCfEnv } from "/lib/cfContext"
import { normalizeCategoryName } from "/lib/photoUtils"
import { getDarkroomGalleryData } from "/lib/data/darkroom"
import manifest from "/lib/data/photoManifest.json"

export default function GalleryPage({ data }) {
    return (
        <>
            <Head>
                <title>{`${data.name} ${data.zh} — 暗房 · Utopia Photography`}</title>
                <meta
                    name="description"
                    content={`${data.name} ${data.zh} — ${data.count} photographs · TAITAN_PASCAL · Utopia`}
                />
                <link rel="preconnect" href="https://cdn.gaochengzhi.com" />
            </Head>
            <DarkroomGallery data={data} />
        </>
    )
}

export async function getStaticPaths() {
    // Manifest knows every category even when D1 is unreachable at build time;
    // merge with live D1 so brand-new categories are still prerendered.
    const slugs = new Set(
        manifest.photos
            .map(p => normalizeCategoryName(p.category))
            .filter(Boolean)
            .map(c => c.toLowerCase())
    )

    try {
        const env = await getCfEnv()
        const db = env?.DB
        if (db) {
            const { results } = await db.prepare(`
                SELECT DISTINCT category
                FROM photos
                WHERE category IS NOT NULL AND TRIM(category) != ''
                ORDER BY category
            `).all()
            for (const row of results || []) {
                const c = normalizeCategoryName(row.category)
                if (c) slugs.add(c.toLowerCase())
            }
        }
    } catch (e) {
        console.error('getStaticPaths failed:', e.message)
    }

    return {
        paths: [...slugs].map(slug => ({ params: { slug } })),
        fallback: 'blocking',
    }
}

export async function getStaticProps({ params: { slug } }) {
    try {
        const env = await getCfEnv()
        const db = env?.DB
        const data = await getDarkroomGalleryData(db, slug)
        if (!data) return { notFound: true, revalidate: 300 }
        return { props: { data }, revalidate: 300 }
    } catch (e) {
        console.error('getStaticProps failed:', e.message)
        return { notFound: true, revalidate: 60 }
    }
}
