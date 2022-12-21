import { cataList } from "/components/photo/cataList"
import { readAllFile } from "/components/util/readAllfile"
import { Footer } from "/components/footer"
import { Pnav } from "/components/photo/Pnav"
import { Walls } from "/components/photo/Wall"
import { useEffect } from "react"
import { firstUpperCase } from "/components/util/treeSort"
import Cookies from "js-cookie"
export default function Wall({ paths, title }) {
  // newpaths = paths.pop()
  useEffect(() => {
    Cookies.set("refreshed_pp", "true", { expires: 1 })
    if (!Cookies.get("refreshed_pp")) {
      localStorage.setItem("refreshed_pp", "true")
      setTimeout(() => window.location.reload(), 3000)
    }
  }, [])
  return (
    <div className="bg-black">
      <Pnav select={title} />
      <div className="max-w-5xl md:mx-auto">
        <img
          src={paths[0].path}
          alt=""
          className="md:max-h-[60vh] max-h-[40vh]  w-[97%] object-cover mx-auto"
        />
        <div className=" text-white p-3 text-6xl">{firstUpperCase(title)}</div>
        <div></div>
        <Walls path={paths} />
        <div className="text-lg font-thin font-serif flex justify-center h-56 m-5 text-white border-b-2 border-gray-400 border-dashed ">
          End
        </div>
        <Footer />
        <div className="text-lg font-thin font-serif flex flex-col h-56"></div>
      </div>
    </div>
  )
}

export async function getStaticPaths() {
  return {
    paths: cataList.map((i) => ({
      params: {
        slug: i.title.toLowerCase(),
      },
    })),
    fallback: false, // can also be true or 'blocking'
  }
}

export async function getStaticProps({ params: { slug } }) {
  let infoArray = await readAllFile(
    "public/photography" + "/content/" + firstUpperCase(slug),
    (i) => i.replace("public", "")
  )
  const infoArrays = infoArray.SortedInfoArray
  return {
    props: {
      paths: infoArrays,
      title: slug,
    }, // will be passed to the page component as props
    revalidate: 1,
  }
}
