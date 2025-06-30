import { cataList } from "./cataList"
import { ParallaxBanner } from "react-scroll-parallax"
import { ParallaxProvider } from "react-scroll-parallax"
import Link from "next/link"
export function CataContainer({ }) {
    return (
        <div className="flex flex-col justify-center items-center w-full">
            <ParallaxProvider>
                {cataList.map((i) => (
                    <Link key={i.index} href={"/photographer/" + i.title.toLowerCase()}>
                        <div
                            className={`text-gray-300 w-full  lg:h-[29rem] sm:h-[13rem] md:h-[19rem] h-[12rem]   lg:text-8xl text-5xl flex justify-center`}
                        >
                            {/* add a button on the top name is upload , callback is upload(path) */}

                            <ParallaxBanner
                                layers={[
                                    { image: `/photography/cata/${i.index}.jpg`, speed: -20 },
                                ]}
                                className="aspect-[2/1]"
                            >
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-white font-extralight">{i.title}</div>
                                </div>
                            </ParallaxBanner>
                        </div>
                    </Link>
                ))}
            </ParallaxProvider>
        </div>
    )
}
